using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.BusFleet;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Integrations;
using TicketPortal.Api.Models.Marketing;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Scheduling
{
    // ONE actual, dated, bookable journey — "the 9:00 PM bus from Dhaka to Chittagong on
    // 12 August". This is what a customer's search results actually show and select. Usually
    // generated automatically from a Schedule, but can also be created one-off (a special/extra
    // trip that isn't part of any recurring pattern).
    //
    // DepartureTerminal/ArrivalTerminal here are this SPECIFIC trip's actual start/end points —
    // they exist separately from BusRoute's origin/destination because an operator might run
    // one trip from Gabtoli and another from Kalyanpur, even though both are "Dhaka".
    public class Trip : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid BusRouteId { get; set; }
        public Guid? OperatorRouteId { get; set; }
        public Guid BusId { get; set; }
        public Guid? ScheduleId { get; set; } // Null if this trip was created one-off, not from a Schedule.
        public Guid DepartureTerminalId { get; set; }
        public Guid ArrivalTerminalId { get; set; }
        public Guid? CancellationPolicyId { get; set; }

        [MaxLength(40)]
        public string TripCode { get; set; } = string.Empty;

        // This trip's ID in the operator's own ERP, filled in only when InventoryMode below
        // is ExternalApiManaged/Hybrid and we need to reference their system's identifier.
        [MaxLength(120)]
        public string? ExternalTripKey { get; set; }

        // Copied from BusOperator/OperatorRoute at the moment this trip was generated, and then
        // FROZEN — deliberately not a live lookup. This means if the operator's overall setting
        // changes later, trips that already exist keep working the way they were originally set
        // up, instead of suddenly behaving differently mid-flight.
        public OperatorInventoryMode InventoryMode { get; set; } = OperatorInventoryMode.PlatformManaged;
        public DateTime DepartureTimeUtc { get; set; }
        public DateTime ArrivalTimeUtc { get; set; }
        public DateTime? ActualDepartureTimeUtc { get; set; } // Filled in once it really leaves.
        public DateTime? ActualArrivalTimeUtc { get; set; }
        public DateTime? ReportingTimeUtc { get; set; } // When passengers are told to arrive/check in.
        public TripStatus Status { get; set; } = TripStatus.Scheduled;

        // Bool-type demo field for this master-detail pair — whether this specific trip's bus
        // is running with wheelchair-accessible boarding for this journey.
        public bool IsWheelchairAccessible { get; set; }

        public decimal BaseFare { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        [MaxLength(250)]
        public string? DelayReason { get; set; }

        [MaxLength(300)]
        public string? CoverImageUrl { get; set; }

        public BusOperator BusOperator { get; set; } = default!;
        public BusRoute BusRoute { get; set; } = default!;
        public OperatorRoute? OperatorRoute { get; set; }
        public Bus Bus { get; set; } = default!;
        public Schedule? Schedule { get; set; }
        public Terminal DepartureTerminal { get; set; } = default!;
        public Terminal ArrivalTerminal { get; set; } = default!;
        public CancellationPolicy? CancellationPolicy { get; set; }

        // The live, per-seat inventory for this one trip — this is what the seat map on the
        // booking page is actually built from.
        public ICollection<TripSeat> TripSeats { get; set; } = new List<TripSeat>();
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<SeatHold> SeatHolds { get; set; } = new List<SeatHold>();
        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
        public ICollection<TripCrew> CrewMembers { get; set; } = new List<TripCrew>();
        public ICollection<TripStatusHistory> StatusHistory { get; set; } = new List<TripStatusHistory>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<ExternalTripMapping> ExternalTripMappings { get; set; } = new List<ExternalTripMapping>();
    }
}
