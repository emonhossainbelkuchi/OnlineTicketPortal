using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Read-only. A "who did what" activity feed only means something as a trail if clients
    // can't also rewrite it — the old generic CRUD let any authenticated user log an entry as
    // any other user, or edit/delete existing ones. Admin/Staff-only: this is a
    // platform-internal feed, not something an individual customer has a reason to browse.
    //
    // Nothing in the codebase writes to this table yet — unlike PaymentHistory (one clear
    // trigger: a payment's status changing) there's no single event that should populate a
    // general activity feed. Wiring this up for real needs a deliberate choice (a cross-cutting
    // action filter/middleware vs. instrumenting every controller by hand), which is bigger
    // than this lockdown pass — flagged as a follow-up rather than guessed at here.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ActivityLogsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff"))
            {
                return Ok(Array.Empty<ActivityLogResponseDto>());
            }

            var items = await db.ActivityLogs.OrderByDescending(x => x.CreatedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff")) return Forbid();

            var item = await db.ActivityLogs.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        // No POST/PUT/DELETE — see the class comment above.

        private static ActivityLogResponseDto ToResponseDto(ActivityLog x) => new()
        {
            Id = x.Id,
            UserId = x.UserId,
            Action = x.Action,
            EntityName = x.EntityName,
            EntityId = x.EntityId,
            IpAddress = x.IpAddress,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
