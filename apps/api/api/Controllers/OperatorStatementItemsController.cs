using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Read-only — see OperatorStatementsController and Services/SettlementGenerationService.cs.
    // One row per ledger entry swept into the parent statement.
    //
    // OperatorStatementsController.GetById already scopes correctly (see its class comment),
    // but this sibling controller let ANY Staff account read every operator's statement line
    // items directly by id or by ?operatorStatementId=, completely bypassing that scoping —
    // and, same as everywhere else, silently locked out the "Operator" login role. Fixed to
    // resolve OperatorStatementItem's parent OperatorStatement.BusOperatorId and go through
    // the same CanManageOperatorAsync check the parent controller uses.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorStatementItemsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? operatorStatementId)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<OperatorStatementItemResponseDto>());
            }

            var query = db.OperatorStatementItems.AsQueryable();

            var callerOperatorId = await User.GetBusOperatorIdAsync(db);
            if (callerOperatorId != null)
            {
                query = query.Where(i => db.OperatorStatements.Any(s =>
                    s.Id == i.OperatorStatementId && s.BusOperatorId == callerOperatorId));
            }

            if (operatorStatementId.HasValue)
            {
                query = query.Where(i => i.OperatorStatementId == operatorStatementId.Value);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.OperatorStatementItems.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var operatorId = await db.OperatorStatements
                .Where(s => s.Id == item.OperatorStatementId)
                .Select(s => (Guid?)s.BusOperatorId)
                .FirstOrDefaultAsync();
            if (operatorId == null || !await User.CanManageOperatorAsync(db, operatorId.Value)) return Forbid();

            return Ok(ToResponseDto(item));
        }

        // No POST/PUT/DELETE — see OperatorStatementsController's class comment.

        private static OperatorStatementItemResponseDto ToResponseDto(OperatorStatementItem x) => new()
        {
            Id = x.Id,
            OperatorStatementId = x.OperatorStatementId,
            BookingId = x.BookingId,
            TicketId = x.TicketId,
            PaymentId = x.PaymentId,
            RefundId = x.RefundId,
            PlatformLedgerId = x.PlatformLedgerId,
            ItemType = x.ItemType,
            SaleChannel = x.SaleChannel,
            DebitAmount = x.DebitAmount,
            CreditAmount = x.CreditAmount,
            Currency = x.Currency,
            Description = x.Description,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
