using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Read-only, Admin/Staff-only for now. A Trip's current status is already visible to
    // everyone through TripsController; this is the internal "who changed it and when" trail on
    // top of that. Written from TripsController wherever Trip.Status actually changes — see the
    // TripStatusHistories.Add calls there. The old generic CRUD let a client insert a fake
    // status change for any trip with no real change happening.
    //
    // Admin/platform-Staff see every trip's status history; an operator's own Staff/Operator
    // account (previously unrestricted, and previously locked out entirely under the
    // "Operator" role) is scoped to its own operator's trips via Trip.BusOperatorId, same as
    // TripsController itself.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TripStatusHistoriesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<TripStatusHistoryResponseDto>());
            }

            var query = db.TripStatusHistories.AsQueryable();

            var callerOperatorId = await User.GetBusOperatorIdAsync(db);
            if (callerOperatorId != null)
            {
                query = query.Where(x => db.Trips.Any(t => t.Id == x.TripId && t.BusOperatorId == callerOperatorId));
            }

            var items = await query.OrderByDescending(x => x.ChangedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.TripStatusHistories.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var operatorId = await db.Trips
                .Where(t => t.Id == item.TripId)
                .Select(t => (Guid?)t.BusOperatorId)
                .FirstOrDefaultAsync();
            if (operatorId == null || !await User.CanManageOperatorAsync(db, operatorId.Value)) return Forbid();

            return Ok(ToResponseDto(item));
        }

        // No POST/PUT/DELETE — see the class comment above.

        private static TripStatusHistoryResponseDto ToResponseDto(TripStatusHistory x) => new()
        {
            Id = x.Id,
            TripId = x.TripId,
            ChangedByUserId = x.ChangedByUserId,
            Status = x.Status,
            ChangedAtUtc = x.ChangedAtUtc,
            Remarks = x.Remarks,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
