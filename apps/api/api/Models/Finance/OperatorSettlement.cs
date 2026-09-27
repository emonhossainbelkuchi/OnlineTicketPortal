using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Finance
{
    // The ACTUAL settlement run for one operator — this is where a statement's numbers turn
    // into a real "who pays who, how much, right now" action. This is the "add another
    // mechanism connecting online sale and offline sale and sort it out who will get how much"
    // piece from the business plan: OnlineGrossAmount and OfflineGrossAmount are combined,
    // fees/refunds are subtracted, and Direction says who owes who at the end.
    public class OperatorSettlement : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid? OperatorStatementId { get; set; } // Which statement this settlement was raised from.
        public Guid? OperatorInvoiceId { get; set; } // The bill this settlement is linked to, if any.

        [MaxLength(50)]
        public string SettlementNo { get; set; } = string.Empty;

        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }

        // Worked out AFTER netting what we owe them (online) against what they owe us
        // (counter commission, fees, refunds).
        public SettlementDirection Direction { get; set; } = SettlementDirection.PlatformPaysOperator;
        public SettlementStatus Status { get; set; } = SettlementStatus.Draft;

        public decimal OnlineGrossAmount { get; set; } // Total online fares in this period.
        public decimal OfflineGrossAmount { get; set; } // Total counter sales in this period (for commission calc only).
        public decimal PlatformCharge { get; set; } // Our commission for this period.
        public decimal GatewayCharge { get; set; }
        public decimal RefundAmount { get; set; }
        public decimal NetAmount { get; set; } // The final amount that actually changes hands.
        public DateTime? PaidAtUtc { get; set; }

        [MaxLength(300)]
        public string? Remarks { get; set; }

        public BusOperator BusOperator { get; set; } = default!;
        public OperatorStatement? OperatorStatement { get; set; }
        public OperatorInvoice? OperatorInvoice { get; set; }
        public ICollection<OperatorSettlementItem> Items { get; set; } = new List<OperatorSettlementItem>();
        public ICollection<PlatformLedger> LedgerEntries { get; set; } = new List<PlatformLedger>(); // The exact diary rows this settlement run closed out.
    }
}
