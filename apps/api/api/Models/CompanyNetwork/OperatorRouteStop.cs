using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.CompanyNetwork
{
    // Same idea as RouteStop, but for ONE operator's own version of the route (OperatorRoute)
    // instead of the shared platform-wide route. Lets one operator pick up at a different set
    // of stops than another operator running the "same" Dhaka-to-Chittagong route.
    public class OperatorRouteStop : AuditableEntity
    {
        public Guid OperatorRouteId { get; set; }
        public Guid TerminalId { get; set; }

        public int StopOrder { get; set; }
        public int? ArrivalOffsetMinutes { get; set; }
        public int? DepartureOffsetMinutes { get; set; }
        public bool IsPickupPoint { get; set; } = true;
        public bool IsDropOffPoint { get; set; } = true;

        // This operator's own name/ID for this stop in THEIR system, useful when this route
        // is externally managed and we need to match our stop to theirs.
        [MaxLength(120)]
        public string? ExternalStopKey { get; set; }

        public OperatorRoute OperatorRoute { get; set; } = default!;
        public Terminal Terminal { get; set; } = default!;
    }
}
