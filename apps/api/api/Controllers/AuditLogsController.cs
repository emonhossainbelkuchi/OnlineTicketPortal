using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Read-only. AuditLog is a compliance-style before/after record — the old generic CRUD let
    // any authenticated user insert a fake change record, edit an existing one's
    // OldValuesJson/NewValuesJson after the fact, or hard-delete one outright, all of which
    // defeats the entire point of an audit trail. Admin/Staff-only: this is platform-internal
    // compliance data.
    //
    // Same situation as ActivityLog: nothing in the codebase writes here yet. A real audit
    // trail across every entity's changes is normally wired up as a single cross-cutting
    // SaveChanges interceptor rather than instrumented by hand per controller — that's a
    // deliberate design decision bigger than this lockdown pass, flagged as a follow-up rather
    // than guessed at here.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AuditLogsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff"))
            {
                return Ok(Array.Empty<AuditLogResponseDto>());
            }

            var items = await db.AuditLogs.OrderByDescending(x => x.CreatedAtUtc).ToListAsync();
            var actors = await LoadActorsAsync(items.Select(x => x.UserId));
            return Ok(items.Select(x => ToResponseDto(x, actors)));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff")) return Forbid();

            var item = await db.AuditLogs.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var actors = await LoadActorsAsync(new[] { item.UserId });
            return Ok(ToResponseDto(item, actors));
        }

        // No POST/PUT/DELETE — see the class comment above.

        // Chunk 9 task 4: resolve the acting user's name server-side instead of shipping a raw
        // AspNetUsers.Id for the admin console to display as-is. One batched lookup per
        // request (not N+1 per row) — same reasoning as AdminController.GetUsers batching
        // GetRolesAsync, just applied to a plain dictionary lookup instead.
        private async Task<Dictionary<Guid, (string? UserName, string? FullName)>> LoadActorsAsync(
            IEnumerable<Guid?> userIds)
        {
            var ids = userIds.Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
            if (ids.Count == 0) return new Dictionary<Guid, (string?, string?)>();

            var users = await db.Users
                .Where(u => ids.Contains(u.Id))
                .Select(u => new { u.Id, u.UserName, u.FullName })
                .ToListAsync();

            return users.ToDictionary(u => u.Id, u => ((string?)u.UserName, (string?)u.FullName));
        }

        private static AuditLogResponseDto ToResponseDto(
            AuditLog x, Dictionary<Guid, (string? UserName, string? FullName)> actors)
        {
            var actor = x.UserId.HasValue && actors.TryGetValue(x.UserId.Value, out var found)
                ? found
                : ((string?)null, (string?)null);

            return new AuditLogResponseDto
            {
                Id = x.Id,
                UserId = x.UserId,
                ActorUserName = actor.Item1,
                ActorFullName = actor.Item2,
                EntityName = x.EntityName,
                EntityId = x.EntityId,
                Action = x.Action,
                OldValuesJson = x.OldValuesJson,
                NewValuesJson = x.NewValuesJson,
                IpAddress = x.IpAddress,
                UserAgent = x.UserAgent,
                CreatedAtUtc = x.CreatedAtUtc,
            };
        }
    }
}
