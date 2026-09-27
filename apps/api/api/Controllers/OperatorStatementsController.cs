using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Read-only. An OperatorStatement is generated alongside its OperatorSettlement by
    // SettlementGenerationService, from the same batch of PlatformLedger rows — see the design
    // note at the top of Services/SettlementGenerationService.cs for why these two are generated
    // together rather than as two independent periodic jobs. A statement is "what you'd show the
    // operator"; there's no legitimate reason for a client to be able to type one in by hand.
    // Admin/platform-Staff see every operator's statements; an operator's own Staff/Operator
    // account is scoped to its own operator's statements only (Piece 1), same reasoning as
    // OperatorSettlementsController.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorStatementsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? busOperatorId)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<OperatorStatementResponseDto>());
            }

            var query = db.OperatorStatements.AsQueryable();

            var callerOperatorId = await User.GetBusOperatorIdAsync(db);
            if (callerOperatorId != null)
            {
                query = query.Where(s => s.BusOperatorId == callerOperatorId.Value);
            }
            else if (busOperatorId.HasValue)
            {
                query = query.Where(s => s.BusOperatorId == busOperatorId.Value);
            }

            var items = await query.OrderByDescending(s => s.CreatedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.OperatorStatements
                .Include(s => s.Items)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await User.CanManageOperatorAsync(db, item.BusOperatorId)) return Forbid();
            return Ok(ToDetailResponseDto(item));
        }

        // No POST/PUT/DELETE — see the class comment above.

        private static OperatorStatementResponseDto ToResponseDto(OperatorStatement x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            StatementNo = x.StatementNo,
            FromDate = x.FromDate,
            ToDate = x.ToDate,
            PlatformPayableToOperator = x.PlatformPayableToOperator,
            OperatorPayableToPlatform = x.OperatorPayableToPlatform,
            NetAmount = x.NetAmount,
            NetDirection = x.NetDirection,
            Status = x.Status,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };

        private static OperatorStatementDetailResponseDto ToDetailResponseDto(OperatorStatement x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            StatementNo = x.StatementNo,
            FromDate = x.FromDate,
            ToDate = x.ToDate,
            PlatformPayableToOperator = x.PlatformPayableToOperator,
            OperatorPayableToPlatform = x.OperatorPayableToPlatform,
            NetAmount = x.NetAmount,
            NetDirection = x.NetDirection,
            Status = x.Status,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
            Items = x.Items.Select(i => new OperatorStatementItemResponseDto
            {
                Id = i.Id,
                OperatorStatementId = i.OperatorStatementId,
                BookingId = i.BookingId,
                TicketId = i.TicketId,
                PaymentId = i.PaymentId,
                RefundId = i.RefundId,
                PlatformLedgerId = i.PlatformLedgerId,
                ItemType = i.ItemType,
                SaleChannel = i.SaleChannel,
                DebitAmount = i.DebitAmount,
                CreditAmount = i.CreditAmount,
                Currency = i.Currency,
                Description = i.Description,
                CreatedAtUtc = i.CreatedAtUtc,
                UpdatedAtUtc = i.UpdatedAtUtc,
                RowVersion = i.RowVersion,
            }).ToList(),
        };
    }
}
