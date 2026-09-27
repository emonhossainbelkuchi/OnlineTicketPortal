using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Finance
{
    // A record of money WE paid OUT to the operator (the "PlatformPaysOperator" direction —
    // e.g. sending them their share of a week's online sales, minus our commission).
    public class OperatorPayout : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid? OperatorSettlementId { get; set; } // Which settlement run this payout is for.

        [MaxLength(50)]
        public string PayoutNo { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        public PayoutStatus Status { get; set; } = PayoutStatus.Pending;
        public DateTime? PaidAtUtc { get; set; }

        [MaxLength(120)]
        public string? BankTransactionReference { get; set; }

        [MaxLength(250)]
        public string? Notes { get; set; }

        public BusOperator BusOperator { get; set; } = default!;
        public OperatorSettlement? OperatorSettlement { get; set; }
    }
}
