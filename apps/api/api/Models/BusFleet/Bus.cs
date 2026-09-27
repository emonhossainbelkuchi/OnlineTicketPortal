using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.BusFleet
{
    // ONE physical vehicle belonging to ONE operator. This is the "template" — it doesn't
    // change day to day. Its Seats (below) are the seat map every future Trip on this bus
    // will be generated from.
    public class Bus : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid? BusCategoryId { get; set; }

        [MaxLength(40)]
        public string RegistrationNumber { get; set; } = string.Empty;

        [MaxLength(40)]
        public string CoachNumber { get; set; } = string.Empty; // Operator's own internal fleet number.

        [MaxLength(80)]
        public string? Brand { get; set; }

        [MaxLength(80)]
        public string? Model { get; set; }

        [MaxLength(80)]
        public string? ChassisNumber { get; set; }

        [MaxLength(80)]
        public string? EngineNumber { get; set; }

        public int? ManufactureYear { get; set; }

        // Date-type demo field for this master-detail pair — when this specific vehicle was
        // registered with the transport authority (distinct from ManufactureYear above).
        public DateTime? RegistrationDate { get; set; }
        public VehicleFuelType? FuelType { get; set; }
        public BusType BusType { get; set; }
        public int TotalSeats { get; set; }
        public bool HasWifi { get; set; }
        public bool HasToilet { get; set; }
        public bool IsActive { get; set; } = true;

        public BusOperator BusOperator { get; set; } = default!;
        public BusCategory? BusCategory { get; set; }

        // The fixed seat map for this physical bus (see Seat) — every Trip generated for this
        // bus copies this seat layout into that trip's own TripSeat rows.
        public ICollection<Seat> Seats { get; set; } = new List<Seat>();
        public ICollection<BusAmenityMapping> AmenityMappings { get; set; } = new List<BusAmenityMapping>();
        public ICollection<BusImage> Images { get; set; } = new List<BusImage>();
        public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
        public ICollection<Trip> Trips { get; set; } = new List<Trip>();
        public ICollection<BusMaintenanceLog> MaintenanceLogs { get; set; } = new List<BusMaintenanceLog>();
    }
}
