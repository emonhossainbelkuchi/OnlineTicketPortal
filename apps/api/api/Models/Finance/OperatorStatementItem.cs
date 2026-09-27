using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Payments;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Finance
{
    // ONE line inside an OperatorStatement — e.g. "commission on booking #123: 50 BDT".
    // PlatformLedgerId links each line back to the exact diary entry (PlatformLedger row) it
    // was copied from, so a statement total can always be traced back to real, individual events.
    public class OperatorStatementItem : AuditableEntity
    {
        public Guid OperatorStatementId { get; set; }
        public Guid? BookingId { get; set; }
        public Guid? TicketId { get; set; }
        public Guid? PaymentId { get; set; }
        public Guid? RefundId { get; set; }

        // Which PlatformLedger row this line summarizes. Left empty only for a manual
        // adjustment that isn't tied to one specific ledger entry.
        public Guid? PlatformLedgerId { get; set; }

        public StatementItemType ItemType { get; set; }
        public SaleChannel SaleChannel { get; set; }

        // Debit = operator owes platform. Credit = platform owes operator. (Same convention as PlatformLedger.)
        public decimal DebitAmount { get; set; }
        public decimal CreditAmount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        [MaxLength(500)]
        public string? Description { get; set; }

        public OperatorStatement OperatorStatement { get; set; } = default!;
        public Booking? Booking { get; set; }
        public Ticket? Ticket { get; set; }
        public Payment? Payment { get; set; }
        public Refund? Refund { get; set; }
        public PlatformLedger? PlatformLedger { get; set; }
    }
}
