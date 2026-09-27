using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Finance;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Services
{
    // This is the "figure out what we owe each operator and pay them" batch process from the
    // business plan (section 6 — "invoices or bill will be made at a certain time interval").
    // Before this existed, PlatformLedger (the diary) and OperatorWallet (the running balance)
    // were both written correctly by FinanceLedgerService, but nothing ever turned a date range
    // of diary rows into an actual settlement — PendingSettlementBalance only ever grew, forever.
    //
    // Design note on Statement vs. Settlement (flagged in the completion plan as needing a
    // "quick design conversation" before building both): the models suggest OperatorStatement
    // is meant to be its own independent generation step that an OperatorSettlement is later
    // "raised from" (OperatorStatement.Settlements is a one-to-many). Building two independent
    // periodic-aggregation code paths over the same ledger risks them drifting out of sync with
    // no way to reconcile them, so this service generates both together, from the exact same
    // batch of ledger rows, in the same transaction — the statement is "what you'd show the
    // operator", the settlement is "the internal record of what got paid", but they're always
    // in lock-step because they're built from one query. If the team wants a statement to exist
    // as a preview *before* a settlement is finalized (e.g. so staff can review before money
    // moves), split a GenerateStatementAsync out to run standalone over unstamped ledger rows,
    // and change GenerateSettlementAsync to take an existing OperatorStatementId instead of a
    // date range.
    //
    // This class is the only place allowed to create OperatorSettlement/OperatorSettlementItem/
    // OperatorStatement/OperatorStatementItem rows, and the only place (besides
    // FinanceLedgerService itself) allowed to stamp PlatformLedger.OperatorSettlementId or move
    // OperatorWallet.PendingSettlementBalance into AvailablePayoutBalance.
    public class SettlementGenerationService
    {
        private readonly AppDbContext _db;

        public SettlementGenerationService(AppDbContext db)
        {
            _db = db;
        }

        // Given an operator and a date range: pulls every PlatformLedger row for that operator
        // that hasn't been swept into a settlement yet (OperatorSettlementId == null) and falls
        // inside the range, builds one OperatorStatement + OperatorSettlement (each with one
        // line item per ledger row), stamps OperatorSettlementId back onto those ledger rows so
        // they're never picked up again, and moves the settled net amount out of
        // PendingSettlementBalance — into AvailablePayoutBalance if the platform owes the
        // operator, or onto a newly-raised OperatorInvoice if the operator owes the platform.
        //
        // Throws InvalidOperationException if there's nothing unsettled in range (this is what
        // makes re-running the same range a safe no-op at the controller level — the second call
        // gets a clean 400 instead of a duplicate, empty settlement).
        public async Task<OperatorSettlement> GenerateSettlementAsync(
            Guid busOperatorId, DateOnly fromDate, DateOnly toDate, string? remarks = null)
        {
            if (toDate < fromDate)
            {
                throw new InvalidOperationException("ToDate cannot be before FromDate.");
            }

            var walletExists = await _db.OperatorWallets.AnyAsync(w => w.BusOperatorId == busOperatorId);
            if (!walletExists)
            {
                throw new InvalidOperationException(
                    $"No OperatorWallet exists for operator {busOperatorId}. Create one when the operator is onboarded.");
            }

            // Ledger rows are timestamped with CreatedAtUtc, not a separate "transaction date" —
            // so the range is applied against that. ToDate is inclusive of the whole calendar day.
            var fromUtc = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var toExclusiveUtc = toDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            await using var transaction = await _db.Database.BeginTransactionAsync();

            var ledgerRows = await _db.PlatformLedgers
                .Where(l => l.BusOperatorId == busOperatorId
                    && l.OperatorSettlementId == null
                    && l.CreatedAtUtc >= fromUtc
                    && l.CreatedAtUtc < toExclusiveUtc)
                .OrderBy(l => l.CreatedAtUtc)
                .ToListAsync();

            if (ledgerRows.Count == 0)
            {
                throw new InvalidOperationException(
                    $"No unsettled ledger entries for operator {busOperatorId} between {fromDate:yyyy-MM-dd} and {toDate:yyyy-MM-dd}.");
            }

            var netAmount = ledgerRows.Sum(l => l.CreditAmount - l.DebitAmount);
            var direction = netAmount switch
            {
                > 0 => SettlementDirection.PlatformPaysOperator,
                < 0 => SettlementDirection.OperatorPaysPlatform,
                _ => SettlementDirection.NetZero
            };
            var currency = ledgerRows[0].Currency;

            // --- Statement: the report you'd show the operator ---
            var statement = new OperatorStatement
            {
                BusOperatorId = busOperatorId,
                StatementNo = NewDocumentNumber("STM"),
                FromDate = fromDate,
                ToDate = toDate,
                PlatformPayableToOperator = ledgerRows.Sum(l => l.CreditAmount),
                OperatorPayableToPlatform = ledgerRows.Sum(l => l.DebitAmount),
                NetAmount = netAmount,
                NetDirection = direction,
                Status = SettlementStatus.Draft,
            };

            foreach (var l in ledgerRows)
            {
                statement.Items.Add(new OperatorStatementItem
                {
                    OperatorStatementId = statement.Id,
                    BookingId = l.BookingId,
                    PaymentId = l.PaymentId,
                    RefundId = l.RefundId,
                    PlatformLedgerId = l.Id,
                    ItemType = l.ItemType,
                    SaleChannel = l.SaleChannel ?? SaleChannel.Online,
                    DebitAmount = l.DebitAmount,
                    CreditAmount = l.CreditAmount,
                    Currency = l.Currency,
                    Description = l.Description,
                });
            }

            // --- Settlement: the internal record of what actually gets paid ---
            var settlement = new OperatorSettlement
            {
                BusOperatorId = busOperatorId,
                OperatorStatementId = statement.Id,
                SettlementNo = NewDocumentNumber("STL"),
                FromDate = fromDate,
                ToDate = toDate,
                Direction = direction,
                Status = SettlementStatus.Draft,
                OnlineGrossAmount = ledgerRows
                    .Where(l => l.ItemType == StatementItemType.OnlineTicketSale)
                    .Sum(l => l.CreditAmount),
                // No dedicated ledger entry records a counter sale's gross fare — cash never
                // touches the platform, so only the commission on it is ever posted (see
                // FinanceLedgerService.PostCounterSaleCommissionAsync). This is left at 0 rather
                // than guessed at; flagging it here since "OfflineGrossAmount" reads like it
                // should be populated. If the business wants the true counter-sale gross tracked,
                // that needs a new posting call at the point of counter sale, not a settlement-time
                // computation — there's nothing in the ledger to derive it from today.
                OfflineGrossAmount = 0m,
                PlatformCharge = ledgerRows
                    .Where(l => l.ItemType is StatementItemType.PlatformCommission or StatementItemType.CounterSaleCommission)
                    .Sum(l => l.DebitAmount),
                GatewayCharge = ledgerRows
                    .Where(l => l.ItemType == StatementItemType.GatewayCharge)
                    .Sum(l => l.DebitAmount),
                RefundAmount = ledgerRows
                    .Where(l => l.ItemType == StatementItemType.Refund)
                    // A Refund row is a debit for an online refund (platform money paying the
                    // customer back) but a credit for a counter-sale refund reversal (the
                    // operator's commission being handed back — see
                    // FinanceLedgerService.PostCounterSaleRefundAsync). Exactly one side is ever
                    // non-zero for a given row, so summing both captures either direction.
                    .Sum(l => l.DebitAmount + l.CreditAmount),
                NetAmount = netAmount,
                Remarks = remarks,
            };

            foreach (var l in ledgerRows)
            {
                var (ticketFare, platformCharge, gatewayCharge, refundAmount) = MapSettlementBuckets(l);

                settlement.Items.Add(new OperatorSettlementItem
                {
                    OperatorSettlementId = settlement.Id,
                    BookingId = l.BookingId,
                    PlatformLedgerId = l.Id,
                    ItemType = l.ItemType,
                    SaleChannel = l.SaleChannel ?? SaleChannel.Online,
                    TicketFare = ticketFare,
                    PlatformCharge = platformCharge,
                    GatewayCharge = gatewayCharge,
                    RefundAmount = refundAmount,
                    NetAmount = l.CreditAmount - l.DebitAmount,
                });

                // Stamp it — this is what makes re-running the same (or an overlapping) range
                // a no-op: the next query's `OperatorSettlementId == null` filter excludes it.
                l.OperatorSettlementId = settlement.Id;
            }

            // If the operator owes the platform net for this period, raise the bill for it now —
            // otherwise this debt just sits invisibly in the wallet forever with no document a
            // staff member can hand the operator or mark paid against (see
            // OperatorInvoicesController / InvoicePaymentService for how it gets settled).
            if (direction == SettlementDirection.OperatorPaysPlatform)
            {
                var invoice = new OperatorInvoice
                {
                    BusOperatorId = busOperatorId,
                    OperatorStatementId = statement.Id,
                    InvoiceNo = NewDocumentNumber("INV"),
                    InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    // 14 days is a reasonable default payment window absent a real contract
                    // term for this — OperatorContract.SettlementIntervalDays governs how often
                    // settlements run, not how long an operator has to pay one, so there's no
                    // existing field to read this from.
                    DueDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(14),
                    Direction = SettlementDirection.OperatorPaysPlatform,
                    Amount = -netAmount,
                    Currency = currency,
                    Status = InvoiceStatus.Draft,
                };
                _db.OperatorInvoices.Add(invoice);
                settlement.OperatorInvoiceId = invoice.Id;
            }

            _db.OperatorStatements.Add(statement);
            _db.OperatorSettlements.Add(settlement);

            // The batch's net contribution to the wallet's running total is removed from
            // "pending" now that it's been swept into a settlement. Only add to
            // AvailablePayoutBalance when the platform actually owes the operator — an
            // OperatorPaysPlatform batch has nothing to pay out, it just moves from "pending"
            // to "invoiced" (tracked via the OperatorInvoice created above from here on).
            var payoutDelta = netAmount > 0 ? netAmount : 0m;
            var now = DateTime.UtcNow;
            await _db.OperatorWallets
                .Where(w => w.BusOperatorId == busOperatorId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(w => w.PendingSettlementBalance, w => w.PendingSettlementBalance - netAmount)
                    .SetProperty(w => w.AvailablePayoutBalance, w => w.AvailablePayoutBalance + payoutDelta)
                    .SetProperty(w => w.LastSettlementDateUtc, w => now)
                    .SetProperty(w => w.LastStatementDateUtc, w => now));

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return settlement;
        }

        // Staff sign-off after reviewing a generated settlement. No money moves here — that
        // already happened at generation time (see the wallet update above); this is purely the
        // audit trail step the SettlementStatus lifecycle (Draft -> Approved -> ...) calls for.
        public async Task ApproveAsync(Guid settlementId, string? remarks)
        {
            var settlement = await _db.OperatorSettlements.FirstOrDefaultAsync(s => s.Id == settlementId)
                ?? throw new InvalidOperationException($"Settlement {settlementId} does not exist.");

            if (settlement.Status != SettlementStatus.Draft)
            {
                throw new InvalidOperationException(
                    $"Settlement {settlementId} is {settlement.Status}; only a Draft settlement can be approved.");
            }

            settlement.Status = SettlementStatus.Approved;
            settlement.UpdatedAtUtc = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(remarks))
            {
                settlement.Remarks = string.IsNullOrWhiteSpace(settlement.Remarks)
                    ? remarks
                    : $"{settlement.Remarks} | {remarks}";
            }

            await _db.SaveChangesAsync();
        }

        // Maps one ledger row onto the settlement-item "bucket" fields it belongs in.
        // CancellationFee/ManualAdjustment/Tax/Payout rows have no dedicated bucket on this line
        // — they still count fully in NetAmount (set by the caller from Credit - Debit), just not
        // broken out into TicketFare/PlatformCharge/GatewayCharge/RefundAmount individually.
        private static (decimal ticketFare, decimal platformCharge, decimal gatewayCharge, decimal refundAmount)
            MapSettlementBuckets(PlatformLedger l) => l.ItemType switch
            {
                StatementItemType.OnlineTicketSale => (l.CreditAmount, 0m, 0m, 0m),
                StatementItemType.PlatformCommission => (0m, l.DebitAmount, 0m, 0m),
                StatementItemType.CounterSaleCommission => (0m, l.DebitAmount, 0m, 0m),
                StatementItemType.GatewayCharge => (0m, 0m, l.DebitAmount, 0m),
                // Debit for an online refund, credit for a counter-sale refund reversal — see
                // the comment on OperatorSettlement.RefundAmount above. Exactly one is non-zero.
                StatementItemType.Refund => (0m, 0m, 0m, l.DebitAmount + l.CreditAmount),
                _ => (0m, 0m, 0m, 0m),
            };

        private static string NewDocumentNumber(string prefix) =>
            $"{prefix}-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
    }
}
