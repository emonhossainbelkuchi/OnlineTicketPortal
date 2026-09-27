using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // Read-only. A login/security trail that clients could also edit isn't a trail — the old
    // generic CRUD let any authenticated user rewrite anyone's login history, including
    // flipping a failed attempt to Success after the fact. A user can see their own login
    // history (a normal "recent activity" security page); Admin/Staff see everyone's.
    //
    // Written by AccountController.Login on every attempt, success or failure — see there.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class LoginHistoriesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.LoginHistories.AsQueryable();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff"))
            {
                var userId = GetCurrentUserId();
                query = query.Where(x => x.UserId == userId);
            }

            var items = await query.OrderByDescending(x => x.LoginAtUtc).ToListAsync();
            var actors = await LoadActorsAsync(items.Select(x => (Guid?)x.UserId));
            return Ok(items.Select(x => ToResponseDto(x, actors)));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.LoginHistories.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && item.UserId != GetCurrentUserId())
            {
                return Forbid();
            }

            var actors = await LoadActorsAsync(new Guid?[] { item.UserId });
            return Ok(ToResponseDto(item, actors));
        }

        // No POST/PUT/DELETE — see the class comment above.

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        // Chunk 9 task 4: same server-side actor-name join as AuditLogsController — see its
        // own LoadActorsAsync comment for why this is one batched lookup, not N+1.
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

        private static LoginHistoryResponseDto ToResponseDto(
            LoginHistory x, Dictionary<Guid, (string? UserName, string? FullName)> actors)
        {
            var actor = actors.TryGetValue(x.UserId, out var found) ? found : ((string?)null, (string?)null);

            return new LoginHistoryResponseDto
            {
                Id = x.Id,
                UserId = x.UserId,
                ActorUserName = actor.Item1,
                ActorFullName = actor.Item2,
                LoginAtUtc = x.LoginAtUtc,
                IpAddress = x.IpAddress,
                UserAgent = x.UserAgent,
                Success = x.Success,
            };
        }
    }
}
