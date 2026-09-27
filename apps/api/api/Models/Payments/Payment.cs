using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.Payments
{
    // ONE payment attempt against a Booking. A booking could have more than one Payment row
    // if a first attempt fails and the customer tries again, so this is "attempts", not
    // "the booking's final total".
    public class Payment : AuditableEntity
    {
        public Guid BookingId { get; set; }
        public Guid? PaymentProviderId { get; set; }

        public PaymentMethod Method { get; set; }
        public PaymentGateway Gateway { get; set; } = PaymentGateway.None;

        // Mirrors Booking.MoneyCollectedBy for this specific payment — who actually holds this
        // money right now.
        public MoneyCollectedBy CollectedBy { get; set; } = MoneyCollectedBy.Platform;

        [MaxLength(100)]
        public string? GatewayTransactionId { get; set; } // The provider's own reference for this payment.

        [MaxLength(100)]
        public string? MerchantInvoiceNumber { get; set; }

        public decimal Amount { get; set; } // What the customer was charged.
        public decimal GatewayFeeAmount { get; set; } // What the gateway kept as its processing fee.
        public decimal NetReceivedAmount { get; set; } // Amount actually left after the gateway's cut.

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        public PaymentStatus Status { get; set; } = PaymentStatus.Initiated;
        public DateTime TransactionDateUtc { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAtUtc { get; set; }
        public DateTime? FailedAtUtc { get; set; }

        [MaxLength(2000)]
        public string? GatewayResponseJson { get; set; } // Raw response, kept for debugging/support.

        public Booking Booking { get; set; } = default!;
        public PaymentProvider? PaymentProvider { get; set; }
        public ICollection<PaymentHistory> Histories { get; set; } = new List<PaymentHistory>();
        public ICollection<Refund> Refunds { get; set; } = new List<Refund>();
        public ICollection<PaymentWebhookEvent> WebhookEvents { get; set; } = new List<PaymentWebhookEvent>();

        public bool IsSuccessful() => Status == PaymentStatus.Succeeded;
    }
}
