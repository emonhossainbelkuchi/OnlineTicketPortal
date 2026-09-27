using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Bookings
{
    // The actual, physical/digital TICKET for one passenger's one seat — this is what gets
    // shown as a QR code and scanned at the terminal. A Booking can produce several Tickets
    // (one per seat/passenger); each Ticket is permanently tied to exactly one TripSeat.
    public class Ticket : AuditableEntity
    {
        public Guid BookingId { get; set; }
        public Guid BookingPassengerId { get; set; }
        public Guid TripId { get; set; } // Copied from Booking for fast lookups (e.g. scanning at the gate).
        public Guid TripSeatId { get; set; }

        [MaxLength(30)]
        public string TicketNumber { get; set; } = string.Empty;

        [MaxLength(120)]
        public string? ExternalTicketKey { get; set; } // The operator ERP's own ticket reference, if applicable.

        [MaxLength(10)]
        public string SeatNumberSnapshot { get; set; } = string.Empty; // Frozen copy, in case the seat layout ever changes later.

        [MaxLength(500)]
        public string QrCodePayload { get; set; } = string.Empty; // What's actually encoded in the boarding QR code.

        public decimal Fare { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalFare { get; set; } // What this one seat actually cost after discount.
        public TicketStatus Status { get; set; } = TicketStatus.PendingPayment;
        public DateTime? IssuedAtUtc { get; set; }
        public DateTime? CheckedInAtUtc { get; set; } // When the passenger actually showed up at the terminal.
        public DateTime? CancelledAtUtc { get; set; }

        public Booking Booking { get; set; } = default!;
        public BookingPassenger BookingPassenger { get; set; } = default!;
        public Trip Trip { get; set; } = default!;
        public TripSeat TripSeat { get; set; } = default!;
        public ICollection<CancellationRequest> CancellationRequests { get; set; } = new List<CancellationRequest>();
    }
}
