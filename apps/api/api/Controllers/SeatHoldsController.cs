using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // CanAccess previously granted ANY Staff account unrestricted access to EVERY operator's
    // seat holds — including Release, a write action that frees another operator's active
    // hold out from under a customer mid-checkout. SeatHold carries no BusOperatorId directly;
    // it's resolved via Trip.BusOperatorId, same idea as RefundsController resolving through
    // Booking. "Staff" also silently excluded the "Operator" login role.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SeatHoldsController(
        AppDbContext db,
        SeatHoldService seatHoldService,
        IConfiguration configuration,
        ExternalBookingSyncService externalSync) : ControllerBase
    {
        // The "3 to 5 minute timer" from the concept (§5) — server-side, so a client can never
        // request its own (much longer) hold window. Chunk 3 task 3: now configurable via
        // SeatHold:Minutes (appsettings.json / SeatHold__Minutes env var) instead of a fixed
        // constant, but still clamped to the concept's allowed 3–5 minute range here — a bad or
        // malicious config value can't hand out an hour-long hold.
        private int HoldDurationMinutes => Math.Clamp(configuration.GetValue("SeatHold:Minutes", 5), 3, 5);

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.SeatHolds.AsQueryable();

            // Admin/platform-Staff see every hold; an operator's own Staff/Operator account is
            // scoped to holds on that operator's own trips; everyone else sees only their own.
            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
            {
                var callerOperatorId = await User.GetBusOperatorIdAsync(db);
                if (callerOperatorId != null)
                {
                    query = query.Where(h => db.Trips.Any(t => t.Id == h.TripId && t.BusOperatorId == callerOperatorId));
                }
                // else: platform Admin/Staff — no filter, see everything.
            }
            else
            {
                var userId = GetCurrentUserId();
                query = query.Where(h => h.HeldByUserId == userId);
            }

            var items = await query.OrderByDescending(h => h.HoldStartedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.SeatHolds.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        // The checkout page polls this by token (it doesn't have a database id yet at that
        // point) to drive the on-screen countdown.
        [HttpGet("by-token/{holdToken}")]
        public async Task<IActionResult> GetByToken(string holdToken)
        {
            var item = await db.SeatHolds.FirstOrDefaultAsync(x => x.HoldToken == holdToken);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        // Step 1 of checkout. This used to just insert a SeatHold row and never touch
        // TripSeat at all — meaning two customers could both "hold" and both convert the same
        // seat. It now delegates to SeatHoldService, which does the actual race-safe
        // "UPDATE TripSeat SET Status = Held WHERE Status = Available" locking.
        [HttpPost]
        public async Task<IActionResult> Create(SeatHoldCreateDto dto)
        {
            if (dto.TripSeatIds == null || dto.TripSeatIds.Count == 0)
            {
                return BadRequest(new { message = "Select at least one seat." });
            }

            // Chunk 8 task 5: for a trip whose operator's own ERP is the source of truth
            // (ExternalApiManaged), our own TripSeat.Status can be stale — the operator may have
            // sold this exact seat through a channel we don't see. Ask their GetSeatAvailability
            // endpoint before ever taking the hold. This fails OPEN (see
            // ExternalBookingSyncService.CheckSeatAvailabilityAsync's own comment) — an
            // unreachable ERP falls back to our own seat map rather than blocking every sale on
            // that trip, so this is an extra check on top of SeatHoldService's own race-safe
            // locking (and Chunk 3's TripNotBookableException checks below), never a replacement
            // for either.
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == dto.TripId);
            if (trip == null)
            {
                return BadRequest(new { message = "Trip not found." });
            }

            if (trip.InventoryMode == OperatorInventoryMode.ExternalApiManaged)
            {
                var requestedSeatNumbers = await db.TripSeats
                    .Where(ts => dto.TripSeatIds.Contains(ts.Id))
                    .Select(ts => ts.SeatNumber)
                    .ToListAsync();

                var availability = await externalSync.CheckSeatAvailabilityAsync(trip);
                if (availability.Success)
                {
                    var conflictingSeats = requestedSeatNumbers
                        .Where(availability.SoldSeatNumbers.Contains)
                        .ToList();

                    if (conflictingSeats.Count > 0)
                    {
                        return Conflict(new
                        {
                            message = $"The operator's system reports seat(s) {string.Join(", ", conflictingSeats)} " +
                                "already sold. Please choose different seats.",
                            seatNumbers = conflictingSeats,
                        });
                    }
                }
            }

            try
            {
                var hold = await seatHoldService.HoldSeatsAsync(
                    dto.TripId,
                    dto.TripSeatIds,
                    HoldDurationMinutes,
                    GetCurrentUserId(),
                    HttpContext.Connection.RemoteIpAddress?.ToString(),
                    Request.Headers.UserAgent.ToString());

                return CreatedAtAction(nameof(GetById), new { id = hold.Id }, ToResponseDto(hold));
            }
            catch (SeatsUnavailableException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            // Chunk 3 task 1: the trip's state changed out from under a stale seat map (someone
            // cancelled it, or it departed) between the customer loading the page and clicking
            // Hold. Same 409-and-refresh treatment as SeatsUnavailableException above, rather
            // than a generic 400, so the Angular seat map handles both the same way.
            catch (TripNotBookableException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Customer deselects seats or abandons checkout before the timer runs out — free the
        // seats immediately instead of making the next customer wait out the full window.
        // Replaces the old generic PUT, which let a client set Status to anything directly
        // (including straight to ConvertedToBooking, with no payment involved at all).
        [HttpPost("{id}/release")]
        public async Task<IActionResult> Release(Guid id)
        {
            var item = await db.SeatHolds.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();

            await seatHoldService.ReleaseHoldAsync(item.HoldToken);
            return NoContent();
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        // Admin/platform-Staff: any hold. Staff/Operator scoped to one operator: only holds on
        // that operator's own trips (resolved via Trip.BusOperatorId — SeatHold carries no
        // BusOperatorId directly). Everyone else: only a hold they themselves created.
        private async Task<bool> CanAccessAsync(SeatHold item)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
            {
                var operatorId = await db.Trips
                    .Where(t => t.Id == item.TripId)
                    .Select(t => (Guid?)t.BusOperatorId)
                    .FirstOrDefaultAsync();
                return operatorId != null && await User.CanManageOperatorAsync(db, operatorId.Value);
            }

            var userId = GetCurrentUserId();
            return userId != null && item.HeldByUserId == userId;
        }

        private static SeatHoldResponseDto ToResponseDto(SeatHold x)
        {
            var secondsRemaining = (int)Math.Max(0, (x.HoldExpiresAtUtc - DateTime.UtcNow).TotalSeconds);

            return new SeatHoldResponseDto
            {
                Id = x.Id,
                TripId = x.TripId,
                HeldByUserId = x.HeldByUserId,
                HoldToken = x.HoldToken,
                HoldStartedAtUtc = x.HoldStartedAtUtc,
                HoldExpiresAtUtc = x.HoldExpiresAtUtc,
                Status = x.Status,
                SecondsRemaining = x.Status == Models.Enums.SeatHoldStatus.Active ? secondsRemaining : 0,
                ClientIpAddress = x.ClientIpAddress,
                UserAgent = x.UserAgent,
                CreatedAtUtc = x.CreatedAtUtc,
                UpdatedAtUtc = x.UpdatedAtUtc,
                RowVersion = x.RowVersion,
            };
        }
    }
}
