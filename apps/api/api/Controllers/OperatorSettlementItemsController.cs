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
    // Read-only. Every row here is written by SettlementGenerationService as part of generating
    // its parent OperatorSettlement — see Services/SettlementGenerationService.cs. The old
    // generic CRUD let any authenticated user fabricate or edit a settlement line item
    // (TicketFare, PlatformCharge, etc.) with no connection to a real ledger entry at all.
    // Admin/platform-Staff see every operator's settlement items; an operator's own Staff/
    // Operator account (Piece 1) is scoped to its own operator's items only. This entity has no
    // BusOperatorId of its own, so scoping always joins through OperatorSettlement.BusOperatorId.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorSettlementItemsController(AppDbContext db, ICurrentActorService currentActor) : ControllerBase
    {
        // RBAC Amendment v3 / Chunk 7 task 1 — same Finance.ReadPlatform / Finance.ReadOwnOperator
        // split as OperatorSettlementsController (this entity has no BusOperatorId of its own, so
        // scoping always joins through OperatorSettlement.BusOperatorId).
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? operatorSettlementId)
        {
            var actor = await currentActor.ResolveAsync(User);
            var seesAllOperators = actor.HasPermission(Permissions.FinanceReadPlatform);
            if (!seesAllOperators && !actor.HasPermission(Permissions.FinanceReadOwnOperator))
            {
                return Ok(Array.Empty<OperatorSettlementItemResponseDto>());
            }

            var query = db.OperatorSettlementItems.AsQueryable();
            if (operatorSettlementId.HasValue)
            {
                query = query.Where(i => i.OperatorSettlementId == operatorSettlementId.Value);
            }

            if (!seesAllOperators)
            {
                query = query.Where(i => db.OperatorSettlements.Any(s =>
                    s.Id == i.OperatorSettlementId && s.BusOperatorId == actor.BusOperatorId));
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

            var item = await db.OperatorSettlementItems.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var operatorId = await db.OperatorSettlements
                .Where(s => s.Id == item.OperatorSettlementId)
                .Select(s => (Guid?)s.BusOperatorId)
                .FirstOrDefaultAsync();
            if (operatorId == null || !await User.CanManageOperatorAsync(db, operatorId.Value)) return Forbid();

            return Ok(ToResponseDto(item));
        }

        // No POST/PUT/DELETE — see the class comment above.

        private static OperatorSettlementItemResponseDto ToResponseDto(OperatorSettlementItem x) => new()
        {
            Id = x.Id,
            OperatorSettlementId = x.OperatorSettlementId,
            BookingId = x.BookingId,
            TicketId = x.TicketId,
            PlatformLedgerId = x.PlatformLedgerId,
            ItemType = x.ItemType,
            SaleChannel = x.SaleChannel,
            TicketFare = x.TicketFare,
            PlatformCharge = x.PlatformCharge,
            GatewayCharge = x.GatewayCharge,
            RefundAmount = x.RefundAmount,
            NetAmount = x.NetAmount,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
