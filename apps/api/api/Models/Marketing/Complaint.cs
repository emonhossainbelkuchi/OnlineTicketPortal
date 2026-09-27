using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.People;
using System;
using System.ComponentModel.DataAnnotations;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.Marketing
{
    // A customer support complaint/ticket — optionally tied to a specific Booking if that's
    // what it's about.
    public class Complaint : AuditableEntity
    {
        public Guid CustomerProfileId { get; set; }
        public Guid? BookingId { get; set; }

        [MaxLength(120)]
        public string Subject { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        public ComplaintStatus Status { get; set; } = ComplaintStatus.Open;
        public DateTime? ResolvedAtUtc { get; set; }

        public CustomerProfile CustomerProfile { get; set; } = default!;
        public Booking? Booking { get; set; }
    }
}
