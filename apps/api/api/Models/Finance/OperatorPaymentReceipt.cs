using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Finance
{
    // A record of money the OPERATOR paid TO US against one of their invoices (the
    // "OperatorPaysPlatform" direction — e.g. settling their counter-sale commission bill).
    public class OperatorPaymentReceipt : AuditableEntity
    {
        public Guid OperatorInvoiceId { get; set; }

        public DateTime ReceivedAtUtc { get; set; } = DateTime.UtcNow;
        public decimal Amount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        [MaxLength(120)]
        public string? ReferenceNo { get; set; }

        [MaxLength(250)]
        public string? Notes { get; set; }

        public OperatorInvoice OperatorInvoice { get; set; } = default!;
    }
}
