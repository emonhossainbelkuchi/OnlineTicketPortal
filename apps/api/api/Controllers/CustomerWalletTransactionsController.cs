using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.People;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // Read-only. This is the paper trail behind CustomerProfile.WalletBalance — the model's
    // own comment says "nothing else in the app should touch the balance directly", and
    // CustomerWalletService is the only code that writes here (always alongside the balance
    // change it explains). The old generic CRUD let a client insert a transaction with any
    // BalanceAfter it liked, completely disconnected from the customer's real balance.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerWalletTransactionsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.CustomerWalletTransactions.AsQueryable();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                var userId = GetCurrentUserId();
                query = query.Where(t => db.CustomerProfiles.Any(cp =>
                    cp.Id == t.CustomerProfileId && cp.UserId == userId));
            }

            var items = await query.OrderByDescending(t => t.CreatedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.CustomerWalletTransactions.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                var userId = GetCurrentUserId();
                var owns = await db.CustomerProfiles.AnyAsync(cp =>
                    cp.Id == item.CustomerProfileId && cp.UserId == userId);
                if (!owns) return Forbid();
            }

            return Ok(ToResponseDto(item));
        }

        // No POST/PUT/DELETE — see the class comment above. Use
        // CustomerWalletService.CreditAsync / DebitAsync to actually move wallet money.

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private static CustomerWalletTransactionResponseDto ToResponseDto(CustomerWalletTransaction x) => new()
        {
            Id = x.Id,
            CustomerProfileId = x.CustomerProfileId,
            BookingId = x.BookingId,
            RefundId = x.RefundId,
            TransactionType = x.TransactionType,
            Amount = x.Amount,
            BalanceAfter = x.BalanceAfter,
            Currency = x.Currency,
            Description = x.Description,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
