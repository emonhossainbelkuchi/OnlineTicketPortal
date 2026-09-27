using TicketPortal.Api.Authorization;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TicketPortal.Api.Controllers
{
    // RBAC Amendment v3 / Chunk 7 task 4 ("Missing-rule visibility") — see
    // Services/FinanceReconciliationService.cs for the full rationale. A new, narrowly-scoped
    // controller rather than new endpoints on an existing one, since the underlying query reads
    // across Bookings/Payments/PlatformLedgers/CommissionRules and doesn't belong to any single
    // existing resource.
    //
    // Both endpoints require Finance.Reconcile specifically — the one permission
    // PermissionMatrix.cs already grants to Platform Finance and nobody else (Operator
    // Finance/Manager only ever get Finance.ReadOwnOperator, a plain read permission; Admin needs
    // nothing named explicitly, since CurrentActor.HasPermission always returns true for an
    // Admin actor). Never Finance.ReadPlatform/Finance.ReadOwnOperator — re-posting a ledger
    // entry is a write with real money consequences, not a read, and per the RBAC matrix
    // reconciliation is a Platform Finance/Admin action, not something any operator-scoped
    // account (even their own Finance role) can trigger for themselves.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FinanceReconciliationController(
        FinanceReconciliationService reconciliationService,
        ICurrentActorService currentActor) : ControllerBase
    {
        [HttpGet("ledger-gaps")]
        public async Task<IActionResult> GetLedgerGaps([FromQuery] Guid? busOperatorId)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceReconcile)) return Forbid();

            var gaps = await reconciliationService.GetLedgerGapsAsync(busOperatorId);
            return Ok(gaps.Select(g => new LedgerGapResponseDto
            {
                BookingId = g.BookingId,
                Pnr = g.Pnr,
                BusOperatorId = g.BusOperatorId,
                SaleChannel = g.SaleChannel,
                GrandTotal = g.GrandTotal,
                Currency = g.Currency,
                ConfirmedAtUtc = g.ConfirmedAtUtc,
                Reason = g.Reason,
            }));
        }

        [HttpPost("ledger-gaps/{bookingId}/repost")]
        public async Task<IActionResult> Repost(Guid bookingId)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceReconcile)) return Forbid();

            try
            {
                await reconciliationService.RepostAsync(bookingId);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
