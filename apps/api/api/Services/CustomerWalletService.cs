using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.People;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Services
{
    // The only place in the codebase allowed to change CustomerProfile.WalletBalance. Every
    // top-up or spend goes through here, and every single change writes BOTH the new balance
    // AND a CustomerWalletTransaction row explaining it, in the same save — so the balance
    // number can always be double-checked by re-adding up that customer's transaction history.
    // Balance changes are atomic (see ApplyAsync) — no read-balance-then-write-balance window,
    // so two concurrent debits for the same customer can't both succeed against money that's
    // only there once.
    public class CustomerWalletService
    {
        private readonly AppDbContext _db;

        public CustomerWalletService(AppDbContext db)
        {
            _db = db;
        }

        // Add money to a customer's wallet (a top-up, or a refund paid back into the wallet
        // instead of the original payment method).
        public Task CreditAsync(Guid customerProfileId, decimal amount, CustomerWalletTransactionType type,
            Guid? bookingId = null, Guid? refundId = null, string? description = null, string currency = "BDT")
        {
            if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount), "Credit amount must be positive.");
            return ApplyAsync(customerProfileId, amount, type, bookingId, refundId, description, currency);
        }

        // Take money out of a customer's wallet (paying for a booking with wallet balance).
        public Task DebitAsync(Guid customerProfileId, decimal amount, CustomerWalletTransactionType type,
            Guid? bookingId = null, string? description = null, string currency = "BDT")
        {
            if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount), "Debit amount must be positive.");
            return ApplyAsync(customerProfileId, -amount, type, bookingId, null, description, currency);
        }

        private async Task ApplyAsync(
            Guid customerProfileId,
            decimal signedAmount,
            CustomerWalletTransactionType type,
            Guid? bookingId,
            Guid? refundId,
            string? description,
            string currency)
        {
            await using var transaction = await _db.Database.BeginTransactionAsync();

            // Atomic check-and-update, matching PayoutProcessingService.CreateAsync's "reserve"
            // pattern: the balance check lives in the WHERE clause of the update itself, so two
            // concurrent debits for the same customer can't both read the same starting balance
            // and both succeed against money that's only there once. We no longer read-then-write
            // in C# — read, compute, save was exactly the race the previous version had.
            int affected;

            if (signedAmount < 0)
            {
                var debitAmount = -signedAmount;
                affected = await _db.CustomerProfiles
                    .Where(c => c.Id == customerProfileId && c.WalletBalance >= debitAmount)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(c => c.WalletBalance, c => c.WalletBalance - debitAmount));

                if (affected == 0)
                {
                    // 0 affected rows means either the profile doesn't exist, or it exists but
                    // didn't have enough balance — tell those two apart with one extra read so
                    // the error message stays as actionable as before.
                    var exists = await _db.CustomerProfiles.AnyAsync(c => c.Id == customerProfileId);
                    throw new InvalidOperationException(exists
                        ? "Insufficient wallet balance."
                        : $"CustomerProfile {customerProfileId} does not exist.");
                }
            }
            else
            {
                affected = await _db.CustomerProfiles
                    .Where(c => c.Id == customerProfileId)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(c => c.WalletBalance, c => c.WalletBalance + signedAmount));

                if (affected == 0)
                {
                    throw new InvalidOperationException($"CustomerProfile {customerProfileId} does not exist.");
                }
            }

            // The atomic update above means we never had the new balance in hand ahead of time
            // (that's the whole point) — so a follow-up read gets it for the audit row below.
            var newBalance = await _db.CustomerProfiles
                .Where(c => c.Id == customerProfileId)
                .Select(c => c.WalletBalance)
                .FirstAsync();

            // The paper trail: exactly why the balance just changed.
            _db.CustomerWalletTransactions.Add(new CustomerWalletTransaction
            {
                CustomerProfileId = customerProfileId,
                BookingId = bookingId,
                RefundId = refundId,
                TransactionType = type,
                Amount = signedAmount,
                BalanceAfter = newBalance,
                Currency = currency,
                Description = description
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
    }
}
