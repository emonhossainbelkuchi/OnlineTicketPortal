using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.BusFleet
{
    // One physical seat position on a specific Bus — this is the fixed "template" seat map
    // (row/column/deck) that never changes trip to trip. Every time a Trip is created for this
    // bus, one TripSeat gets generated per Seat here, which is the row that actually tracks
    // whether that seat is available/held/booked for THAT one journey.
    public class Seat : AuditableEntity
    {
        public Guid BusId { get; set; }

        [MaxLength(10)]
        public string SeatNumber { get; set; } = string.Empty; // e.g. "A1", "12".

        public int RowNumber { get; set; }
        public int ColumnNumber { get; set; }
        public int DeckLevel { get; set; } = 1; // 1 = lower deck, 2 = upper deck, for double-deckers.
        public SeatType SeatType { get; set; } = SeatType.Regular;
        public bool IsWindow { get; set; }
        public decimal? ExtraFare { get; set; } // Optional surcharge for a premium seat (e.g. front row).
        public bool IsActive { get; set; } = true;

        public Bus Bus { get; set; } = default!;
        public ICollection<TripSeat> TripSeats { get; set; } = new List<TripSeat>();
    }
}
