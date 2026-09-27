using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketPortal.Api.Models.Bookings;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // Master = Booking, Details = BookingPassenger.
    // BusOperatorId is deliberately NOT on the create DTO — it's resolved server-side from the
    // Trip, exactly like a real booking flow would (the caller shouldn't get to pick the operator).
    //
    // Second-pass audit notes (this controller had previously only had one targeted fix —
    // CustomerProfileId being resolved server-side — not a full review):
    //
    //   1. GetAll/GetById had NO ownership scoping at all: any logged-in customer could read
    //      every other customer's bookings, including contact info and passenger national ID
    //      numbers. Fixed below with the same ownership + operator-scoping pattern used
    //      throughout this project (see TicketsController for the ownership half,
    //      BusesController for the operator half).
    //   2. Create trusted client-supplied SubTotal/DiscountAmount/TaxAmount/ServiceChargeAmount/
    //      GrandTotal/ExpiresAtUtc directly. PaymentConfirmationService.InitiatePaymentAsync
    //      charges exactly booking.GrandTotal, so this meant a client could book real seats and
    //      pay any amount it liked. Fixed by requiring the checkout SeatHold's token and pricing
    //      the booking from SeatHoldItem.FareAtHold — the same frozen price the hold itself is
    //      built on — instead of trusting anything in the request body. See BookingCreateDto.
    //   3. Update had the exact same problem, PLUS let a client set Status directly — a customer
    //      could PUT their own PendingPayment booking straight to Confirmed. Fixed by dropping
    //      Status and all price fields from BookingUpdateDto entirely; this endpoint now only
    //      touches trip-detail fields, and only while the booking hasn't been paid yet.
    //   4. Delete and UploadPassengerIdPhoto had no ownership check either — fixed the same way.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class BookingsController(AppDbContext db, IWebHostEnvironment env, ICurrentActorService currentActor) : ControllerBase
    {
        // See BusesController.GetAll for why materializing (.ToListAsync()) has to happen
        // BEFORE mapping with ToResponseDto — EF Core can't translate that method into SQL.
        //
        // Admin sees every booking. Staff scoped to one operator (StaffProfile.BusOperatorId)
        // sees only that operator's bookings; platform Staff (BusOperatorId == null) sees
        // everything, same as Admin. Everyone else sees only bookings tied to their own
        // CustomerProfile.
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.Bookings.Include(b => b.Passengers).AsQueryable();

            if (User.IsInRole("Admin"))
            {
                // No restriction.
            }
            else if (User.IsInRole("Staff") || User.IsInRole("Operator"))
            {
                var operatorId = await GetCallerBusOperatorIdAsync();
                if (operatorId.HasValue)
                {
                    query = query.Where(b => b.BusOperatorId == operatorId.Value);
                }
                // null => platform staff, no restriction.
            }
            else
            {
                var userId = GetCurrentUserId();
                query = query.Where(b => b.CustomerProfile != null && b.CustomerProfile.UserId == userId);
            }

            var bookings = await query.ToListAsync();
            return Ok(bookings.Select(ToResponseDto));
        }



              [HttpGet("{id}")]
              public async Task<IActionResult> GetById(Guid id)
              {
                var booking = await db.Bookings
                    .Include(b => b.Passengers)
                    .Include(b => b.SeatHold)          // 👈 ADD THIS
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (booking == null) return NotFound();

                if (!await CanAccessBookingAsync(booking)) return Forbid();

                return Ok(ToResponseDto(booking));
              }



    [HttpPost]
        public async Task<IActionResult> Create(BookingCreateDto dto)
        {
            // =========================================================
            // 1. Validate Trip + terminals exist
            // =========================================================
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == dto.TripId);
            if (trip == null)
            {
                return BadRequest(new { message = $"Trip {dto.TripId} does not exist." });
            }

            var boardingExists = await db.Terminals.AnyAsync(t => t.Id == dto.BoardingTerminalId);
            if (!boardingExists)
            {
                return BadRequest(new { message = "BoardingTerminalId does not exist.", boardingTerminalId = dto.BoardingTerminalId });
            }

            var droppingExists = await db.Terminals.AnyAsync(t => t.Id == dto.DroppingTerminalId);
            if (!droppingExists)
            {
                return BadRequest(new { message = "DroppingTerminalId does not exist.", droppingTerminalId = dto.DroppingTerminalId });
            }

            // =========================================================
            // 2. Load the SeatHold this booking is being created from. This — not anything the
            // client could declare directly — is the single source of truth for price and
            // seats: SubTotal is summed from each seat's FareAtHold, frozen the moment the seat
            // was held (see SeatHoldService.HoldSeatsAsync), never taken from the request body.
            // =========================================================
            var hold = await db.SeatHolds
                .Include(h => h.Items)
                .FirstOrDefaultAsync(h => h.HoldToken == dto.HoldToken);

            if (hold == null)
            {
                return BadRequest(new { message = "This hold token is invalid." });
            }

            if (hold.TripId != dto.TripId)
            {
                return BadRequest(new { message = "This hold does not belong to the specified Trip." });
            }

            if (!await CanAccessHoldAsync(hold))
            {
                return Forbid();
            }

            if (hold.Status != SeatHoldStatus.Active || hold.HoldExpiresAtUtc <= DateTime.UtcNow)
            {
                return Conflict(new { message = "This seat hold has expired or is no longer active. Please reselect seats and try again." });
            }

            if (hold.Items.Count == 0)
            {
                return Conflict(new { message = "This seat hold has no seats attached." });
            }

            var alreadyBooked = await db.Bookings.AnyAsync(b => b.SeatHoldId == hold.Id);
            if (alreadyBooked)
            {
                return Conflict(new { message = "This seat hold has already been converted into a booking." });
            }

            // =========================================================
            // 3. One passenger per held seat — required so PaymentConfirmationService can later
            // pair each passenger to a booked seat in a fixed order (see its own comment on
            // that pairing — BookingPassenger and TripSeat have no direct FK to each other).
            // =========================================================
            if (dto.Passengers.Count != hold.Items.Count)
            {
                return BadRequest(new
                {
                    message = $"This hold covers {hold.Items.Count} seat(s), but {dto.Passengers.Count} " +
                        "passenger(s) were submitted. Exactly one passenger is required per held seat."
                });
            }

            var subTotal = hold.Items.Sum(i => i.FareAtHold);
            var taxAmount = await ResolveTaxAsync(subTotal);

            // =========================================================
            // 4. Counter sale (concept doc §3.1/§6.2): only reachable by Staff/Admin for the
            // counter's own operator — a Customer can never set SalesCounterId on their own
            // booking and self-declare a cash sale that skips the online payment flow. Counter
            // sales also only make sense for a PlatformManaged operator: an
            // ExternalApiManaged/Hybrid operator's own ERP is the source of truth for their
            // counter sales (see BusOperator.InventoryMode) — we have no visibility into those
            // at all, so we must not record one.
            //
            // RBAC Amendment v3 task 4: the old check only proved "this Staff account belongs
            // to the trip's operator" — ANY of that operator's staff, including a CounterStaff
            // clerk assigned to a completely different physical counter, could complete a sale
            // against dto.SalesCounterId. Counter.Sell (a job-role capability — CounterStaff,
            // Operator Manager/BusOwner, and platform staff/Admin all have it; Supervisor/
            // Finance do not) is checked first, and THEN, only for a CounterStaff actor
            // specifically, the sale is rejected unless they hold an active
            // StaffSalesCounterAssignment for this exact counter. An Operator Manager/BusOwner
            // of the same operator is deliberately NOT counter-restricted — they may sell from
            // any of their own operator's counters (see CurrentActor.CanUseCounter).
            // =========================================================
            var isCounterSale = dto.SalesCounterId.HasValue;
            Models.People.SalesCounter? salesCounter = null;

            if (isCounterSale)
            {
                var actor = await currentActor.ResolveAsync(User);
                if (!actor.HasPermission(Permissions.CounterSell))
                {
                    return Forbid();
                }

                if (!actor.CanManageOperator(trip.BusOperatorId))
                {
                    return Forbid();
                }

                salesCounter = await db.SalesCounters.FirstOrDefaultAsync(sc => sc.Id == dto.SalesCounterId!.Value);
                if (salesCounter == null || !salesCounter.IsActive)
                {
                    return BadRequest(new { message = "SalesCounterId does not exist or is inactive." });
                }

                if (salesCounter.BusOperatorId != trip.BusOperatorId)
                {
                    return BadRequest(new { message = "This SalesCounter belongs to a different operator than the Trip." });
                }

                if (!actor.CanUseCounter(salesCounter.Id, salesCounter.BusOperatorId))
                {
                    return Forbid();
                }

                if (trip.InventoryMode != OperatorInventoryMode.PlatformManaged)
                {
                    return BadRequest(new
                    {
                        message = "This operator's inventory is not platform-managed, so counter sales through " +
                                  "our ERP don't apply — their own system is the source of truth for cash-counter sales."
                    });
                }
            }

            var booking = new Booking
            {
                // A counter sale is a walk-in, guest checkout — there's no reason to attribute
                // it to the staff member's own login/CustomerProfile, and a walk-in customer
                // may not even have a platform account.
                CustomerProfileId = isCounterSale ? null : await ResolveOrCreateCustomerProfileIdAsync(),
                BusOperatorId = trip.BusOperatorId,
                TripId = dto.TripId,
                SeatHoldId = hold.Id,
                SalesCounterId = salesCounter?.Id,
                BoardingTerminalId = dto.BoardingTerminalId,
                DroppingTerminalId = dto.DroppingTerminalId,
                Pnr = GeneratePnr(),
                ContactName = dto.ContactName,
                ContactPhone = dto.ContactPhone,
                ContactEmail = dto.ContactEmail,

                Source = isCounterSale ? BookingSource.Counter : BookingSource.Web,
                SaleChannel = isCounterSale ? SaleChannel.Counter : SaleChannel.Online,
                MoneyCollectedBy = isCounterSale ? MoneyCollectedBy.Operator : MoneyCollectedBy.Platform,

                // Computed, never trusted from the client — see the class comment on BookingCreateDto.
                SubTotal = subTotal,
                DiscountAmount = 0m, // Coupon application is its own flow (Piece 2/CouponRedemptionService) — not wired in here.
                TaxAmount = taxAmount,
                ServiceChargeAmount = 0m,
                Currency = trip.Currency,

                RequiresExternalConfirmation = trip.InventoryMode != OperatorInventoryMode.PlatformManaged,
                ExpiresAtUtc = hold.HoldExpiresAtUtc,

                Passengers = dto.Passengers.Select(p => new BookingPassenger
                {
                    FullName = p.FullName,
                    Phone = p.Phone,
                    Email = p.Email,
                    Gender = p.Gender,
                    PassengerType = p.PassengerType,
                    Age = p.Age,
                    NationalIdNumber = p.NationalIdNumber
                }).ToList()
            };

            // Same shared formula CouponRedemptionService.RedeemAsync uses after it sets
            // DiscountAmount — one place derives GrandTotal so the two pricing paths (creation
            // vs. later coupon redemption) can never drift apart.
            booking.RecomputeTotals();

            db.Bookings.Add(booking);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return Conflict(new
                {
                    message = "Could not save this Booking — check BoardingTerminalId/DroppingTerminalId are valid.",
                    detail = ex.InnerException?.Message
                });
            }

            return CreatedAtAction(nameof(GetById), new { id = booking.Id }, ToResponseDto(booking));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, BookingUpdateDto dto)
        {
            var booking = await db.Bookings
                .Include(b => b.Passengers)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (booking == null)
            {
                return NotFound(new
                {
                    message = "Booking not found."
                });
            }

            // ----------------------------------------
            // Authorization — ownership/operator scoping
            // ----------------------------------------
            if (!await CanAccessBookingAsync(booking))
            {
                return Forbid();
            }

            // ----------------------------------------
            // A booking that's already Confirmed/Completed/Cancelled/Expired is locked —
            // status and pricing only ever change through Booking.Confirm()/Cancel() (called
            // from PaymentConfirmationService / the future cancellation flow), and trip-detail
            // fields like contact info shouldn't move once a ticket has actually been issued.
            // ----------------------------------------
            if (booking.Status != BookingStatus.Draft && booking.Status != BookingStatus.PendingPayment)
            {
                return Conflict(new
                {
                    message = $"This Booking is {booking.Status} and can no longer be edited directly."
                });
            }

            // ----------------------------------------
            // RowVersion validation
            // ----------------------------------------
            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
            {
                return BadRequest(new
                {
                    message =
                        "RowVersion is required. " +
                        "GET the Booking first and send the latest RowVersion."
                });
            }

            // Tell EF which version the client originally loaded
            db.Entry(booking)
                .Property(b => b.RowVersion)
                .OriginalValue = dto.RowVersion;

            // ----------------------------------------
            // Validate terminals
            // ----------------------------------------
            var boardingExists = await db.Terminals.AnyAsync(t => t.Id == dto.BoardingTerminalId);
            if (!boardingExists)
            {
                return BadRequest(new { message = "BoardingTerminalId does not exist.", boardingTerminalId = dto.BoardingTerminalId });
            }

            var droppingExists = await db.Terminals.AnyAsync(t => t.Id == dto.DroppingTerminalId);
            if (!droppingExists)
            {
                return BadRequest(new { message = "DroppingTerminalId does not exist.", droppingTerminalId = dto.DroppingTerminalId });
            }

            // ----------------------------------------
            // Validate passengers — details can change, but not how many: that count is fixed
            // by the number of seats in the hold this booking was created from.
            // ----------------------------------------
            if (dto.Passengers == null || dto.Passengers.Count == 0)
            {
                return BadRequest(new
                {
                    message = "At least one passenger is required."
                });
            }

            if (dto.Passengers.Count != booking.Passengers.Count)
            {
                return BadRequest(new
                {
                    message = $"This Booking has {booking.Passengers.Count} passenger(s) tied to its held seats — " +
                        $"cannot change that to {dto.Passengers.Count}."
                });
            }

            // ----------------------------------------
            // Update Booking — trip-detail fields only. Status and every price field are
            // deliberately left untouched: BookingUpdateDto no longer carries them at all.
            // ----------------------------------------
            booking.BoardingTerminalId = dto.BoardingTerminalId;
            booking.DroppingTerminalId = dto.DroppingTerminalId;

            booking.ContactName = dto.ContactName;
            booking.ContactPhone = dto.ContactPhone;
            booking.ContactEmail = dto.ContactEmail;

            // ----------------------------------------
            // Replace passengers
            // ----------------------------------------
            db.BookingPassengers.RemoveRange(booking.Passengers);

            var newPassengers = dto.Passengers
                .Select(p => new BookingPassenger
                {
                    BookingId = booking.Id,

                    FullName = p.FullName,
                    Phone = p.Phone,
                    Email = p.Email,
                    Gender = p.Gender,
                    PassengerType = p.PassengerType,
                    Age = p.Age,
                    NationalIdNumber = p.NationalIdNumber
                })
                .ToList();

            await db.BookingPassengers.AddRangeAsync(newPassengers);

            // ----------------------------------------
            // Save
            // ----------------------------------------
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new
                {
                    message =
                        "This Booking was changed by another request. " +
                        "GET the latest Booking and retry the update."
                });
            }
            catch (DbUpdateException ex)
            {
                return Conflict(new
                {
                    message =
                        "Could not save this Booking update — " +
                        "check boardingTerminalId/droppingTerminalId are valid.",

                    detail = ex.InnerException?.Message
                });
            }

            // ----------------------------------------
            // Reload fresh data
            // ----------------------------------------
            var updatedBooking = await db.Bookings
                .Include(b => b.Passengers)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (updatedBooking == null)
            {
                return NotFound(new
                {
                    message = "Booking was updated but could not be loaded again."
                });
            }

            return Ok(ToResponseDto(updatedBooking));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var booking = await db.Bookings.Include(b => b.Passengers).FirstOrDefaultAsync(b => b.Id == id);
            if (booking == null) return NotFound();

            if (!await CanAccessBookingAsync(booking)) return Forbid();

            // BookingPassenger is a pure detail of this Booking — Restrict never cascades it.
            db.BookingPassengers.RemoveRange(booking.Passengers);
            db.Bookings.Remove(booking);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict("This Booking was already modified or deleted by another request.");
            }
            catch (DbUpdateException)
            {
                // e.g. a Payment or Ticket row still references this Booking under Restrict behavior.
                return Conflict("Cannot delete this Booking — related records (Payments, Tickets, etc.) still reference it.");
            }

            return NoContent();
        }

        // Image lives on the DETAIL row here, not the master — one passenger's ID photo,
        // not the whole booking. Route nests under both ids to make that explicit.
        [HttpPost("{bookingId}/passengers/{passengerId}/images")]
        public async Task<IActionResult> UploadPassengerIdPhoto(Guid bookingId, Guid passengerId, IFormFile file)
        {
            var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking == null) return NotFound();

            if (!await CanAccessBookingAsync(booking)) return Forbid();

            var passenger = await db.BookingPassengers
                .FirstOrDefaultAsync(p => p.Id == passengerId && p.BookingId == bookingId);
            if (passenger == null) return NotFound();

            var validationError = TicketPortal.Api.Extensions.FileUploadValidation.Validate(file);
            if (validationError != null) return validationError;

            var fileName = $"passenger_{passengerId}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var path = Path.Combine(env.WebRootPath!, "images", fileName);
            await using (var stream = System.IO.File.Create(path))
            {
                await file.CopyToAsync(stream);
            }

            passenger.NationalIdPhotoUrl = $"/images/{fileName}";
            await db.SaveChangesAsync();
            return Ok(new { imageUrl = passenger.NationalIdPhotoUrl });
        }

        private static string GeneratePnr() =>
            "PNR" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

        // A booking is always made by a customer, so this is the right place to lazily
        // provision a CustomerProfile — nothing does it at registration time, since
        // AccountController.Register is shared by customers and staff alike (see
        // ApplicationUser's comment: only one of CustomerProfile/StaffProfile gets filled in).
        // Without this, Booking.CustomerProfileId stayed null forever, so
        // PaymentsController/TicketsController could never scope "my own" records to a
        // real customer.
        private async Task<Guid?> ResolveOrCreateCustomerProfileIdAsync()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(claim, out var userId)) return null;

            var existingId = await db.CustomerProfiles
                .Where(cp => cp.UserId == userId)
                .Select(cp => (Guid?)cp.Id)
                .FirstOrDefaultAsync();

            if (existingId != null) return existingId;

            var profile = new Models.People.CustomerProfile { UserId = userId };
            db.CustomerProfiles.Add(profile);
            await db.SaveChangesAsync();
            return profile.Id;
        }

        // Modeled on PaymentConfirmationService.ResolveCommissionAsync's shape (find the
        // applicable configuration, compute an amount off a base figure) — but adapted to what
        // TaxRule actually stores. Unlike CommissionRule, TaxRule carries no BusOperatorId /
        // BusRouteId / EffectiveFrom-EffectiveTo window (see Models/Payments/TaxRule.cs) — it's
        // a flat, platform-wide reference table with just Name/Percentage/IsActive. So there's
        // no "route-specific beats general" to resolve yet: every currently-active TaxRule is
        // taken to apply to every booking, and their percentages stack (e.g. a VAT rule and a
        // separate travel-tax rule can both be active at once). If tax ever needs to vary by
        // operator or route, TaxRule needs those columns first — this only resolves what the
        // schema supports today. No matching rule (table empty / nothing active) intentionally
        // returns 0m, the same effective behavior as before this was wired in.
        private async Task<decimal> ResolveTaxAsync(decimal subTotal)
        {
            var activePercentages = await db.TaxRules
                .Where(t => t.IsActive)
                .Select(t => t.Percentage)
                .ToListAsync();

            if (activePercentages.Count == 0)
            {
                return 0m;
            }

            var combinedPercentage = activePercentages.Sum();
            return Math.Round(subTotal * (combinedPercentage / 100m), 2);
        }

        // =========================================================
        // Auth helpers — duplicated per-controller (see the same note in TripsController)
        // until Piece 1 introduces a shared ClaimsPrincipalExtensions.GetBusOperatorId helper.
        // =========================================================

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private async Task<Guid?> GetCallerBusOperatorIdAsync()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return null;

            return await db.StaffProfiles
                .Where(sp => sp.UserId == userId.Value)
                .Select(sp => sp.BusOperatorId)
                .FirstOrDefaultAsync();
        }

        // Admin: any booking. Staff scoped to one operator: only that operator's bookings
        // (BusOperatorId, resolved server-side from the Trip at Create time — see above).
        // Platform Staff (StaffProfile.BusOperatorId == null): any booking, same as Admin.
        // Everyone else: only a booking tied to their own CustomerProfile.
        private async Task<bool> CanAccessBookingAsync(Booking booking)
        {
            if (User.IsInRole("Admin")) return true;

            if (User.IsInRole("Staff") || User.IsInRole("Operator"))
            {
                var operatorId = await GetCallerBusOperatorIdAsync();
                return operatorId == null || operatorId == booking.BusOperatorId;
            }

            var userId = GetCurrentUserId();
            if (userId == null || booking.CustomerProfileId == null) return false;

            return await db.CustomerProfiles
                .AnyAsync(cp => cp.Id == booking.CustomerProfileId && cp.UserId == userId);
        }

        // Same ownership rule SeatHoldsController itself uses for a SeatHold — kept identical
        // rather than reinvented, since a hold not owned by the caller must be exactly as
        // inaccessible for booking creation as it is for reading via SeatHoldsController. Used
        // to grant ANY Admin/Staff account access to ANY operator's active hold — meaning
        // Staff for operator A could complete a booking against operator B's held seats. Now
        // resolves the hold's Trip.BusOperatorId and scopes through CanManageOperatorAsync,
        // same as everywhere else.
        private async Task<bool> CanAccessHoldAsync(SeatHold hold)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
            {
                var operatorId = await db.Trips
                    .Where(t => t.Id == hold.TripId)
                    .Select(t => (Guid?)t.BusOperatorId)
                    .FirstOrDefaultAsync();
                return operatorId != null && await User.CanManageOperatorAsync(db, operatorId.Value);
            }

            var userId = GetCurrentUserId();
            return userId != null && hold.HeldByUserId == userId;
        }

        private static BookingResponseDto ToResponseDto(Booking booking) => new()
        {
            Id = booking.Id,

            Pnr = booking.Pnr,

            TripId = booking.TripId,
            SeatHoldId = booking.SeatHoldId,

            BoardingTerminalId = booking.BoardingTerminalId,
            DroppingTerminalId = booking.DroppingTerminalId,

            ContactName = booking.ContactName,
            ContactPhone = booking.ContactPhone,
            ContactEmail = booking.ContactEmail,
            CreatedAtUtc = booking.CreatedAtUtc,
            UpdatedAtUtc = booking.UpdatedAtUtc,
            DeletedAtUtc = booking.DeletedAtUtc,

            Status = booking.Status,
            Source = booking.Source,
            SaleChannel = booking.SaleChannel,
            MoneyCollectedBy = booking.MoneyCollectedBy,
            SalesCounterId = booking.SalesCounterId,

            SubTotal = booking.SubTotal,
            DiscountAmount = booking.DiscountAmount,
            TaxAmount = booking.TaxAmount,
            ServiceChargeAmount = booking.ServiceChargeAmount,
            GrandTotal = booking.GrandTotal,
            RequiresExternalConfirmation = booking.RequiresExternalConfirmation,
            ExpiresAtUtc = booking.ExpiresAtUtc,

            Currency = booking.Currency,

            Passengers = booking.Passengers
         .Select(p => new BookingPassengerResponseDto
         {
             Id = p.Id,
             FullName = p.FullName,
             Phone = p.Phone,
             Email = p.Email,
             Gender = p.Gender,
             PassengerType = p.PassengerType,
             Age = p.Age,
             NationalIdNumber = p.NationalIdNumber,
             NationalIdPhotoUrl = p.NationalIdPhotoUrl
         })
         .ToList(),

            RowVersion = booking.RowVersion
        };
    }
}
