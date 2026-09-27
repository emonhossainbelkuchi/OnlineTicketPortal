using TicketPortal.Api.Models.Common;
using System;

namespace TicketPortal.Api.Models.CompanyNetwork
{
    // One stop along the platform-wide, shared version of a route (see BusRoute) — e.g. the
    // Dhaka-Chittagong route might pass through Comilla on the way. Having stops means a
    // passenger doesn't have to board/alight only at the two route endpoints.
    public class RouteStop : AuditableEntity
    {
        public Guid BusRouteId { get; set; }
        public Guid TerminalId { get; set; }

        public int StopOrder { get; set; } // 1st stop, 2nd stop, etc., in travel order.
        public int? ArrivalOffsetMinutes { get; set; }   // Minutes after departure this stop is reached.
        public int? DepartureOffsetMinutes { get; set; }
        public decimal DistanceFromOriginKm { get; set; }
        public bool IsPickupPoint { get; set; } = true;  // Can passengers board here?
        public bool IsDropOffPoint { get; set; } = true; // Can passengers alight here?

        public BusRoute BusRoute { get; set; } = default!;
        public Terminal Terminal { get; set; } = default!;
    }
}
