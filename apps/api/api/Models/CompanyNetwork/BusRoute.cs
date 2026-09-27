using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Payments;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.CompanyNetwork
{
    // The ONE unified, shared route a customer searches for — e.g. "Dhaka to Chittagong".
    // This is platform-wide and not owned by any single operator. Many different operators
    // can each run their own service on this same BusRoute (see OperatorRoute) — that's what
    // makes "search Dhaka to Chittagong, see every operator's buses" possible.
    public class BusRoute : AuditableEntity
    {
        public Guid OriginTerminalId { get; set; }
        public Guid DestinationTerminalId { get; set; }

        // The "Chittagong to Dhaka" route going the other way, if it exists — lets the UI offer
        // a one-click "search the return trip" without guessing.
        public Guid? ReverseRouteId { get; set; }

        [MaxLength(30)]
        public string RouteCode { get; set; } = string.Empty;

        [MaxLength(160)]
        public string Name { get; set; } = string.Empty; // e.g. "Dhaka - Chittagong".

        public decimal DistanceKm { get; set; }
        public int EstimatedDurationMinutes { get; set; }

        // Fallback fare shown/used if no operator-specific FareRule applies.
        public decimal? DefaultBaseFare { get; set; }
        public bool IsActive { get; set; } = true;

        public Terminal OriginTerminal { get; set; } = default!;
        public Terminal DestinationTerminal { get; set; } = default!;
        public BusRoute? ReverseRoute { get; set; }

        // Every operator that runs a service on this shared route plugs in here.
        public ICollection<OperatorRoute> OperatorRoutes { get; set; } = new List<OperatorRoute>();
        public ICollection<RouteStop> RouteStops { get; set; } = new List<RouteStop>();
        public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
        public ICollection<Trip> Trips { get; set; } = new List<Trip>();
        public ICollection<FareRule> FareRules { get; set; } = new List<FareRule>();
    }
}
