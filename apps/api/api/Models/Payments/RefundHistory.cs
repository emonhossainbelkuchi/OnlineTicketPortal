using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Payments
{
    // Same idea as PaymentHistory, but tracking a Refund's progress through its own statuses.
    public class RefundHistory : AuditableEntity
    {
        public Guid RefundId { get; set; }
        public RefundStatus Status { get; set; }
        public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;

        [MaxLength(250)]
        public string? Remarks { get; set; }

        public Refund Refund { get; set; } = default!;
    }
}
