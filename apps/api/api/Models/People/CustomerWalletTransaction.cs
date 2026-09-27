using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Payments;
using System;
using System.ComponentModel.DataAnnotations;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.People
{
    // The full paper trail behind a customer's in-app wallet balance — one row per top-up,
    // spend, or refund-to-wallet. CustomerProfile.WalletBalance is just a running total of
    // these rows, kept as a shortcut for fast reads. Any change to the balance MUST come with
    // a new row here in the same save, which is exactly what CustomerWalletService does —
    // nothing else in the app should touch the balance directly.
    public class CustomerWalletTransaction : AuditableEntity
    {
        public Guid CustomerProfileId { get; set; }
        public Guid? BookingId { get; set; } // Set if this was spending on a booking.
        public Guid? RefundId { get; set; } // Set if this was a refund credited back to the wallet.

        public CustomerWalletTransactionType TransactionType { get; set; }

        // Positive = money added (top-up, refund). Negative = money spent (paid for a booking).
        public decimal Amount { get; set; }
        public decimal BalanceAfter { get; set; } // Snapshot of the running balance right after this transaction.

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        [MaxLength(300)]
        public string? Description { get; set; }

        public CustomerProfile CustomerProfile { get; set; } = default!;
        public Booking? Booking { get; set; }
        public Refund? Refund { get; set; }
    }
}
