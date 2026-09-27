using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // Read-only. Which emails/SMS actually went out, and whether they succeeded, is a delivery
    // record, not something a client should be able to fabricate or edit — the old generic CRUD
    // let a client mark any notification Sent, or forge one addressed to someone else. A
    // customer can see notifications sent to their own account or their own bookings (e.g. "did
    // my booking confirmation actually go out"); Admin/Staff see everyone's.
    //
    // Nothing sends real notifications yet (no email/SMS provider is wired in), so nothing
    // writes here yet either — same situation as ActivityLog/AuditLog. Flagged as a follow-up
    // for whoever builds the notification-sending side, not solved in this pass.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationLogsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.NotificationLogs.AsQueryable();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff"))
            {
                var userId = GetCurrentUserId();
                query = query.Where(n => n.UserId == userId
                    || (n.BookingId != null && db.Bookings.Any(b =>
                        b.Id == n.BookingId && b.CustomerProfile != null && b.CustomerProfile.UserId == userId)));
            }

            var items = await query.OrderByDescending(n => n.CreatedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.NotificationLogs.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff"))
            {
                var userId = GetCurrentUserId();
                var owns = item.UserId == userId
                    || (item.BookingId != null && await db.Bookings.AnyAsync(b =>
                        b.Id == item.BookingId && b.CustomerProfile != null && b.CustomerProfile.UserId == userId));
                if (!owns) return Forbid();
            }

            return Ok(ToResponseDto(item));
        }

        // No POST/PUT/DELETE — see the class comment above.

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private static NotificationLogResponseDto ToResponseDto(NotificationLog x) => new()
        {
            Id = x.Id,
            BookingId = x.BookingId,
            TicketId = x.TicketId,
            UserId = x.UserId,
            Channel = x.Channel,
            Recipient = x.Recipient,
            Subject = x.Subject,
            Message = x.Message,
            Status = x.Status,
            ProviderMessageId = x.ProviderMessageId,
            ErrorMessage = x.ErrorMessage,
            SentAtUtc = x.SentAtUtc,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
