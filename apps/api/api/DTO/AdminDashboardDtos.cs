using TicketPortal.Api.Models.Enums;

namespace TicketPortal.Api.DTO
{
    // Completion Plan v2, Chunk 9 ("Admin: server-side dashboard & reports").
    // GET /api/admin/dashboard/summary?from=&to=&operatorId= — Admin-only.
    //
    // Every number on this DTO is computed by a SQL aggregate query in
    // AdminDashboardController — nothing here is assembled by downloading full lists and
    // reducing them in the browser (that was the old console/pages/admin/Dashboard.tsx gap
    // this chunk replaces). The financial figures reuse the exact same PlatformLedger
    // ItemType/SaleChannel buckets as SettlementGenerationService, so this dashboard's numbers
    // always agree with a hand-checked settlement for the same period — see
    // ADMIN_DASHBOARD_DATA_MAP.md for the card-to-query mapping.
    public class AdminDashboardSummaryDto
    {
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public Guid? OperatorId { get; set; }

        // --- Platform shape (not date-ranged — this is "how many operators of each kind exist
        // right now", not an activity count) ---
        public List<OperatorModeCountDto> OperatorsByInventoryMode { get; set; } = new();

        // --- Activity in the selected period ---
        public List<BookingChannelStatusDto> BookingsByChannelAndStatus { get; set; } = new();

        // Concept §6.1 (online sale flow): gross fare collected into the platform's own
        // account before any deduction. Sourced from PlatformLedger.CreditAmount where
        // ItemType == OnlineTicketSale, exactly like OperatorSettlement.OnlineGrossAmount.
        public decimal OnlineGrossAmount { get; set; }
        public int OnlineBookingCount { get; set; }

        // Concept §6.2 (counter-sale flow): counter cash never touches the platform, so there
        // is no ledger "gross" for it (see SettlementGenerationService's own comment on
        // OfflineGrossAmount) — this is a real ticket count, not a money figure.
        public int CounterTicketCount { get; set; }

        // Commission earned, online and counter kept separate per the concept's "online
        // commission and counter commission are separate" definition-of-done item.
        public decimal OnlineCommissionEarned { get; set; }
        public decimal CounterCommissionEarned { get; set; }

        // Refunds, split the same way PlatformLedger records them: an online refund is a
        // Debit (platform money paid back to the customer); a counter-sale refund is the
        // commission reversal, posted as a Credit (see FinanceLedgerService.PostCounterSaleRefundAsync).
        public decimal OnlineRefundAmount { get; set; }
        public decimal CounterCommissionReversedAmount { get; set; }
        public int RefundCount { get; set; }

        public List<SettlementStatusBucketDto> SettlementsByStatus { get; set; } = new();
        public List<PayoutStatusBucketDto> PayoutsByStatus { get; set; } = new();

        // --- Operational alerts: current state, not limited to the selected date range
        // (an open complaint from last month still needs attention today) — except
        // IntegrationFailuresLast24h, which is deliberately a fixed rolling window regardless
        // of the from/to filter, per the chunk's own task wording. ---
        public int PendingCancellationRequests { get; set; }
        public int PendingRefunds { get; set; }
        public int OpenComplaints { get; set; }
        public int ActiveSeatHolds { get; set; }
        public int IntegrationFailuresLast24h { get; set; }
        public int PaymentsNeedingReconciliation { get; set; }
        public int BookingsAwaitingExternalConfirmation { get; set; }

        // One point per calendar day in [FromDate, ToDate] so the console can chart online
        // gross vs. counter tickets over time, split by channel.
        public List<DailyChannelPointDto> DailySeries { get; set; } = new();
    }

    public class OperatorModeCountDto
    {
        public OperatorInventoryMode Mode { get; set; }
        public int OperatorCount { get; set; }
    }

    public class BookingChannelStatusDto
    {
        public SaleChannel SaleChannel { get; set; }
        public BookingStatus Status { get; set; }
        public int Count { get; set; }
        public decimal GrandTotalSum { get; set; }
    }

    public class SettlementStatusBucketDto
    {
        public SettlementStatus Status { get; set; }
        public SettlementDirection Direction { get; set; }
        public int Count { get; set; }
        public decimal NetAmountSum { get; set; }
    }

    public class PayoutStatusBucketDto
    {
        public PayoutStatus Status { get; set; }
        public int Count { get; set; }
        public decimal AmountSum { get; set; }
    }

    public class DailyChannelPointDto
    {
        public DateOnly Date { get; set; }
        public decimal OnlineGrossAmount { get; set; }
        public int OnlineBookingCount { get; set; }
        public int CounterTicketCount { get; set; }
    }

    // GET /api/admin/dashboard/reports?from=&to=&operatorId= — Admin-only. Backs the
    // AnalyticsPage reports table + CSV export (Chunk 9 task 3). Same date-range/operator
    // filters and the same ledger formulas as the summary endpoint above, just shaped as flat
    // report rows instead of chart-ready buckets.
    public class AdminDashboardReportsDto
    {
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public Guid? OperatorId { get; set; }

        public List<OperatorSalesReportRowDto> SalesByOperator { get; set; } = new();
        public OnlineVsCounterSummaryDto OnlineVsCounter { get; set; } = new();
        public List<SettlementReportRowDto> Settlements { get; set; } = new();
    }

    public class OperatorSalesReportRowDto
    {
        public Guid BusOperatorId { get; set; }
        public string BusOperatorName { get; set; } = string.Empty;
        public OperatorInventoryMode InventoryMode { get; set; }

        public decimal OnlineGrossAmount { get; set; }
        public int OnlineBookingCount { get; set; }
        public decimal OnlineCommissionEarned { get; set; }

        public int CounterTicketCount { get; set; }
        public decimal CounterCommissionEarned { get; set; }

        // Debit (online refund) + Credit (counter-sale commission reversal) — same "exactly
        // one side is ever non-zero" reasoning as OperatorSettlement.RefundAmount.
        public decimal RefundAmount { get; set; }

        // Sum(CreditAmount - DebitAmount) across every PlatformLedger row posted for this
        // operator in the period — what SettlementGenerationService would net out if a
        // settlement were run right now for this exact range.
        public decimal NetAmount { get; set; }
    }

    public class OnlineVsCounterSummaryDto
    {
        public int OnlineBookingCount { get; set; }
        public decimal OnlineGrossAmount { get; set; }
        public decimal OnlineCommissionEarned { get; set; }
        public int CounterTicketCount { get; set; }
        public decimal CounterCommissionEarned { get; set; }
    }

    public class SettlementReportRowDto
    {
        public Guid Id { get; set; }
        public string SettlementNo { get; set; } = string.Empty;
        public Guid BusOperatorId { get; set; }
        public string BusOperatorName { get; set; } = string.Empty;
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public SettlementDirection Direction { get; set; }
        public SettlementStatus Status { get; set; }
        public decimal OnlineGrossAmount { get; set; }
        public decimal PlatformCharge { get; set; }
        public decimal RefundAmount { get; set; }
        public decimal NetAmount { get; set; }
    }
}
