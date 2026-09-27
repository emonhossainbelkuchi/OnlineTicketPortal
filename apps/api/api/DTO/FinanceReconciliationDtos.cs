// RBAC Amendment v3 / Chunk 7 task 4 ("Missing-rule visibility"). See
// Services/FinanceReconciliationService.cs for the full rationale — this is the read/write
// shape for the "confirmed bookings with no ledger rows" list and its safe re-post action.

using TicketPortal.Api.Models.Enums;

namespace TicketPortal.Api.DTO
{
    // One row of GET /api/financereconciliation/ledger-gaps.
    public class LedgerGapResponseDto
    {
        public Guid BookingId { get; set; }
        public string Pnr { get; set; } = string.Empty;
        public Guid BusOperatorId { get; set; }
        public SaleChannel SaleChannel { get; set; }
        public decimal GrandTotal { get; set; }
        public string Currency { get; set; } = "BDT";
        public DateTime ConfirmedAtUtc { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}
