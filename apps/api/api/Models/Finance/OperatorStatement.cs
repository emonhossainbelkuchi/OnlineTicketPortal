using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Finance
{
    // A calculated summary of one operator's activity over a period (e.g. one week) — this is
    // the "how much commission we make and how much due they have" figure the business plan
    // describes, worked out and frozen in time. It's a REPORT built from PlatformLedger, not a
    // new source of truth — see OperatorStatementItem for exactly which ledger rows it's built from.
    public class OperatorStatement : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }

        [MaxLength(50)]
        public string StatementNo { get; set; } = string.Empty;

        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public decimal PlatformPayableToOperator { get; set; } // What we owe them for this period (mostly online sales).
        public decimal OperatorPayableToPlatform { get; set; } // What they owe us for this period (mostly counter commission).
        public decimal NetAmount { get; set; } // The two numbers above, netted into one final figure.
        public SettlementDirection NetDirection { get; set; } = SettlementDirection.PlatformPaysOperator; // Who actually ends up paying who.
        public SettlementStatus Status { get; set; } = SettlementStatus.Draft;

        public BusOperator BusOperator { get; set; } = default!;
        public ICollection<OperatorStatementItem> Items { get; set; } = new List<OperatorStatementItem>(); // The line-by-line breakdown behind the totals above.
        public ICollection<OperatorSettlement> Settlements { get; set; } = new List<OperatorSettlement>(); // The actual settlement run(s) raised against this statement.
    }
}
