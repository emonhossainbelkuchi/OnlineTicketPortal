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
    // Records the operator actually paying one of their invoices. Staff-confirmed only — the
    // old generic CRUD let any authenticated user record an arbitrary payment (or edit/delete a
    // real one afterward) against any operator's invoice. Recording a receipt now goes through
    // InvoicePaymentService.RecordReceiptAsync, which recomputes the parent invoice's Status
    // from the real total received rather than trusting a client value. Once recorded, a receipt
    // is never edited or deleted — same "financial trail" reasoning as PlatformLedger.
    //
    // Reads: Admin/platform-Staff see every operator's receipts; an operator's own
    // Staff/Operator account (Piece 1) is scoped to its own operator's receipts only. This
    // entity has no BusOperatorId of its own, so scoping always joins through
    // OperatorInvoice.BusOperatorId.
    //
    // Writes: Create is Admin/platform-Staff ONLY, not scoped down to the operator's own
    // account — see the comment on Create for why letting the operator confirm their own
    // payment receipt is a real hole, not just an access nicety.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorPaymentReceiptsController(
        AppDbContext db,
        InvoicePaymentService invoicePaymentService,
        ICurrentActorService currentActor) : ControllerBase
    {
        // RBAC Amendment v3 / Chunk 7 task 1 — GetAll/GetById only; Create below is untouched
        // (still platform-staff/Admin only, unrelated to this fix). Same Finance.ReadPlatform /
        // Finance.ReadOwnOperator split as OperatorSettlementsController.
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? operatorInvoiceId)
        {
            var actor = await currentActor.ResolveAsync(User);
            var seesAllOperators = actor.HasPermission(Permissions.FinanceReadPlatform);
            if (!seesAllOperators && !actor.HasPermission(Permissions.FinanceReadOwnOperator))
            {
                return Ok(Array.Empty<OperatorPaymentReceiptResponseDto>());
            }

            var query = db.OperatorPaymentReceipts.AsQueryable();
            if (operatorInvoiceId.HasValue)
            {
                query = query.Where(r => r.OperatorInvoiceId == operatorInvoiceId.Value);
            }

            if (!seesAllOperators)
            {
                query = query.Where(r => db.OperatorInvoices.Any(i =>
                    i.Id == r.OperatorInvoiceId && i.BusOperatorId == actor.BusOperatorId));
            }

            var items = await query.OrderByDescending(r => r.ReceivedAtUtc).ToListAsync();
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

            var item = await db.OperatorPaymentReceipts.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item.OperatorInvoiceId)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        // Platform-confirmed only. This receipt is the sole record of whether an invoice the
        // operator owes the platform has actually been paid (see InvoicePaymentService's class
        // comment) — letting the operator's OWN staff record it would let them zero out their
        // own debt with a self-supplied ReferenceNo and no independent verification that money
        // really moved. CanManageOperatorAsync (used everywhere else in this controller for
        // read access) deliberately is NOT used here for that reason; only Admin or our own
        // platform staff (StaffProfile.BusOperatorId == null) may record a receipt.
        [HttpPost]
        public async Task<IActionResult> Create(OperatorPaymentReceiptCreateDto dto)
        {
            if (!await User.IsPlatformStaffOrAdminAsync(db)) return Forbid();

            var invoiceExists = await db.OperatorInvoices.AnyAsync(i => i.Id == dto.OperatorInvoiceId);
            if (!invoiceExists) return NotFound(new { message = "OperatorInvoice not found." });

            try
            {
                var receipt = await invoicePaymentService.RecordReceiptAsync(
                    dto.OperatorInvoiceId, dto.Amount, dto.Currency, dto.ReferenceNo, dto.Notes);
                return CreatedAtAction(nameof(GetById), new { id = receipt.Id }, ToResponseDto(receipt));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // No PUT/DELETE on purpose — see the class comment above.

        // Resolves the parent OperatorInvoice's BusOperatorId, then defers to the one shared
        // CanManageOperatorAsync (Piece 2) — same shape as RefundsController's join through
        // Booking.
        private async Task<bool> CanAccessAsync(Guid operatorInvoiceId)
        {
            var operatorId = await db.OperatorInvoices
                .Where(i => i.Id == operatorInvoiceId)
                .Select(i => (Guid?)i.BusOperatorId)
                .FirstOrDefaultAsync();
            return operatorId != null && await User.CanManageOperatorAsync(db, operatorId.Value);
        }

        private static OperatorPaymentReceiptResponseDto ToResponseDto(OperatorPaymentReceipt x) => new()
        {
            Id = x.Id,
            OperatorInvoiceId = x.OperatorInvoiceId,
            ReceivedAtUtc = x.ReceivedAtUtc,
            Amount = x.Amount,
            Currency = x.Currency,
            ReferenceNo = x.ReferenceNo,
            Notes = x.Notes,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
