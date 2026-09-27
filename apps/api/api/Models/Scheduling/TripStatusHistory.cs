using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Identity;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Scheduling
{
    // A timeline entry every time a Trip's status changes (Scheduled -> Boarding -> Departed...).
    // Kept so we can always answer "when did this trip actually leave" or show customers a
    // live timeline, instead of only ever knowing the CURRENT status on Trip itself.
    public class TripStatusHistory : AuditableEntity
    {
        public Guid TripId { get; set; }
        public Guid? ChangedByUserId { get; set; } // Null if changed automatically by the system.
        public TripStatus Status { get; set; }
        public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;

        [MaxLength(250)]
        public string? Remarks { get; set; }

        public Trip Trip { get; set; } = default!;
        public ApplicationUser? ChangedByUser { get; set; }
    }
}
