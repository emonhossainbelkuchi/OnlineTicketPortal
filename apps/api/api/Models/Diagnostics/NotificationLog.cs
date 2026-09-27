using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Identity;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Diagnostics
{
    // A record of one message we sent out (booking confirmation email, SMS, etc.) — what
    // channel, to who, whether it actually sent, and the provider's own message ID for tracing
    // delivery problems.
    public class NotificationLog : AuditableEntity
    {
        public Guid? BookingId { get; set; }
        public Guid? TicketId { get; set; }
        public Guid? UserId { get; set; }

        public NotificationChannel Channel { get; set; }

        [MaxLength(160)]
        public string Recipient { get; set; } = string.Empty;

        [MaxLength(180)]
        public string? Subject { get; set; }

        [MaxLength(2000)]
        public string Message { get; set; } = string.Empty;

        public NotificationStatus Status { get; set; } = NotificationStatus.Queued;

        [MaxLength(120)]
        public string? ProviderMessageId { get; set; }

        [MaxLength(1000)]
        public string? ErrorMessage { get; set; }

        public DateTime? SentAtUtc { get; set; }

        public Booking? Booking { get; set; }
        public Ticket? Ticket { get; set; }
        public ApplicationUser? User { get; set; }
    }
}
