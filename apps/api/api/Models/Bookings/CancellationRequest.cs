using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Identity;
using TicketPortal.Api.Models.Payments;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Bookings
{
    // A customer (or staff, on their behalf) asking to cancel a booking or one ticket in it.
    // Kept as its own request/approval record — separate from just flipping the booking's
    // status straight to Cancelled — so there's a clear trail of who asked, who approved it,
    // and how much refund was agreed, before any Refund actually gets created/paid.
    public class CancellationRequest : AuditableEntity
    {
        public Guid BookingId { get; set; }
        public Guid? TicketId { get; set; } // Null if the whole booking is being cancelled, not just one ticket.
        public Guid? RequestedByUserId { get; set; }
        public Guid? ApprovedByUserId { get; set; }

        public CancellationRequestStatus Status { get; set; } = CancellationRequestStatus.Requested;

        [MaxLength(250)]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? RejectedReason { get; set; }

        // Snapshot of what RequestedRefundAmount was actually computed FROM, taken at request
        // time. Without these, a booking's paid GrandTotal (fare + tax + service charge) and
        // RequestedRefundAmount look like they "don't match" to anyone reading them side by
        // side — the policy percentage only ever applies to BaseAmount (the still-outstanding
        // ticket fare), never to tax/service charge, and neither of those two numbers used to
        // be exposed anywhere. Nullable-looking fields (percentage/fee) are 0 for an
        // operatorInitiated request, where the policy ladder is never consulted at all.
        public decimal BaseAmount { get; set; } // Ticket fare(s) the policy % was applied to (never includes tax/service charge).
        public decimal BookingGrandTotalAtRequest { get; set; } // Booking.GrandTotal at the moment this request was made, for display only.
        public decimal? AppliedRefundPercentage { get; set; } // The matched CancellationPolicyRule's %, or null if operator-initiated / no rule matched.
        public decimal? AppliedFixedCancellationFee { get; set; }

        public decimal RequestedRefundAmount { get; set; }
        public decimal? ApprovedRefundAmount { get; set; } // May differ from requested, per the CancellationPolicy rules.
        public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? ApprovedAtUtc { get; set; }
        public DateTime? CompletedAtUtc { get; set; } // When the refund actually finished.

        public Booking Booking { get; set; } = default!;
        public Ticket? Ticket { get; set; }
        public ApplicationUser? RequestedByUser { get; set; }
        public ApplicationUser? ApprovedByUser { get; set; }
        public ICollection<Refund> Refunds { get; set; } = new List<Refund>();
    }
}
