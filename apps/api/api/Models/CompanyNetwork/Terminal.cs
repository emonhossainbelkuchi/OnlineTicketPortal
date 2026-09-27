using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.People;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.CompanyNetwork
{
    // A physical bus station / stoppage — e.g. "Gabtoli", "Kalyanpur", "Chittagong Central".
    // Terminals are shared platform-wide, not owned by one operator, because many operators
    // depart from and arrive at the same physical places.
    public class Terminal : AuditableEntity
    {
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Code { get; set; } = string.Empty; // Short unique code, e.g. "DHK-GBT".

        [MaxLength(80)]
        public string City { get; set; } = string.Empty;

        [MaxLength(80)]
        public string District { get; set; } = string.Empty;

        [MaxLength(80)]
        public string Division { get; set; } = string.Empty;

        [MaxLength(80)]
        public string Country { get; set; } = "Bangladesh";

        [MaxLength(250)]
        public string Address { get; set; } = string.Empty;

        // Map coordinates, used for showing the terminal on a map / calculating distance.
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public bool IsActive { get; set; } = true;

        // A route search for "Dhaka to Chittagong" works by matching Terminals, not free-text
        // city names, which is why routes point at Terminal rows instead of just storing city names.
        public ICollection<BusRoute> OriginRoutes { get; set; } = new List<BusRoute>();
        public ICollection<BusRoute> DestinationRoutes { get; set; } = new List<BusRoute>();
        public ICollection<RouteStop> RouteStops { get; set; } = new List<RouteStop>();
        public ICollection<OperatorRouteStop> OperatorRouteStops { get; set; } = new List<OperatorRouteStop>();
        public ICollection<SalesCounter> SalesCounters { get; set; } = new List<SalesCounter>();
    }
}
