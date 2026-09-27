using TicketPortal.Api.Models.BusFleet;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Scheduling
{
    // A RECURRING pattern — "this bus leaves Dhaka for Chittagong at 9:00 PM every day" — not
    // an actual bookable journey by itself. A background job reads Schedule rows and generates
    // real, dated Trip rows from them (e.g. one Trip per day this Schedule applies to).
    // Think of Schedule as the template and Trip as one dated instance of that template.
    public class Schedule : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid BusRouteId { get; set; }
        public Guid? OperatorRouteId { get; set; }
        public Guid BusId { get; set; }

        [MaxLength(40)]
        public string ScheduleCode { get; set; } = string.Empty;

        public TimeSpan DepartureTimeOfDay { get; set; }
        public TimeSpan? ArrivalTimeOfDay { get; set; }
        public DayOfWeekFlag OperatingDays { get; set; } = DayOfWeekFlag.Everyday; // Which days of the week this runs.
        public DateOnly EffectiveFrom { get; set; }
        public DateOnly? EffectiveTo { get; set; } // Null = runs indefinitely.
        public decimal BaseFare { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        public bool IsActive { get; set; } = true;

        public BusOperator BusOperator { get; set; } = default!;
        public BusRoute BusRoute { get; set; } = default!;
        public OperatorRoute? OperatorRoute { get; set; }
        public Bus Bus { get; set; } = default!;
        public ICollection<Trip> Trips { get; set; } = new List<Trip>();
    }
}
