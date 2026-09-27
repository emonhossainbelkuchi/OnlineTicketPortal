using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Finance;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // OperatorSettlement is the internal record of a completed settlement run — every field on
    // it (the gross/charge/net breakdown, which ledger rows it closed out) is computed from
    // real PlatformLedger rows, not something a client should ever be trusted to type in
    // directly. The old generic CRUD let any authenticated user fabricate a settlement (and its
    // "NetAmount") out of thin air, or edit a real one after the fact — this is now generated
    // exclusively by SettlementGenerationService (see that file for the full design rationale).
    //
    // Admin/platform-Staff see every operator's settlements. An operator's own Staff/Operator
    // account (StaffProfile.BusOperatorId set) only sees/generates its own operator's
    // settlements — the "see your own settlements" follow-up this class comment used to defer,
    // now that Piece 1 wires up the scoping (User.GetBusOperatorIdAsync / CanManageOperatorAsync).
    //
    // Approve is the one exception: it's platform-only regardless of which operator the
    // settlement is for (see the comment on Approve below) — generating a settlement and
    // signing off on it are different levels of trust, even for the operator's own record.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorSettlementsController(
        AppDbContext db,
        SettlementGenerationService settlementGenerationService,
        ICurrentActorService currentActor) : ControllerBase
    {
        // RBAC Amendment v3 / Chunk 7 task 1 ("Fix finance access mismatch") — GetAll/GetById
        // only; Generate/Approve below are untouched (read scoping is Chunk 7's owner scope for
        // this controller, not the write/workflow endpoints). A raw IsInRole("Staff") let ANY
        // platform staff account see every operator's settlements, and IsInRole("Operator") let
        // any operator-scoped account (even counter staff with no finance permission at all) see
        // their own operator's — neither matches PermissionMatrix.cs. Finance.ReadPlatform
        // (Platform Finance/Admin) sees every operator; Finance.ReadOwnOperator (Operator
        // Manager/BusOwner/Finance) is forced to their own operator regardless of what
        // busOperatorId the request asks for.
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? busOperatorId)
        {
            var actor = await currentActor.ResolveAsync(User);
            var seesAllOperators = actor.HasPermission(Permissions.FinanceReadPlatform);
            if (!seesAllOperators && !actor.HasPermission(Permissions.FinanceReadOwnOperator))
            {
                return Ok(Array.Empty<OperatorSettlementResponseDto>());
            }

            var query = db.OperatorSettlements.AsQueryable();

            if (!seesAllOperators)
            {
                // Operator-scoped caller: always their own operator, regardless of what the
                // busOperatorId query param asks for.
                query = query.Where(s => s.BusOperatorId == actor.BusOperatorId);
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
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceReadPlatform)
                && !actor.HasPermission(Permissions.FinanceReadOwnOperator))
            {
                return Forbid();
            }

            var item = await db.OperatorSettlements
                .Include(s => s.Items)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await User.CanManageOperatorAsync(db, item.BusOperatorId)) return Forbid();
            return Ok(ToDetailResponseDto(item));
        }

        // Runs the batch process for one operator + date range — see
        // Services/SettlementGenerationService.cs. Replaces the old generic POST entirely.
        [HttpPost("generate")]
        public async Task<IActionResult> Generate(SettlementGenerateDto dto)
        {
            if (!await User.CanManageOperatorAsync(db, dto.BusOperatorId)) return Forbid();

            try
            {
                // settlement.Items is already populated in memory by the service — same
                // DbContext instance for this request, no extra round trip needed.
                var settlement = await settlementGenerationService.GenerateSettlementAsync(
                    dto.BusOperatorId, dto.FromDate, dto.ToDate, dto.Remarks);

                return CreatedAtAction(nameof(GetById), new { id = settlement.Id }, ToDetailResponseDto(settlement));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Staff sign-off — Draft -> Approved. No money moves here (see the service for why),
        // but it's still the counterparty's own transaction being signed off, so this is
        // platform-only (Admin or our own platform staff) rather than CanManageOperatorAsync —
        // the operator being settled with should not be the one approving their own settlement,
        // even though the figures themselves are computed server-side and can't be fabricated.
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> Approve(Guid id, SettlementApproveDto dto)
        {
            var settlement = await db.OperatorSettlements.FirstOrDefaultAsync(x => x.Id == id);
            if (settlement == null) return NotFound();
            if (!await User.IsPlatformStaffOrAdminAsync(db)) return Forbid();

            try
            {
                await settlementGenerationService.ApproveAsync(id, dto.Remarks);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // No generic POST/PUT/DELETE on purpose — see the class comment above.

        private static OperatorSettlementResponseDto ToResponseDto(OperatorSettlement x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            OperatorStatementId = x.OperatorStatementId,
            OperatorInvoiceId = x.OperatorInvoiceId,
            SettlementNo = x.SettlementNo,
            FromDate = x.FromDate,
            ToDate = x.ToDate,
            Direction = x.Direction,
            Status = x.Status,
            OnlineGrossAmount = x.OnlineGrossAmount,
            OfflineGrossAmount = x.OfflineGrossAmount,
            PlatformCharge = x.PlatformCharge,
            GatewayCharge = x.GatewayCharge,
            RefundAmount = x.RefundAmount,
            NetAmount = x.NetAmount,
            PaidAtUtc = x.PaidAtUtc,
            Remarks = x.Remarks,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };

        private static OperatorSettlementDetailResponseDto ToDetailResponseDto(OperatorSettlement x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            OperatorStatementId = x.OperatorStatementId,
            OperatorInvoiceId = x.OperatorInvoiceId,
            SettlementNo = x.SettlementNo,
            FromDate = x.FromDate,
            ToDate = x.ToDate,
            Direction = x.Direction,
            Status = x.Status,
            OnlineGrossAmount = x.OnlineGrossAmount,
            OfflineGrossAmount = x.OfflineGrossAmount,
            PlatformCharge = x.PlatformCharge,
            GatewayCharge = x.GatewayCharge,
            RefundAmount = x.RefundAmount,
            NetAmount = x.NetAmount,
            PaidAtUtc = x.PaidAtUtc,
            Remarks = x.Remarks,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
            Items = x.Items.Select(i => new OperatorSettlementItemResponseDto
            {
                Id = i.Id,
                OperatorSettlementId = i.OperatorSettlementId,
                BookingId = i.BookingId,
                TicketId = i.TicketId,
                PlatformLedgerId = i.PlatformLedgerId,
                ItemType = i.ItemType,
                SaleChannel = i.SaleChannel,
                TicketFare = i.TicketFare,
                PlatformCharge = i.PlatformCharge,
                GatewayCharge = i.GatewayCharge,
                RefundAmount = i.RefundAmount,
                NetAmount = i.NetAmount,
                CreatedAtUtc = i.CreatedAtUtc,
                UpdatedAtUtc = i.UpdatedAtUtc,
                RowVersion = i.RowVersion,
            }).ToList(),
        };
    }
}
