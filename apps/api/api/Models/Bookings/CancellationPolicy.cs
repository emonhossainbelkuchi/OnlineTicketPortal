using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Bookings
{
    // A named set of cancellation/refund rules (e.g. "Standard Policy", "No-Refund Promo
    // Fare"), which can belong to one operator or be a platform-wide default. The actual
    // percentages live on the child CancellationPolicyRule rows below.
    public class CancellationPolicy : AuditableEntity
    {
        public Guid? BusOperatorId { get; set; } // Null = platform-wide default policy.

        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        // Date-type demo fields for this master-detail pair — the validity window during which
        // this policy applies. EffectiveToUtc null = still open-ended / no end date yet.
        public DateTime? EffectiveFromUtc { get; set; }
        public DateTime? EffectiveToUtc { get; set; }

        [MaxLength(300)]
        public string? PolicyDocumentImageUrl { get; set; }

        public BusOperator? BusOperator { get; set; }
        public ICollection<CancellationPolicyRule> Rules { get; set; } = new List<CancellationPolicyRule>();
        public ICollection<Trip> Trips { get; set; } = new List<Trip>();
    }
}
