using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Read-only. OperatorWallet is a cached running balance — the model's own comment says
    // "FinanceLedgerService is the only code allowed to change these numbers". The old generic
    // PUT let any authenticated user set any operator's balance fields directly, which is as
    // close to "give yourself free money" as this codebase gets. Admin/platform-Staff see every
    // operator's wallet; an operator's own Staff/Operator account (Piece 1) is scoped to its own
    // operator's wallet only.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorWalletsController(AppDbContext db, ICurrentActorService currentActor) : ControllerBase
    {
        // RBAC Amendment v3 / Chunk 7 task 1 — same Finance.ReadPlatform / Finance.ReadOwnOperator
        // split as OperatorSettlementsController, applied to all three read endpoints below.
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var actor = await currentActor.ResolveAsync(User);
            var seesAllOperators = actor.HasPermission(Permissions.FinanceReadPlatform);
            if (!seesAllOperators && !actor.HasPermission(Permissions.FinanceReadOwnOperator))
            {
                return Ok(Array.Empty<OperatorWalletResponseDto>());
            }

            var query = db.OperatorWallets.AsQueryable();

            if (!seesAllOperators)
            {
                query = query.Where(w => w.BusOperatorId == actor.BusOperatorId);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceReadPlatform)
                && !actor.HasPermission(Permissions.FinanceReadOwnOperator))
            {
                return Forbid();
            }

            var item = await db.OperatorWallets.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await User.CanManageOperatorAsync(db, item.BusOperatorId)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        // Most callers know the operator, not the wallet's own surrogate id — this is the
        // lookup they actually want.
        [HttpGet("by-operator/{busOperatorId}")]
        public async Task<IActionResult> GetByOperator(Guid busOperatorId)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceReadPlatform)
                && !actor.HasPermission(Permissions.FinanceReadOwnOperator))
            {
                return Forbid();
            }
            if (!await User.CanManageOperatorAsync(db, busOperatorId)) return Forbid();

            var item = await db.OperatorWallets.FirstOrDefaultAsync(x => x.BusOperatorId == busOperatorId);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        // No POST/PUT/DELETE — see the class comment above. Every number here only ever moves
        // via FinanceLedgerService, in the same transaction as the ledger entry that justifies it.

        private static OperatorWalletResponseDto ToResponseDto(OperatorWallet x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            TotalOnlineSalesAmount = x.TotalOnlineSalesAmount,
            TotalCounterSalesAmount = x.TotalCounterSalesAmount,
            PendingSettlementBalance = x.PendingSettlementBalance,
            AvailablePayoutBalance = x.AvailablePayoutBalance,
            WithdrawnAmount = x.WithdrawnAmount,
            TotalPlatformCommission = x.TotalPlatformCommission,
            TotalGatewayCharge = x.TotalGatewayCharge,
            OperatorReceivableFromPlatform = x.OperatorReceivableFromPlatform,
            PlatformReceivableFromOperator = x.PlatformReceivableFromOperator,
            LastStatementDateUtc = x.LastStatementDateUtc,
            LastSettlementDateUtc = x.LastSettlementDateUtc,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
