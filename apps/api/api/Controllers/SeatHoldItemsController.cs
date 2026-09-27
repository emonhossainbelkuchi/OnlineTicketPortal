using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Bookings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // Read-only on purpose. Items are written only as a side effect of
    // SeatHoldService.HoldSeatsAsync — there's no legitimate reason for a client to create,
    // edit, or delete one directly (the old generic CRUD here let a client attach any seat,
    // at any fare, to any hold, completely bypassing seat availability).
    //
    // Same three-tier access as SeatHoldsController: platform Admin/Staff see every item; an
    // operator's own Staff/Operator account is scoped to items on that operator's own trips
    // (resolved via SeatHold.TripId -> Trip.BusOperatorId, same as SeatHoldsController);
    // everyone else sees only items on holds they themselves created.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SeatHoldItemsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.SeatHoldItems.AsQueryable();

            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
            {
                var callerOperatorId = await User.GetBusOperatorIdAsync(db);
                if (callerOperatorId != null)
                {
                    query = query.Where(i => db.SeatHolds.Any(h =>
                        h.Id == i.SeatHoldId && db.Trips.Any(t => t.Id == h.TripId && t.BusOperatorId == callerOperatorId)));
                }
                // else: platform Admin/Staff — no filter, see everything.
            }
            else
            {
                var userId = GetCurrentUserId();
                query = query.Where(i => db.SeatHolds.Any(h => h.Id == i.SeatHoldId && h.HeldByUserId == userId));
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.SeatHoldItems.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
            {
                var tripId = await db.SeatHolds
                    .Where(h => h.Id == item.SeatHoldId)
                    .Select(h => (Guid?)h.TripId)
                    .FirstOrDefaultAsync();
                var operatorId = tripId == null ? null : await db.Trips
                    .Where(t => t.Id == tripId)
                    .Select(t => (Guid?)t.BusOperatorId)
                    .FirstOrDefaultAsync();
                if (operatorId == null || !await User.CanManageOperatorAsync(db, operatorId.Value)) return Forbid();
            }
            else
            {
                var userId = GetCurrentUserId();
                var owns = await db.SeatHolds.AnyAsync(h => h.Id == item.SeatHoldId && h.HeldByUserId == userId);
                if (!owns) return Forbid();
            }

            return Ok(ToResponseDto(item));
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private static SeatHoldItemResponseDto ToResponseDto(SeatHoldItem x) => new()
        {
            Id = x.Id,
            SeatHoldId = x.SeatHoldId,
            TripSeatId = x.TripSeatId,
            FareAtHold = x.FareAtHold,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
