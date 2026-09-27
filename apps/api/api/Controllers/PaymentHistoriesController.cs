using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // Read-only. Same idea as RefundHistoriesController: this is the append-only trail of a
    // Payment's own status changes, written exclusively by PaymentConfirmationService (see
    // Services/PaymentConfirmationService.cs). The old generic CRUD let a client insert a fake
    // "Succeeded" row without a real payment ever completing. A customer can see the history of
    // their own bookings' payments; Admin/platform-Staff see everyone's; an operator's own
    // Staff/Operator account (previously unrestricted, and previously locked out entirely
    // under the "Operator" role) is scoped to that operator's own bookings' payment history.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentHistoriesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.PaymentHistories.AsQueryable();

            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
            {
                var callerOperatorId = await User.GetBusOperatorIdAsync(db);
                if (callerOperatorId != null)
                {
                    query = query.Where(h => db.Payments.Any(p =>
                        p.Id == h.PaymentId && db.Bookings.Any(b =>
                            b.Id == p.BookingId && b.BusOperatorId == callerOperatorId)));
                }
                // else: platform Admin/Staff — no filter, see everything.
            }
            else
            {
                var userId = GetCurrentUserId();
                query = query.Where(h => db.Payments.Any(p =>
                    p.Id == h.PaymentId && db.Bookings.Any(b =>
                        b.Id == p.BookingId && b.CustomerProfile != null && b.CustomerProfile.UserId == userId)));
            }

            var items = await query.OrderByDescending(h => h.ChangedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.PaymentHistories.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
            {
                var bookingId = await db.Payments
                    .Where(p => p.Id == item.PaymentId)
                    .Select(p => (Guid?)p.BookingId)
                    .FirstOrDefaultAsync();
                var operatorId = bookingId == null ? null : await db.Bookings
                    .Where(b => b.Id == bookingId)
                    .Select(b => (Guid?)b.BusOperatorId)
                    .FirstOrDefaultAsync();
                if (operatorId == null || !await User.CanManageOperatorAsync(db, operatorId.Value)) return Forbid();
            }
            else
            {
                var userId = GetCurrentUserId();
                var owns = await db.Payments.AnyAsync(p =>
                    p.Id == item.PaymentId && db.Bookings.Any(b =>
                        b.Id == p.BookingId && b.CustomerProfile != null && b.CustomerProfile.UserId == userId));
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

        private static PaymentHistoryResponseDto ToResponseDto(PaymentHistory x) => new()
        {
            Id = x.Id,
            PaymentId = x.PaymentId,
            Status = x.Status,
            ChangedAtUtc = x.ChangedAtUtc,
            Remarks = x.Remarks,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
