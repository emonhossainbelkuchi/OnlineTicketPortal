using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Bookings
{
    // ONE traveller inside a Booking. A single booking can carry several passengers (a family
    // buying 4 seats in one go), so this holds each person's own details — separate from the
    // account of whoever actually made the booking (who might be booking on behalf of others).
    public class BookingPassenger : AuditableEntity
    {
        public Guid BookingId { get; set; }

        [MaxLength(120)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(30)]
        public string? Phone { get; set; }

        [MaxLength(120)]
        public string? Email { get; set; }

        public Gender Gender { get; set; } = Gender.Unknown;
        public PassengerType PassengerType { get; set; } = PassengerType.Adult; // Drives child/student fare rules.
        public int? Age { get; set; }

        [MaxLength(30)]
        public string? NationalIdNumber { get; set; }

        [MaxLength(300)]
        public string? NationalIdPhotoUrl { get; set; }

        [MaxLength(30)]
        public string? EmergencyContactPhone { get; set; }

        public Booking Booking { get; set; } = default!;
        // Usually one ticket per passenger, but the collection allows for edge cases
        // (e.g. re-issued tickets) without changing the model.
        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    }
}
