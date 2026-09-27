using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Finance
{
    // The formal BILL sent to (or by) an operator — "invoices or bill will be made at a
    // certain time interval" from the business plan. Direction says which way the money should
    // flow; Status tracks whether it's been paid yet.
    public class OperatorInvoice : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid? OperatorStatementId { get; set; }

        [MaxLength(50)]
        public string InvoiceNo { get; set; } = string.Empty;

        public DateOnly InvoiceDate { get; set; }
        public DateOnly? DueDate { get; set; }
        public SettlementDirection Direction { get; set; } // Who owes who on this particular invoice.
        public decimal Amount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

        public BusOperator BusOperator { get; set; } = default!;
        public OperatorStatement? OperatorStatement { get; set; }
        public ICollection<OperatorPaymentReceipt> PaymentReceipts { get; set; } = new List<OperatorPaymentReceipt>(); // Money actually received AGAINST this invoice (when the operator owes us).
        public ICollection<OperatorSettlement> Settlements { get; set; } = new List<OperatorSettlement>();
    }
}
