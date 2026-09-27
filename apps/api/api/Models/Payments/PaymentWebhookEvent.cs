using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Payments
{
    // A raw notification a payment gateway sent US about a payment (e.g. "this payment just
    // succeeded"). Kept as its own log, separate from Payment itself, because gateways
    // sometimes send the same notification more than once — having the raw events lets us
    // check "have we already handled this exact one" before acting on it again.
    public class PaymentWebhookEvent : AuditableEntity
    {
        public Guid? PaymentId { get; set; }
        public Guid? PaymentProviderId { get; set; }

        [MaxLength(120)]
        public string ProviderEventId { get; set; } = string.Empty; // The gateway's own ID for this specific notification.

        [MaxLength(80)]
        public string EventType { get; set; } = string.Empty;

        public PaymentStatus? ReportedStatus { get; set; }
        public DateTime ReceivedAtUtc { get; set; } = DateTime.UtcNow;
        public bool IsProcessed { get; set; } // Have we actually acted on this yet?
        public DateTime? ProcessedAtUtc { get; set; }
        public string? PayloadJson { get; set; } // The raw notification body, kept for debugging.

        [MaxLength(1000)]
        public string? ErrorMessage { get; set; }

        public Payment? Payment { get; set; }
        public PaymentProvider? PaymentProvider { get; set; }
    }
}
