using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Finance;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Services
{
    // Orchestrates an OperatorPayout from Pending through to Paid/Failed/Cancelled. Before this
    // existed, OperatorPayoutsController let any authenticated user set Status straight to Paid
    // with a made-up BankTransactionReference and no check against what was actually available
    // to pay out — this is what makes a payout's status mean "money really left the account".
    //
    // The available balance is RESERVED the moment a payout is created (moved out of
    // AvailablePayoutBalance immediately, atomically, so two staff members can't both create a
    // payout against the same money) and only turns into WithdrawnAmount once the transfer is
    // actually confirmed. If it fails or is cancelled first, the reservation is given back.
    public class PayoutProcessingService
    {
        private readonly AppDbContext _db;

        public PayoutProcessingService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<OperatorPayout> CreateAsync(
            Guid busOperatorId, decimal amount, string currency, Guid? operatorSettlementId, string? notes)
        {
            if (amount <= 0)
            {
                throw new InvalidOperationException("Payout amount must be positive.");
            }

            await using var transaction = await _db.Database.BeginTransactionAsync();

            // Atomic check-and-reserve: the WHERE clause only lets the update through if there's
            // still enough available balance, so two concurrent payout requests for the same
            // operator can't both succeed against money that's only there once.
            var reserved = await _db.OperatorWallets
                .Where(w => w.BusOperatorId == busOperatorId && w.AvailablePayoutBalance >= amount)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(w => w.AvailablePayoutBalance, w => w.AvailablePayoutBalance - amount));

            if (reserved == 0)
            {
                var walletExists = await _db.OperatorWallets.AnyAsync(w => w.BusOperatorId == busOperatorId);
                throw new InvalidOperationException(walletExists
                    ? $"Operator {busOperatorId} does not have {amount} {currency} available to pay out."
                    : $"No OperatorWallet exists for operator {busOperatorId}.");
            }

            var payout = new OperatorPayout
            {
                BusOperatorId = busOperatorId,
                OperatorSettlementId = operatorSettlementId,
                PayoutNo = $"PYT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                Amount = amount,
                Currency = currency,
                Status = PayoutStatus.Pending,
                Notes = notes,
            };
            _db.OperatorPayouts.Add(payout);

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return payout;
        }

        // Staff confirms they've actually started the bank transfer. No wallet change — the
        // amount was already reserved at Create.
        public async Task MarkProcessingAsync(Guid payoutId)
        {
            var payout = await _db.OperatorPayouts.FirstOrDefaultAsync(p => p.Id == payoutId)
                ?? throw new InvalidOperationException($"Payout {payoutId} does not exist.");

            if (payout.Status != PayoutStatus.Pending)
            {
                throw new InvalidOperationException(
                    $"Payout {payoutId} is {payout.Status}; only a Pending payout can move to Processing.");
            }

            payout.Status = PayoutStatus.Processing;
            payout.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // The step that actually confirms money left the account — requires a real bank
        // reference, matching the plan's "should only move to Completed once there's a real
        // bank reference" requirement.
        public async Task CompleteAsync(Guid payoutId, string bankTransactionReference)
        {
            if (string.IsNullOrWhiteSpace(bankTransactionReference))
            {
                throw new InvalidOperationException("A bank transaction reference is required to complete a payout.");
            }

            var payout = await _db.OperatorPayouts.FirstOrDefaultAsync(p => p.Id == payoutId)
                ?? throw new InvalidOperationException($"Payout {payoutId} does not exist.");

            if (payout.Status is not (PayoutStatus.Pending or PayoutStatus.Processing))
            {
                throw new InvalidOperationException(
                    $"Payout {payoutId} is {payout.Status}; only a Pending or Processing payout can be completed.");
            }

            await using var transaction = await _db.Database.BeginTransactionAsync();

            payout.Status = PayoutStatus.Paid;
            payout.PaidAtUtc = DateTime.UtcNow;
            payout.BankTransactionReference = bankTransactionReference;
            payout.UpdatedAtUtc = DateTime.UtcNow;

            await _db.OperatorWallets
                .Where(w => w.BusOperatorId == payout.BusOperatorId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(w => w.WithdrawnAmount, w => w.WithdrawnAmount + payout.Amount));

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }

        // Gives the reserved amount back to AvailablePayoutBalance — used for both Fail and
        // Cancel, since in both cases the money never actually left the account.
        public Task FailAsync(Guid payoutId, string reason) => ReleaseAsync(payoutId, PayoutStatus.Failed, reason);

        public Task CancelAsync(Guid payoutId, string reason) => ReleaseAsync(payoutId, PayoutStatus.Cancelled, reason);

        private async Task ReleaseAsync(Guid payoutId, PayoutStatus terminalStatus, string reason)
        {
            var payout = await _db.OperatorPayouts.FirstOrDefaultAsync(p => p.Id == payoutId)
                ?? throw new InvalidOperationException($"Payout {payoutId} does not exist.");

            if (payout.Status is not (PayoutStatus.Pending or PayoutStatus.Processing))
            {
                throw new InvalidOperationException(
                    $"Payout {payoutId} is {payout.Status}; only a Pending or Processing payout can be {terminalStatus}.");
            }

            await using var transaction = await _db.Database.BeginTransactionAsync();

            payout.Status = terminalStatus;
            payout.UpdatedAtUtc = DateTime.UtcNow;
            payout.Notes = string.IsNullOrWhiteSpace(payout.Notes) ? reason : $"{payout.Notes} | {reason}";

            await _db.OperatorWallets
                .Where(w => w.BusOperatorId == payout.BusOperatorId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(w => w.AvailablePayoutBalance, w => w.AvailablePayoutBalance + payout.Amount));

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
    }
}
