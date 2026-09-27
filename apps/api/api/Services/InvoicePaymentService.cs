using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Finance;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Services
{
    // The counter-sale billing side: an OperatorInvoice is the bill (usually raised
    // automatically by SettlementGenerationService when an operator owes the platform net for a
    // period, but can also be raised by hand); an OperatorPaymentReceipt records the operator
    // actually paying it. This is the only place allowed to record a receipt or move an
    // invoice's Status — before this existed, both controllers let a client set Status straight
    // to Paid with no receipts behind it at all.
    //
    // Deliberately does NOT touch OperatorWallet or PlatformLedger. The debt this invoice bills
    // for was already removed from PendingSettlementBalance the moment the settlement that
    // raised it was generated (see SettlementGenerationService) — from that point on, the
    // invoice/receipt trail is the sole record of whether it's actually been paid.
    //
    // Decided, not just flagged: OperatorWallet.PlatformReceivableFromOperator (and its
    // counterpart OperatorReceivableFromPlatform) are documented lifetime accumulators — see
    // the field comments on OperatorWallet — only ever added to by
    // FinanceLedgerService.ApplyWalletDeltaAsync, never reduced anywhere, including by
    // SettlementGenerationService when the exact same debt is swept out of
    // PendingSettlementBalance. Making RecordReceiptAsync the first and only code to subtract
    // from that field would give it subtraction semantics nothing else in the codebase honors,
    // on a file (FinanceLedgerService) the completion plan says not to edit — a worse
    // inconsistency than leaving it as an accumulator. If a live "currently receivable" number
    // is ever needed, derive it from unpaid OperatorInvoice rows (Amount minus its
    // OperatorPaymentReceipts, for invoices not Cancelled/Paid) rather than retrofitting this
    // field. PendingSettlementBalance (the field this service was actually asked to maintain)
    // is correct and unaffected either way.
    public class InvoicePaymentService
    {
        private readonly AppDbContext _db;

        public InvoicePaymentService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<OperatorInvoice> CreateAsync(
            Guid busOperatorId, Guid? operatorStatementId, DateOnly invoiceDate, DateOnly? dueDate,
            SettlementDirection direction, decimal amount, string currency)
        {
            if (amount <= 0)
            {
                throw new InvalidOperationException("Invoice amount must be positive.");
            }

            var operatorExists = await _db.BusOperators.AnyAsync(o => o.Id == busOperatorId);
            if (!operatorExists)
            {
                throw new InvalidOperationException($"BusOperator {busOperatorId} does not exist.");
            }

            var invoice = new OperatorInvoice
            {
                BusOperatorId = busOperatorId,
                OperatorStatementId = operatorStatementId,
                InvoiceNo = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                InvoiceDate = invoiceDate,
                DueDate = dueDate,
                Direction = direction,
                Amount = amount,
                Currency = currency,
                Status = InvoiceStatus.Draft,
            };

            _db.OperatorInvoices.Add(invoice);
            await _db.SaveChangesAsync();
            return invoice;
        }

        public async Task IssueAsync(Guid invoiceId)
        {
            var invoice = await _db.OperatorInvoices.FirstOrDefaultAsync(i => i.Id == invoiceId)
                ?? throw new InvalidOperationException($"Invoice {invoiceId} does not exist.");

            if (invoice.Status != InvoiceStatus.Draft)
            {
                throw new InvalidOperationException(
                    $"Invoice {invoiceId} is {invoice.Status}; only a Draft invoice can be issued.");
            }

            invoice.Status = InvoiceStatus.Issued;
            invoice.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        public async Task CancelAsync(Guid invoiceId, string reason)
        {
            var invoice = await _db.OperatorInvoices.FirstOrDefaultAsync(i => i.Id == invoiceId)
                ?? throw new InvalidOperationException($"Invoice {invoiceId} does not exist.");

            if (invoice.Status is InvoiceStatus.Paid or InvoiceStatus.Cancelled)
            {
                throw new InvalidOperationException(
                    $"Invoice {invoiceId} is already {invoice.Status} and cannot be cancelled.");
            }

            var hasReceipts = await _db.OperatorPaymentReceipts.AnyAsync(r => r.OperatorInvoiceId == invoiceId);
            if (hasReceipts)
            {
                throw new InvalidOperationException(
                    $"Invoice {invoiceId} already has payment receipts recorded against it and cannot be cancelled.");
            }

            invoice.Status = InvoiceStatus.Cancelled;
            invoice.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // Records that the operator paid some (or all) of an invoice, and recomputes the
        // invoice's Status from the real total received — never from a client-supplied value.
        public async Task<OperatorPaymentReceipt> RecordReceiptAsync(
            Guid operatorInvoiceId, decimal amount, string currency, string? referenceNo, string? notes)
        {
            if (amount <= 0)
            {
                throw new InvalidOperationException("Receipt amount must be positive.");
            }

            var invoice = await _db.OperatorInvoices.FirstOrDefaultAsync(i => i.Id == operatorInvoiceId)
                ?? throw new InvalidOperationException($"Invoice {operatorInvoiceId} does not exist.");

            if (invoice.Status is InvoiceStatus.Cancelled)
            {
                throw new InvalidOperationException($"Invoice {operatorInvoiceId} is cancelled and cannot take payments.");
            }
            if (invoice.Status is InvoiceStatus.Paid)
            {
                throw new InvalidOperationException($"Invoice {operatorInvoiceId} is already fully paid.");
            }

            var receipt = new OperatorPaymentReceipt
            {
                OperatorInvoiceId = operatorInvoiceId,
                ReceivedAtUtc = DateTime.UtcNow,
                Amount = amount,
                Currency = currency,
                ReferenceNo = referenceNo,
                Notes = notes,
            };
            _db.OperatorPaymentReceipts.Add(receipt);

            // Recompute from the real receipts, not an incremental add — this stays correct even
            // if receipts are ever entered out of order or one is voided by a future admin tool.
            var totalReceived = await _db.OperatorPaymentReceipts
                .Where(r => r.OperatorInvoiceId == operatorInvoiceId)
                .Select(r => r.Amount)
                .SumAsync() + amount;

            invoice.Status = totalReceived >= invoice.Amount
                ? InvoiceStatus.Paid
                : InvoiceStatus.PartiallyPaid;
            invoice.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return receipt;
        }
    }
}
