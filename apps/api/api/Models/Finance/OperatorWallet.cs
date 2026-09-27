using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using System;

namespace TicketPortal.Api.Models.Finance
{
    // The fast-read "current balance" snapshot for ONE operator — one row per operator. This
    // is a CACHE, not the real source of truth: every number here should always match what you'd
    // get by summing up that operator's rows in PlatformLedger. FinanceLedgerService is the
    // only code allowed to change these numbers, and it always updates this row in the very
    // same transaction as the ledger entry that justifies the change, so the two can never
    // drift apart.
    public class OperatorWallet : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }

        public decimal TotalOnlineSalesAmount { get; set; }   // Running total of online fares collected for them.
        public decimal TotalCounterSalesAmount { get; set; }  // Running total of their counter sales (for commission billing only — the cash itself never touches us).
        public decimal PendingSettlementBalance { get; set; } // Net amount not yet included in a finished settlement.
        public decimal AvailablePayoutBalance { get; set; }   // What's actually ready to be paid out to them right now.
        public decimal WithdrawnAmount { get; set; }          // Total already paid out historically.
        public decimal TotalPlatformCommission { get; set; }  // Our total earnings from this operator so far.
        public decimal TotalGatewayCharge { get; set; }
        // NOTE: despite reading like a live "right now" balance, these two are lifetime
        // accumulators — FinanceLedgerService.ApplyWalletDeltaAsync only ever adds to them,
        // and nothing in the codebase (not SettlementGenerationService, not
        // InvoicePaymentService.RecordReceiptAsync) ever subtracts from them once money is
        // actually settled or an invoice is paid. For the real, currently-owed figure use
        // PendingSettlementBalance (nets to zero as settlements sweep it) together with
        // AvailablePayoutBalance/WithdrawnAmount on the "we owe them" side, or an operator's
        // unpaid OperatorInvoice rows on the "they owe us" side. Deliberately left as
        // accumulators rather than retrofitted into live balances here — see
        // InvoicePaymentService.RecordReceiptAsync for the reasoning.
        public decimal OperatorReceivableFromPlatform { get; set; } // Lifetime total of what the platform has ever owed this operator from online sales — NOT a live balance.
        public decimal PlatformReceivableFromOperator { get; set; } // Lifetime total of what this operator has ever owed the platform (e.g. counter commission) — NOT a live balance.
        public DateTime? LastStatementDateUtc { get; set; }
        public DateTime? LastSettlementDateUtc { get; set; }
        public bool IsActive { get; set; } = true;

        public BusOperator BusOperator { get; set; } = default!;
    }
}
