using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Payments;
using System;
using System.ComponentModel.DataAnnotations;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.Finance
{
    // This is the single "master diary" of every money event in the whole system — every
    // online sale, every commission we earn, every gateway fee, every refund, every payout —
    // one row each, and rows are NEVER edited or deleted once written (append-only).
    // Everything else under Models/Finance is just a different VIEW of this same diary:
    //   - OperatorWallet is a running-total CACHE for "what's the balance right now", kept in
    //     sync with this table by FinanceLedgerService, in the same save, every time.
    //   - OperatorStatementItem / OperatorSettlementItem are SNAPSHOTS — a printed summary of
    //     a group of these rows for one date range (see PlatformLedgerId on those tables,
    //     which points back to exactly which diary entries a summary line came from).
    // There's deliberately no running "balance" column on this table itself — a diary is meant
    // to just record what happened, in order; whoever wants "the balance right now" should add
    // up (Credit minus Debit) for that operator, or simply read OperatorWallet's cached total.
    public class PlatformLedger : AuditableEntity
    {
        public Guid? BookingId { get; set; }
        public Guid? PaymentId { get; set; }
        public Guid? RefundId { get; set; }
        public Guid? BusOperatorId { get; set; }

        // Filled in once this entry has been swept up into an actual settlement run.
        // Null means "happened, but not settled with the operator yet".
        public Guid? OperatorSettlementId { get; set; }

        [MaxLength(50)]
        public string LedgerNo { get; set; } = string.Empty;

        public StatementItemType ItemType { get; set; } // What KIND of money event this is (sale, commission, refund, etc).
        public SaleChannel? SaleChannel { get; set; }    // Online or Counter — which side of the business this belongs to.

        // Every entry is written from the OPERATOR's point of view, like a bank statement addressed to them:
        //   Credit = we now owe THEM more (e.g. we collected an online fare on their behalf).
        //   Debit  = THEY now owe US more (e.g. our commission, a gateway fee they're responsible
        //            for, or the per-ticket fee for using our ERP at their counter).
        public decimal DebitAmount { get; set; }
        public decimal CreditAmount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        [MaxLength(100)]
        public string? ReferenceNo { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        public Booking? Booking { get; set; }
        public Payment? Payment { get; set; }
        public Refund? Refund { get; set; }
        public BusOperator? BusOperator { get; set; }
        public OperatorSettlement? OperatorSettlement { get; set; }
    }
}
