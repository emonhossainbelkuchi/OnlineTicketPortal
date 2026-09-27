using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.People
{
    // Someone to contact if something goes wrong on a trip — saved on the customer's account
    // so it doesn't have to be re-typed on every booking.
    public class EmergencyContact : AuditableEntity
    {
        public Guid CustomerProfileId { get; set; }

        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(30)]
        public string Phone { get; set; } = string.Empty;

        [MaxLength(60)]
        public string? Relation { get; set; } // e.g. "Father", "Spouse".

        public CustomerProfile CustomerProfile { get; set; } = default!;
    }
}
