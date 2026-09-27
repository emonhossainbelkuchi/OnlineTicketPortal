using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Payments
{
    // A timeline entry every time a Payment's status changes — same idea as
    // TripStatusHistory, but for payments, so we can always see exactly how a payment
    // progressed (e.g. Initiated -> Pending -> Succeeded) rather than only its current status.
    public class PaymentHistory : AuditableEntity
    {
        public Guid PaymentId { get; set; }
        public PaymentStatus Status { get; set; }
        public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;

        [MaxLength(250)]
        public string? Remarks { get; set; }

        public Payment Payment { get; set; } = default!;
    }
}
