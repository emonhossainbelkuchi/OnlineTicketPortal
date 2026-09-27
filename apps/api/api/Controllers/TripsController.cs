using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Scheduling;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TicketPortal.Api.Models.Enums;

namespace TicketPortal.Api.Controllers
{
    // Master = Trip, Details = TripSeat (per-trip seat availability and pricing).
    // [Authorize] on the class means every action below requires a valid Bearer token except
    // where explicitly overridden with [AllowAnonymous].
    //
    // Read (GetAll/GetById/Search) is now open to EVERYONE, logged in or not — "anyone visiting
    // the site can search and see trips" (business plan section 4). Only the next step, actually
    // holding a seat (SeatHoldsController.Create), requires login — that's the real "book"
    // action. Browsing trips isn't operator-sensitive the way creating/editing one is. Writes
    // below still go through the same operator-scoping pattern as BusesController: previously
    // this controller had NO role/ownership check at all beyond [Authorize], meaning any
    // logged-in customer could create or edit a Trip for any operator's Bus.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TripsController(
        AppDbContext db,
        IWebHostEnvironment env,
        IConfiguration configuration,
        ICurrentActorService currentActor,
        TripCancellationService tripCancellationService) : ControllerBase
    {
        // Chunk 3 task 1 (shared with BookingBusesController and SeatHoldService): how long
        // before a still-Scheduled departure sales close. Defaults to zero minutes, i.e. the
        // exact cutoff this endpoint already used ("DepartureTimeUtc > now") before this config
        // key existed — see SeatHold:StopSalesMinutesBeforeDeparture in appsettings.json.
        private TimeSpan StopSalesWindow =>
            TimeSpan.FromMinutes(configuration.GetValue("SeatHold:StopSalesMinutesBeforeDeparture", 0));

    // See BusesController.GetAll for why materializing (.ToListAsync()) has to happen
    // BEFORE mapping with ToResponseDto — EF Core can't translate that method into SQL.


    // Chunk 10 security checklist item 3: this endpoint is [AllowAnonymous] and, until now,
    // returned every Trip ever created — with every TripSeat and Seat eagerly included — in
    // one response. On a live deployment that only grows, so this is an unauthenticated,
    // unbounded read of the entire schedule. This does NOT switch the endpoint to
    // [Authorize] (Search/GetById are deliberately public per the concept doc, and some
    // caller may already depend on this one being public too) — it only bounds how much any
    // single anonymous call can pull back. Real "browse upcoming trips" traffic should go
    // through Search (which already takes a route/date filter); this cap is a safety net for
    // GetAll specifically, not a replacement for pagination in the UI. Configurable via
    // Trips:MaxAnonymousListSize so a deployment can tune it without a code change; default
    // chosen generously above today's demo-data volume so this is a no-op change in that demo.
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
      var maxResults = Math.Clamp(configuration.GetValue("Trips:MaxAnonymousListSize", 500), 1, 2000);

      var trips = await db.Trips
          .OrderByDescending(t => t.DepartureTimeUtc)
          .Take(maxResults)
          .Include(t => t.TripSeats)
              .ThenInclude(ts => ts.Seat)
          .Include(t => t.Bus)
          .Include(t => t.BusOperator)
          .Include(t => t.BusRoute)
          .Include(t => t.DepartureTerminal)
          .Include(t => t.ArrivalTerminal)
          .ToListAsync();

      return Ok(trips.Select(ToResponseDto));
    }








    [AllowAnonymous]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
    {
      var trip = await db.Trips
          .Include(t => t.TripSeats)
              .ThenInclude(ts => ts.Seat)
          .Include(t => t.Bus)
          .Include(t => t.BusOperator)
          .Include(t => t.BusRoute)
          .Include(t => t.DepartureTerminal)
          .Include(t => t.ArrivalTerminal)
          .FirstOrDefaultAsync(t => t.Id == id);

         return trip == null ? NotFound() : Ok(ToResponseDto(trip));
     }





    // The core of the business plan: "client will search route like 'Dhaka to Chittagong'
    // and will see available buses and their seats" — this was the single most
    // customer-visible thing missing from the backend. Matches on the Trip's own actual
    // DepartureTerminal/ArrivalTerminal (NOT BusRoute's origin/destination — see the class
    // comment on Trip for why those can differ, e.g. one operator boarding from Gabtoli and
    // another from Kalyanpur, even though both are "Dhaka").




    [AllowAnonymous]
        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] Guid fromTerminalId,
            [FromQuery] Guid toTerminalId,
            [FromQuery] DateOnly date,
            [FromQuery] int? minAvailableSeats)
        {
            // =========================================================
            // 1. Basic validation
            // =========================================================

            if (fromTerminalId == Guid.Empty || toTerminalId == Guid.Empty)
            {
                return BadRequest(new { message = "fromTerminalId and toTerminalId are required." });
            }

            if (fromTerminalId == toTerminalId)
            {
                return BadRequest(new { message = "fromTerminalId and toTerminalId cannot be the same." });
            }

            if (minAvailableSeats.HasValue && minAvailableSeats.Value < 0)
            {
                return BadRequest(new { message = "minAvailableSeats cannot be negative." });
            }

            var fromExists = await db.Terminals.AnyAsync(t => t.Id == fromTerminalId);
            if (!fromExists)
            {
                return BadRequest(new { message = "fromTerminalId does not exist.", fromTerminalId });
            }

            var toExists = await db.Terminals.AnyAsync(t => t.Id == toTerminalId);
            if (!toExists)
            {
                return BadRequest(new { message = "toTerminalId does not exist.", toTerminalId });
            }

            // =========================================================
            // 2. Build the search window
            // =========================================================

            // Chunk 3 task 2: "date" is the calendar day the customer means in Dhaka, not UTC —
            // treating it as a UTC day put a 05:00 Dhaka departure under the previous calendar
            // day. DhakaClock converts it to the [start, end) range of UTC instants that Dhaka
            // day actually covers; DepartureTimeUtc itself stays UTC, matching the rest of the
            // schema (Trip has no per-terminal local timezone field).
            var (dayStartUtc, dayEndUtc) = DhakaClock.DayRangeUtc(date);
            var now = DateTime.UtcNow;
            var stopSalesWindow = StopSalesWindow;

            // =========================================================
            // 3. Query — DepartureTimeUtc > now (optionally minus a configurable stop-sales
            //    window) excludes already-departed/closed trips even for a same-day search;
            //    this is on top of (not instead of) the Status filter below, since a Trip can be
            //    marked Delayed and still be genuinely bookable. TripSellability.NonBookableStatuses
            //    is the same list BookingBusesController and SeatHoldService use — see Chunk 3
            //    gap register #1.
            // =========================================================

            var trips = await db.Trips
                .Include(t => t.TripSeats)
                .Include(t => t.BusOperator)
                .Include(t => t.Bus)
                .Include(t => t.DepartureTerminal)
                .Include(t => t.ArrivalTerminal)
                .Where(t => t.DepartureTerminalId == fromTerminalId
                    && t.ArrivalTerminalId == toTerminalId
                    && t.DepartureTimeUtc >= dayStartUtc
                    && t.DepartureTimeUtc < dayEndUtc
                    && t.DepartureTimeUtc > now.Add(stopSalesWindow)
                    && !TripSellability.NonBookableStatuses.Contains(t.Status))
                .OrderBy(t => t.DepartureTimeUtc)
                .ToListAsync();

            // =========================================================
            // 4. Map + apply the seat-count filter (needs the in-memory TripSeats, so it can't
            //    be pushed into the SQL query above — same materialize-then-map reasoning as
            //    every other GetAll in this project, see BusesController.GetAll).
            // =========================================================

            var results = trips
                .Select(ToSearchResultDto)
                .Where(r => !minAvailableSeats.HasValue || r.AvailableSeatCount >= minAvailableSeats.Value)
                .ToList();

            return Ok(results);
        }

        [HttpPost]
        public async Task<IActionResult> Create(TripCreateDto dto)
        {
            // =========================================================
            // 1. Basic validation
            // =========================================================

            if (dto == null)
            {
                return BadRequest(new
                {
                    message = "Request body is required."
                });
            }

            // =========================================================
            // 1a. Authorization — operator scoping. Platform Admin/Staff can create a Trip for
            // any operator; an operator's own staff only for their own BusOperatorId; anyone
            // else (customers included) is refused. Fails safe (Forbid for everyone) until
            // Piece 1 seeds real ApplicationRole rows — see the class comment above.
            // =========================================================

            if (!await User.CanManageOperatorAsync(db, dto.BusOperatorId))
            {
                return Forbid();
            }

            if (dto.TripSeats == null || dto.TripSeats.Count == 0)
            {
                return BadRequest(new
                {
                    message = "At least one TripSeat is required."
                });
            }

            // =========================================================
            // 2. Validate Bus + BusOperator
            // =========================================================

            var bus = await db.Buses
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == dto.BusId);

            if (bus == null)
            {
                return BadRequest(new
                {
                    message = "The specified Bus does not exist.",
                    busId = dto.BusId
                });
            }

            if (bus.BusOperatorId != dto.BusOperatorId)
            {
                return BadRequest(new
                {
                    message =
                        "The specified Bus does not belong to the specified BusOperator.",

                    busId = dto.BusId,
                    actualBusOperatorId = bus.BusOperatorId,
                    requestedBusOperatorId = dto.BusOperatorId
                });
            }

            // =========================================================
            // 3. Validate BusOperator exists
            // =========================================================

            var operatorExists = await db.BusOperators
                .AnyAsync(o => o.Id == dto.BusOperatorId);

            if (!operatorExists)
            {
                return BadRequest(new
                {
                    message = "BusOperatorId does not exist.",
                    busOperatorId = dto.BusOperatorId
                });
            }

            // =========================================================
            // 4. Validate BusRoute
            // =========================================================

            var busRouteExists = await db.BusRoutes
                .AnyAsync(r => r.Id == dto.BusRouteId);

            if (!busRouteExists)
            {
                return BadRequest(new
                {
                    message = "BusRouteId does not exist.",
                    busRouteId = dto.BusRouteId
                });
            }

            // =========================================================
            // 5. Validate Departure Terminal
            // =========================================================

            var departureTerminalExists = await db.Terminals
                .AnyAsync(t => t.Id == dto.DepartureTerminalId);

            if (!departureTerminalExists)
            {
                return BadRequest(new
                {
                    message = "DepartureTerminalId does not exist.",
                    departureTerminalId = dto.DepartureTerminalId
                });
            }

            // =========================================================
            // 6. Validate Arrival Terminal
            // =========================================================

            var arrivalTerminalExists = await db.Terminals
                .AnyAsync(t => t.Id == dto.ArrivalTerminalId);

            if (!arrivalTerminalExists)
            {
                return BadRequest(new
                {
                    message = "ArrivalTerminalId does not exist.",
                    arrivalTerminalId = dto.ArrivalTerminalId
                });
            }

            // =========================================================
            // 7. Departure and Arrival cannot be same
            // =========================================================

            if (dto.DepartureTerminalId == dto.ArrivalTerminalId)
            {
                return BadRequest(new
                {
                    message =
                        "DepartureTerminalId and ArrivalTerminalId cannot be the same."
                });
            }

            // =========================================================
            // 8. Validate Date / Time
            // =========================================================

            if (dto.ArrivalTimeUtc <= dto.DepartureTimeUtc)
            {
                return BadRequest(new
                {
                    message =
                        "ArrivalTimeUtc must be greater than DepartureTimeUtc."
                });
            }

            // =========================================================
            // 9. Get physical Seats of selected Bus
            // =========================================================

            var physicalSeats = await db.Seats
                .Where(s => s.BusId == dto.BusId)
                .ToDictionaryAsync(s => s.Id);

            if (physicalSeats.Count == 0)
            {
                return BadRequest(new
                {
                    message = "The selected Bus has no physical seats."
                });
            }

            // =========================================================
            // 10. Validate duplicate SeatId
            // =========================================================

            var duplicateSeatIds = dto.TripSeats
                .GroupBy(s => s.SeatId)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateSeatIds.Count > 0)
            {
                return BadRequest(new
                {
                    message =
                        "The same physical seat cannot be added to a Trip more than once.",

                    duplicateSeatIds
                });
            }

            // =========================================================
            // 11. Validate every TripSeat belongs to this Bus
            // =========================================================

            foreach (var seatDto in dto.TripSeats)
            {
                if (!physicalSeats.TryGetValue(
                        seatDto.SeatId,
                        out var physicalSeat))
                {
                    return BadRequest(new
                    {
                        message =
                            "One or more TripSeats do not belong to the selected Bus.",

                        invalidSeatId = seatDto.SeatId
                    });
                }

                // Don't trust client SeatNumber — it must match the physical seat's real number.
                if (!string.Equals(
                        physicalSeat.SeatNumber,
                        seatDto.SeatNumber,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new
                    {
                        message =
                            $"SeatNumber mismatch for SeatId {seatDto.SeatId}.",

                        expectedSeatNumber = physicalSeat.SeatNumber,

                        receivedSeatNumber = seatDto.SeatNumber
                    });
                }
            }

            // =========================================================
            // 11a. Resolve InventoryMode — copied and frozen onto the Trip at creation time
            // (see the field comment on Trip.InventoryMode). A route-level override
            // (OperatorRoute.InventoryModeOverride) wins if one exists for this exact
            // operator+route pair; otherwise fall back to the operator's own platform-wide
            // default (BusOperator.InventoryMode). Without this the field silently stays at
            // the model's default (PlatformManaged) for every trip, which defeats the counter-
            // sale safety check in PaymentConfirmationService.ConfirmCounterSaleAsync for any
            // API-connected operator.
            // =========================================================

            var operatorDefaultInventoryMode = await db.BusOperators
                .Where(o => o.Id == dto.BusOperatorId)
                .Select(o => o.InventoryMode)
                .SingleAsync();

            var routeInventoryModeOverride = await db.OperatorRoutes
                .Where(r => r.BusOperatorId == dto.BusOperatorId && r.BusRouteId == dto.BusRouteId)
                .Select(r => r.InventoryModeOverride)
                .FirstOrDefaultAsync();

            var resolvedInventoryMode = routeInventoryModeOverride ?? operatorDefaultInventoryMode;

            // =========================================================
            // 12. Create Trip
            // =========================================================

            // Each TripSeat.SeatId below must reference a Seat that already exists on BusId's
            // physical layout — a trip prices/tracks existing seats, it doesn't invent new ones.
            // SeatNumber/SeatType are taken from the physical Seat (physicalSeats), never from the
            // client, for the same reason Update() below does it — only Fare is trip-specific.
            var trip = new Trip
            {
                BusOperatorId = dto.BusOperatorId,
                BusRouteId = dto.BusRouteId,
                BusId = dto.BusId,
                DepartureTerminalId = dto.DepartureTerminalId,
                ArrivalTerminalId = dto.ArrivalTerminalId,
                TripCode = dto.TripCode,
                DepartureTimeUtc = dto.DepartureTimeUtc,
                ArrivalTimeUtc = dto.ArrivalTimeUtc,
                BaseFare = dto.BaseFare,
                Currency = dto.Currency,
                IsWheelchairAccessible = dto.IsWheelchairAccessible,
                InventoryMode = resolvedInventoryMode,
                TripSeats = dto.TripSeats
                    .Select(s =>
                    {
                        var physicalSeat = physicalSeats[s.SeatId];

                        return new TripSeat
                        {
                            SeatId = physicalSeat.Id,
                            SeatNumber = physicalSeat.SeatNumber,
                            SeatType = physicalSeat.SeatType,
                            Fare = s.Fare
                        };
                    })
                    .ToList()
            };

            // =========================================================
            // 13. Save
            // =========================================================

            try
            {
                db.Trips.Add(trip);

                await db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                // Chunk 10 security checklist item 3: raw exception text (including the
                // driver's inner-exception message, which can echo back column names, table
                // names, or constraint definitions) must never reach an unauthenticated or
                // low-privilege caller in a non-Development environment. Development keeps
                // the detail because that's the whole point of running it locally.
                return Conflict(new
                {
                    message = "Could not create this Trip.",
                    detail = env.IsDevelopment() ? ex.InnerException?.Message : null,
                    innerDetail = env.IsDevelopment() ? ex.InnerException?.InnerException?.Message : null
                });
            }

            // =========================================================
            // 14. Reload Trip + TripSeats
            // =========================================================

            var createdTrip = await db.Trips
                .Include(t => t.TripSeats)
                .FirstOrDefaultAsync(t => t.Id == trip.Id);

            if (createdTrip == null)
            {
                return StatusCode(500, new
                {
                    message = "Trip was created but could not be loaded again."
                });
            }

            // =========================================================
            // 15. Return response
            // =========================================================

            return CreatedAtAction(nameof(GetById), new { id = createdTrip.Id }, ToResponseDto(createdTrip));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, TripUpdateDto dto)
        {
            // =========================================================
            // 1. Load Trip + existing TripSeats
            // =========================================================

            var trip = await db.Trips
                .Include(t => t.TripSeats)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (trip == null)
            {
                return NotFound(new
                {
                    message = "Trip not found."
                });
            }

            // Captured before any mutation below so the TripStatusHistory write near the bottom
            // of this action (see step 16) can tell whether dto.Status actually changed anything,
            // rather than logging a no-op "changed to the same status it already had" entry on
            // every plain edit (e.g. just moving DepartureTimeUtc).
            var previousStatus = trip.Status;


            // =========================================================
            // 1a. Authorization — operator scoping. Checked against BOTH the Trip's current
            // operator (can this caller touch it at all) and dto.BusOperatorId (can this
            // caller reassign it there) — an operator's own staff must not be able to hand
            // their trip off to a different operator, or edit one that already belongs to
            // someone else.
            // =========================================================

            if (!await User.CanManageOperatorAsync(db, trip.BusOperatorId) || !await User.CanManageOperatorAsync(db, dto.BusOperatorId))
            {
                return Forbid();
            }

            // RBAC Amendment v3 / Chunk 2 task 6 names Trips as one of the controllers whose
            // business paths must stop granting access on bare operator-scoping alone — the
            // same gap BusesController.Create had before its fix (see that controller's own
            // comment on this exact two-step shape): CanManageOperatorAsync above only proves
            // this account belongs to the trip's operator, not that its JOB is trip management,
            // so without this a CounterStaff member could edit/cancel-via-status-edit another
            // job's trips. Checked after the (cheaper) operator-scope check above so a
            // cross-operator caller still gets a scope-shaped Forbid rather than a permission
            // one — same ordering BusesController uses.
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.TripsManage))
            {
                return Forbid();
            }


            // =========================================================
            // 1b. Status-transition validation (Chunk 5 P0 task 5). Two rules:
            //   - A plain Update can never SET Status to Cancelled — cancelling a trip has real
            //     side effects (refund every Confirmed booking, release every active hold; see
            //     TripCancellationService) that this generic edit endpoint has no business
            //     doing quietly as a side effect of, say, someone just fixing a typo in
            //     TripCode. Route through POST /api/trips/{id}/cancel instead.
            //   - Every OTHER status change must be a real move on the TripStatusTransitionRules
            //     table — before this, Update accepted any dto.Status value with no ordering
            //     check at all (e.g. Scheduled straight to Arrived, or Completed back to
            //     Scheduled).
            // =========================================================

            if (dto.Status != previousStatus)
            {
                if (dto.Status == TripStatus.Cancelled)
                {
                    return BadRequest(new
                    {
                        message = "Cancelling a trip refunds its Confirmed bookings and releases its active " +
                                  "seat holds — that can't happen as a side effect of a plain field edit. " +
                                  $"Use POST /api/trips/{id}/cancel instead of setting Status to Cancelled here."
                    });
                }

                if (!TripStatusTransitionRules.IsAllowed(previousStatus, dto.Status))
                {
                    return BadRequest(new
                    {
                        message = $"A trip cannot move from {previousStatus} to {dto.Status}.",
                        currentStatus = previousStatus,
                        requestedStatus = dto.Status
                    });
                }
            }


            // =========================================================
            // 2. Validate RowVersion
            // =========================================================

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
            {
                return BadRequest(new
                {
                    message =
                        "RowVersion is required. " +
                        "GET the Trip first and send the latest RowVersion."
                });
            }


            // =========================================================
            // 3. Set original RowVersion for concurrency checking
            // =========================================================

            db.Entry(trip)
                .Property(t => t.RowVersion)
                .OriginalValue = dto.RowVersion;


            // =========================================================
            // 4. Validate TripSeats
            // =========================================================

            if (dto.TripSeats == null || dto.TripSeats.Count == 0)
            {
                return BadRequest(new
                {
                    message = "At least one TripSeat is required."
                });
            }


            // =========================================================
            // 5. Check Bus exists
            // =========================================================

            var bus = await db.Buses
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == dto.BusId);

            if (bus == null)
            {
                return BadRequest(new
                {
                    message = "The specified Bus does not exist.",
                    busId = dto.BusId
                });
            }


            // =========================================================
            // 6. Check Bus belongs to selected BusOperator
            // =========================================================

            if (bus.BusOperatorId != dto.BusOperatorId)
            {
                return BadRequest(new
                {
                    message =
                        "The specified Bus does not belong to the specified BusOperator.",

                    busId = dto.BusId,
                    actualBusOperatorId = bus.BusOperatorId,
                    requestedBusOperatorId = dto.BusOperatorId
                });
            }


            // =========================================================
            // 7. Get all physical Seats of this Bus
            // =========================================================

            var busSeatIds = await db.Seats
                .Where(s => s.BusId == dto.BusId)
                .Select(s => s.Id)
                .ToListAsync();


            // =========================================================
            // 8. Validate TripSeats belong to selected Bus
            // =========================================================

            var invalidSeatIds = dto.TripSeats
                .Where(s => !busSeatIds.Contains(s.SeatId))
                .Select(s => s.SeatId)
                .Distinct()
                .ToList();

            if (invalidSeatIds.Count > 0)
            {
                return BadRequest(new
                {
                    message =
                        "One or more TripSeats do not belong to the selected Bus.",

                    invalidSeatIds
                });
            }


            // =========================================================
            // 9. Prevent duplicate SeatId
            // =========================================================

            var duplicateSeatIds = dto.TripSeats
                .GroupBy(s => s.SeatId)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateSeatIds.Count > 0)
            {
                return BadRequest(new
                {
                    message =
                        "The same physical seat cannot be added " +
                        "to a Trip more than once.",

                    duplicateSeatIds
                });
            }


            // =========================================================
            // 10. Validate TripSeat information against physical Seat
            // =========================================================

            var physicalSeats = await db.Seats
                .Where(s => s.BusId == dto.BusId)
                .ToDictionaryAsync(s => s.Id);

            foreach (var seatDto in dto.TripSeats)
            {
                if (!physicalSeats.TryGetValue(seatDto.SeatId, out var physicalSeat))
                {
                    return BadRequest(new
                    {
                        message = $"Seat {seatDto.SeatId} does not belong to this Bus."
                    });
                }

                // Optional but recommended:
                // Don't allow client to send a wrong SeatNumber.
                if (!string.Equals(
                        physicalSeat.SeatNumber,
                        seatDto.SeatNumber,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new
                    {
                        message =
                            $"SeatNumber mismatch for SeatId {seatDto.SeatId}.",

                        expectedSeatNumber = physicalSeat.SeatNumber,
                        receivedSeatNumber = seatDto.SeatNumber
                    });
                }
            }


            // =========================================================
            // 11. Validate Departure Terminal
            // =========================================================

            var departureTerminalExists =
                await db.Terminals.AnyAsync(t =>
                    t.Id == dto.DepartureTerminalId);

            if (!departureTerminalExists)
            {
                return BadRequest(new
                {
                    message = "DepartureTerminalId does not exist.",
                    departureTerminalId = dto.DepartureTerminalId
                });
            }


            // =========================================================
            // 12. Validate Arrival Terminal
            // =========================================================

            var arrivalTerminalExists =
                await db.Terminals.AnyAsync(t =>
                    t.Id == dto.ArrivalTerminalId);

            if (!arrivalTerminalExists)
            {
                return BadRequest(new
                {
                    message = "ArrivalTerminalId does not exist.",
                    arrivalTerminalId = dto.ArrivalTerminalId
                });
            }


            // =========================================================
            // 13. Departure and Arrival terminal cannot be same
            // =========================================================

            if (dto.DepartureTerminalId == dto.ArrivalTerminalId)
            {
                return BadRequest(new
                {
                    message =
                        "DepartureTerminalId and ArrivalTerminalId cannot be the same."
                });
            }


            // =========================================================
            // 14. Validate BusRoute
            // =========================================================

            var busRouteExists =
                await db.BusRoutes.AnyAsync(r =>
                    r.Id == dto.BusRouteId);

            if (!busRouteExists)
            {
                return BadRequest(new
                {
                    message = "BusRouteId does not exist.",
                    busRouteId = dto.BusRouteId
                });
            }


            // =========================================================
            // 15. Validate Date/Time
            // =========================================================

            if (dto.ArrivalTimeUtc <= dto.DepartureTimeUtc)
            {
                return BadRequest(new
                {
                    message =
                        "ArrivalTimeUtc must be greater than DepartureTimeUtc."
                });
            }


            // =========================================================
            // 15a. Re-resolve InventoryMode — mirrors Create's step 11a. Trip.InventoryMode is
            // deliberately frozen against a later change to the OPERATOR's own setting (see the
            // field comment on Trip.InventoryMode) — but that freeze doesn't apply here, because
            // this Update can reassign the trip itself to a different BusOperatorId/BusRouteId.
            // Without this, reassigning a trip to a different operator kept whatever
            // InventoryMode its *previous* operator/route had, which meant an operator with its
            // own ERP (ExternalApiManaged) could get a Trip stuck at PlatformManaged: wrongly
            // allowing a counter sale through our ERP for a sale channel that operator's own
            // system is supposed to be the sole source of truth for (concept doc §3.2).
            // =========================================================

            var operatorDefaultInventoryMode = await db.BusOperators
                .Where(o => o.Id == dto.BusOperatorId)
                .Select(o => o.InventoryMode)
                .SingleAsync();

            var routeInventoryModeOverride = await db.OperatorRoutes
                .Where(r => r.BusOperatorId == dto.BusOperatorId && r.BusRouteId == dto.BusRouteId)
                .Select(r => r.InventoryModeOverride)
                .FirstOrDefaultAsync();

            trip.InventoryMode = routeInventoryModeOverride ?? operatorDefaultInventoryMode;


            // =========================================================
            // 16. Update Trip master
            // =========================================================

            trip.BusOperatorId = dto.BusOperatorId;
            trip.BusRouteId = dto.BusRouteId;
            trip.BusId = dto.BusId;

            trip.DepartureTerminalId = dto.DepartureTerminalId;
            trip.ArrivalTerminalId = dto.ArrivalTerminalId;

            trip.TripCode = dto.TripCode;

            trip.DepartureTimeUtc = dto.DepartureTimeUtc;
            trip.ArrivalTimeUtc = dto.ArrivalTimeUtc;

            trip.BaseFare = dto.BaseFare;
            trip.Currency = dto.Currency;
            trip.IsWheelchairAccessible = dto.IsWheelchairAccessible;

            trip.Status = dto.Status;
            trip.DelayReason = dto.DelayReason;


            // =========================================================
            // 17. Transaction
            // =========================================================

            // NOTE: this still deletes-and-recreates TripSeats rather than diff-reconciling them
            // (unlike BusOperatorsController.Update(), which reconciles OperatorRoutes in place).
            // That's safe from a data-integrity standpoint — TripSeat rows that are Held/Booked
            // are protected by Restrict FKs from SeatHoldItem/Booking, so the delete below simply
            // fails with a Conflict instead of destroying an in-progress hold or a paid seat. The
            // trade-off is that editing ANY field on a Trip (e.g. just DepartureTimeUtc) is
            // blocked once a single seat on it has been held or booked. If that turns out to be
            // too restrictive in practice, apply the same reconcile-in-place pattern used for
            // OperatorRoutes here too.
            await using var transaction =
                await db.Database.BeginTransactionAsync();

            try
            {
                // -----------------------------------------------------
                // Remove existing TripSeats
                // -----------------------------------------------------

                if (trip.TripSeats.Any())
                {
                    db.TripSeats.RemoveRange(trip.TripSeats);
                }


                // -----------------------------------------------------
                // Create new TripSeats
                // -----------------------------------------------------

                var newTripSeats = dto.TripSeats
                    .Select(s =>
                    {
                        var physicalSeat = physicalSeats[s.SeatId];

                        return new TripSeat
                        {
                            TripId = trip.Id,

                            SeatId = physicalSeat.Id,

                            // Take these from physical Seat instead of
                            // trusting the client.
                            SeatNumber = physicalSeat.SeatNumber,

                            SeatType = physicalSeat.SeatType,

                            Fare = s.Fare
                        };
                    })
                    .ToList();


                // -----------------------------------------------------
                // Add TripSeats
                // -----------------------------------------------------

                await db.TripSeats.AddRangeAsync(newTripSeats);


                // -----------------------------------------------------
                // Record the status change, if any (TripStatusHistoriesController is the
                // read-only view onto this trail — see the class comment there). Saved in the
                // same SaveChangesAsync/transaction as the rest of this update so the history
                // row can never exist without the status change it describes actually landing,
                // or vice versa.
                // -----------------------------------------------------

                if (trip.Status != previousStatus)
                {
                    db.TripStatusHistories.Add(new TripStatusHistory
                    {
                        TripId = trip.Id,
                        ChangedByUserId = GetCurrentUserId(),
                        Status = trip.Status,
                        ChangedAtUtc = DateTime.UtcNow,
                        Remarks = trip.DelayReason,
                    });
                }


                // -----------------------------------------------------
                // Save
                // -----------------------------------------------------

                await db.SaveChangesAsync();


                // -----------------------------------------------------
                // Commit
                // -----------------------------------------------------

                await transaction.CommitAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                await transaction.RollbackAsync();

                var entries = ex.Entries.Select(e => new
                {
                    Entity = e.Entity.GetType().Name,
                    State = e.State.ToString()
                });

                return Conflict(new
                {
                    message =
                        "This Trip was changed by another request. " +
                        "GET the latest Trip and retry the update.",

                    entries
                });
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync();

                // Chunk 10 security checklist item 3 — see the identical fix in Create() above.
                return Conflict(new
                {
                    message = "Could not save this Trip update. If seats on this Trip are " +
                               "already Held or Booked, release/cancel them first.",
                    detail = env.IsDevelopment() ? ex.InnerException?.Message : null,
                    innerDetail = env.IsDevelopment() ? ex.InnerException?.InnerException?.Message : null
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                return StatusCode(500, new
                {
                    message = "An unexpected error occurred while updating the Trip.",
                    detail = env.IsDevelopment() ? ex.Message : null
                });
            }


            // =========================================================
            // 18. Reload updated Trip
            // =========================================================

            var updatedTrip = await db.Trips
                .Include(t => t.TripSeats)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (updatedTrip == null)
            {
                return NotFound(new
                {
                    message =
                        "Trip was updated but could not be loaded again."
                });
            }


            // =========================================================
            // 19. Return response
            // =========================================================

            return Ok(ToResponseDto(updatedTrip));
        }
        // Chunk 5 P0 task 1: read-only, no side effects — what the Angular "Cancel trip"
        // dialog calls first so it can show "N bookings will be refunded" (and how much,
        // split online vs counter) before the operator actually confirms. Same authorization
        // shape as Cancel itself below, since seeing this number IS seeing operator-sensitive
        // financial exposure, not public trip info.
        [HttpGet("{id}/cancel-preview")]
        public async Task<IActionResult> CancelPreview(Guid id)
        {
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id);
            if (trip == null) return NotFound(new { message = "Trip not found." });

            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.TripsCancel)) return Forbid();
            if (!actor.CanManageOperator(trip.BusOperatorId)) return Forbid();

            var affectedBookings = await db.Bookings
                .Where(b => b.TripId == id
                    && (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.PartiallyCancelled))
                .Select(b => new { b.MoneyCollectedBy, b.GrandTotal, b.Currency })
                .ToListAsync();

            var activeHoldCount = await db.SeatHolds
                .CountAsync(h => h.TripId == id && h.Status == SeatHoldStatus.Active);

            return Ok(new TripCancelPreviewDto
            {
                TripId = id,
                CurrentStatus = trip.Status,
                CanCancel = TripStatusTransitionRules.CanCancel(trip.Status),
                BookingsToRefundCount = affectedBookings.Count,
                OnlineBookingsCount = affectedBookings.Count(b => b.MoneyCollectedBy == MoneyCollectedBy.Platform),
                CounterBookingsCount = affectedBookings.Count(b => b.MoneyCollectedBy == MoneyCollectedBy.Operator),
                TotalRefundAmount = affectedBookings.Sum(b => b.GrandTotal),
                Currency = affectedBookings.FirstOrDefault()?.Currency ?? trip.Currency,
                ActiveSeatHoldsToRelease = activeHoldCount,
            });
        }

        // Chunk 5 P0 task 1 — the concept's "cancelled trip -> customers refunded" promise
        // (concept doc §5/§6), finally wired up as one operation instead of the plain status
        // edit Update() above now refuses (see step 1b there). Delegates every real step —
        // status/history, hold release, per-booking full refund — to TripCancellationService;
        // this action is authorization, input validation, and turning that service's result
        // (or its exceptions) into an HTTP response.
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(Guid id, TripCancelDto dto)
        {
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id);
            if (trip == null) return NotFound(new { message = "Trip not found." });

            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.TripsCancel)) return Forbid();
            if (!actor.CanManageOperator(trip.BusOperatorId)) return Forbid();

            if (dto == null || string.IsNullOrWhiteSpace(dto.Reason))
            {
                return BadRequest(new { message = "A cancellation reason is required." });
            }

            try
            {
                var result = await tripCancellationService.CancelTripAsync(id, GetCurrentUserId(), dto.Reason);

                var responseDto = new TripCancelResultDto
                {
                    TripId = result.TripId,
                    ReleasedHoldCount = result.ReleasedHoldCount,
                    BookingsRefunded = result.BookingsRefunded,
                    BookingsNeedingAttention = result.BookingsNeedingAttention,
                    Bookings = result.Bookings.Select(b => new TripCancelledBookingOutcomeDto
                    {
                        BookingId = b.BookingId,
                        RefundId = b.RefundId,
                        Outcome = b.Outcome,
                        Detail = b.Detail,
                    }).ToList(),
                };

                return Ok(new
                {
                    message = $"Trip cancelled. {result.BookingsRefunded} booking(s) refunded" +
                              (result.BookingsNeedingAttention > 0
                                  ? $", {result.BookingsNeedingAttention} needing manual follow-up"
                                  : "") +
                              $", {result.ReleasedHoldCount} active seat hold(s) released.",
                    result = responseDto,
                });
            }
            catch (InvalidOperationException ex)
            {
                // Someone else's request already moved this trip out of a cancellable status
                // between CancelPreview and this call, or it was already Cancelled — a
                // conflict with the current state, not a validation failure on the request body.
                return Conflict(new { message = ex.Message });
            }
        }

        // Chunk 5 P0 task 2 — operator-scoped passenger manifest for the driver/conductor
        // (concept: an operator needs to know who's actually on board). Every ticket on the
        // trip is included, WITH its real status, rather than silently dropping
        // cancelled/refunded ones — a printed manifest that just shows an empty seat with no
        // explanation is less useful than one that shows "cancelled" for it.
        [HttpGet("{id}/manifest")]
        public async Task<IActionResult> Manifest(Guid id)
        {
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == id);
            if (trip == null) return NotFound(new { message = "Trip not found." });

            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.ManifestRead)) return Forbid();
            if (!actor.CanManageOperator(trip.BusOperatorId)) return Forbid();

            var tickets = await db.Tickets
                .Where(t => t.TripId == id)
                .Include(t => t.BookingPassenger)
                .Include(t => t.Booking).ThenInclude(b => b.BoardingTerminal)
                .Include(t => t.Booking).ThenInclude(b => b.DroppingTerminal)
                .OrderBy(t => t.SeatNumberSnapshot)
                .ToListAsync();

            var passengers = tickets.Select(t => new TripManifestEntryDto
            {
                TicketId = t.Id,
                TicketNumber = t.TicketNumber,
                SeatNumber = t.SeatNumberSnapshot,
                PassengerName = t.BookingPassenger.FullName,
                PassengerPhone = t.BookingPassenger.Phone,
                Status = t.Status,
                CheckedInAtUtc = t.CheckedInAtUtc,
                Pnr = t.Booking.Pnr,
                BoardingTerminalName = t.Booking.BoardingTerminal.Name,
                DroppingTerminalName = t.Booking.DroppingTerminal.Name,
            }).ToList();

            return Ok(new TripManifestResponseDto
            {
                TripId = trip.Id,
                TripCode = trip.TripCode,
                DepartureTimeUtc = trip.DepartureTimeUtc,
                Status = trip.Status,
                TotalPassengers = passengers.Count,
                CheckedInCount = passengers.Count(p => p.Status is TicketStatus.CheckedIn or TicketStatus.Used),
                Passengers = passengers,
            });
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var trip = await db.Trips.Include(t => t.TripSeats).FirstOrDefaultAsync(t => t.Id == id);
            if (trip == null) return NotFound();

            if (!await User.CanManageOperatorAsync(db, trip.BusOperatorId)) return Forbid();

            var hasBookings = await db.Bookings.AnyAsync(b => b.TripId == id);

            if (hasBookings)
            {
                // Don't cascade-delete: Bookings are real customer purchases. Soft-delete +
                // cancel the trip instead — the trip just stops showing up in "browse trips"
                // listings.
                //
                // This is the SECOND (and last) place in the codebase that ever sets
                // Trip.Status = Cancelled directly — Update's own direct-edit path was closed
                // off in step 1b above and routed through TripCancellationService instead;
                // before this change, THIS path still bypassed it entirely, silently skipping
                // every Confirmed booking's refund and every active seat hold's release while
                // still telling the caller "every existing Booking is untouched" (true for the
                // Booking ROW, not for whether its customer ever got their money back).
                //
                // Only routed through the real cascade when the trip is actually in a
                // cancellable (pre-departure) status — for a trip that's already Cancelled, or
                // one that's Completed/Departed/Running/Arrived, refunding makes no business
                // sense (nothing to refund, or the bus already ran), so those still take the
                // plain soft-delete path exactly as before this change.
                if (trip.Status != TripStatus.Cancelled && TripStatusTransitionRules.CanCancel(trip.Status))
                {
                    // Same AppDbContext as `trip` above (both injected once per request), so
                    // this mutates that same tracked instance — no re-fetch needed afterward.
                    await tripCancellationService.CancelTripAsync(
                        id, GetCurrentUserId(), "Trip deleted by operator while it still had bookings.");
                }
                else if (trip.Status != TripStatus.Cancelled)
                {
                    var previousStatus = trip.Status;
                    trip.Status = TripStatus.Cancelled;

                    db.TripStatusHistories.Add(new TripStatusHistory
                    {
                        TripId = trip.Id,
                        ChangedByUserId = GetCurrentUserId(),
                        Status = TripStatus.Cancelled,
                        ChangedAtUtc = DateTime.UtcNow,
                        Remarks = $"Trip soft-deleted after Bookings were made against it (was {previousStatus}; already run, nothing to refund).",
                    });
                }

                trip.MarkDeleted();

                try
                {
                    await db.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    return Conflict("This Trip was already modified or deleted by another request.");
                }

                return Ok(new
                {
                    message = "This Trip has Bookings against it, so it can't be permanently deleted without destroying customer booking history. It has been marked Cancelled and hidden from all normal queries instead — every existing Booking is untouched.",
                    softDeleted = true
                });
            }

            // TripSeat is a pure detail of this Trip — Restrict never cascades it, so clear it explicitly.
            db.TripSeats.RemoveRange(trip.TripSeats);
            db.Trips.Remove(trip);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict("This Trip was already modified or deleted by another request.");
            }
            catch (DbUpdateException)
            {
                // Safety net — e.g. a TripStatusHistory/Review/SeatHold row that also references it.
                return Conflict("Cannot delete this Trip — something still references it. Try again shortly; if this persists, contact support.");
            }

            return NoContent();
        }

        // Trip carries a single CoverImageUrl field directly — simplest of the 5 image endpoints.
        [HttpPost("{id}/images")]
        public async Task<IActionResult> UploadImage(Guid id, IFormFile file)
        {
            var trip = await db.Trips.FindAsync(id);

            if (trip == null)
            {
                return NotFound(new { message = "Trip not found." });
            }

            if (!await User.CanManageOperatorAsync(db, trip.BusOperatorId))
            {
                return Forbid();
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No image uploaded." });
            }

            var allowedExtensions = new[]
            {
                ".jpg",
                ".jpeg",
                ".png",
                ".gif",
                ".webp",
                ".bmp"
            };

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new
                {
                    message = "Only JPG, JPEG, PNG, GIF, WEBP and BMP images are allowed."
                });
            }

            const long maxFileSize = 5 * 1024 * 1024;

            if (file.Length > maxFileSize)
            {
                return BadRequest(new { message = "Image size cannot exceed 5 MB." });
            }

            var imageFolder = Path.Combine( env.WebRootPath!, "images" );
            Directory.CreateDirectory(imageFolder);

            var fileName = $"trip_{id}_{Guid.NewGuid()}{extension}";

            var filePath = Path.Combine( imageFolder, fileName );

            await using (var stream = new FileStream( filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            trip.CoverImageUrl = $"/images/{fileName}";
            await db.SaveChangesAsync();
            return Ok(new
            {
                message = "Trip image uploaded successfully.",
                imageUrl = trip.CoverImageUrl
            });
        }




    private static TripResponseDto ToResponseDto(Trip trip)
    {
      return new TripResponseDto
      {
        Id = trip.Id,

        // ============ IDs ============
        BusOperatorId = trip.BusOperatorId,
        BusRouteId = trip.BusRouteId,
        BusId = trip.BusId,
        DepartureTerminalId = trip.DepartureTerminalId,
        ArrivalTerminalId = trip.ArrivalTerminalId,

        // ============ ⭐ BUS OPERATOR INFO ============
        BusOperatorName = trip.BusOperator?.Name,
        BusOperatorLogoUrl = trip.BusOperator?.LogoUrl,

        // ============ ⭐ BUS INFO ============
        BusBrand = trip.Bus?.Brand,
        BusModel = trip.Bus?.Model,
        BusType = trip.Bus?.BusType,
        BusCoachNumber = trip.Bus?.CoachNumber,
        BusRegistrationNumber = trip.Bus?.RegistrationNumber,
        BusHasWifi = trip.Bus?.HasWifi ?? false,
        BusHasToilet = trip.Bus?.HasToilet ?? false,

        // ============ ⭐ ROUTE INFO ============
        BusRouteName = trip.BusRoute?.Name,
        BusRouteCode = trip.BusRoute?.RouteCode,

        // ============ ⭐ TERMINAL INFO ============
        DepartureTerminalName = trip.DepartureTerminal?.Name,
        DepartureCity = trip.DepartureTerminal?.City,
        ArrivalTerminalName = trip.ArrivalTerminal?.Name,
        ArrivalCity = trip.ArrivalTerminal?.City,

        // ============ TRIP ============
        TripCode = trip.TripCode,
        DepartureTimeUtc = trip.DepartureTimeUtc,
        ArrivalTimeUtc = trip.ArrivalTimeUtc,
        BaseFare = trip.BaseFare,
        Currency = trip.Currency,
        IsWheelchairAccessible = trip.IsWheelchairAccessible,
        Status = trip.Status,
        CreatedAtUtc = trip.CreatedAtUtc,
        UpdatedAtUtc = trip.UpdatedAtUtc,
        DeletedAtUtc = trip.DeletedAtUtc,
        DelayReason = trip.DelayReason,
        CoverImageUrl = trip.CoverImageUrl,

        // ============ ⭐ SEATS with layout info ============
        TripSeats = trip.TripSeats
              .Select(s => new TripSeatResponseDto
              {
                Id = s.Id,
                SeatId = s.SeatId,
                SeatNumber = s.SeatNumber,
                SeatType = s.SeatType,
                Fare = s.Fare,
                Status = s.Status,

                // ⭐ NEW
                RowNumber = s.Seat?.RowNumber ?? 0,
                ColumnNumber = s.Seat?.ColumnNumber ?? 0,
                DeckLevel = s.Seat?.DeckLevel ?? 1,
                IsWindow = s.Seat?.IsWindow ?? false,
                ExtraFare = s.Seat?.ExtraFare
              })
              .ToList(),

        RowVersion = trip.RowVersion
      };
    }

    // Flatter mapper for search results — see the TripSearchResultDto comment in
    // DTO/TripDtos.cs for why this doesn't just reuse ToResponseDto above. Reads
    // TripSeat.Status live rather than any cached count, so it can never drift from what
    // SeatHoldService/PaymentConfirmationService are doing to the same rows.
    private static TripSearchResultDto ToSearchResultDto(Trip trip)
        {
            var availableSeats = trip.TripSeats.Where(s => s.Status == TripSeatStatus.Available).ToList();

            return new TripSearchResultDto
            {
                TripId = trip.Id,
                TripCode = trip.TripCode,

                BusOperatorId = trip.BusOperatorId,
                BusOperatorName = trip.BusOperator.Name,
                BusOperatorLogoUrl = trip.BusOperator.LogoUrl,

                BusId = trip.BusId,
                BusBrand = trip.Bus.Brand,
                BusModel = trip.Bus.Model,
                BusType = trip.Bus.BusType,
                HasWifi = trip.Bus.HasWifi,
                HasToilet = trip.Bus.HasToilet,

                DepartureTerminalId = trip.DepartureTerminalId,
                DepartureTerminalName = trip.DepartureTerminal.Name,
                ArrivalTerminalId = trip.ArrivalTerminalId,
                ArrivalTerminalName = trip.ArrivalTerminal.Name,

                DepartureTimeUtc = trip.DepartureTimeUtc,
                ArrivalTimeUtc = trip.ArrivalTimeUtc,

                Status = trip.Status,
                IsWheelchairAccessible = trip.IsWheelchairAccessible,
                Currency = trip.Currency,

                TotalSeatCount = trip.TripSeats.Count,
                AvailableSeatCount = availableSeats.Count,
                LowestAvailableFare = availableSeats.Count > 0 ? availableSeats.Min(s => s.Fare) : null,

                CoverImageUrl = trip.CoverImageUrl,
            };
        }

        // Operator-scoping auth helper used to be duplicated per-controller here — it's now
        // the single User.CanManageOperatorAsync(db, ...) extension in
        // Extensions/ClaimsPrincipalExtensions.cs (Piece 2), used above and by every other
        // controller that needs the same check.

        // Same pattern as AccountController/BookingsController/CancellationRequestsController's
        // own private copies — who actually made the status change that Update/Delete above just
        // wrote to TripStatusHistory. Null (rather than throwing) for the rare case a caller's
        // token doesn't carry a parseable NameIdentifier, since a missing "who" shouldn't block
        // the status change itself from being recorded.
        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }
}
