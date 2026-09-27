using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Integrations;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.CompanyNetwork
{
    // One specific operator's OWN version of a shared BusRoute — e.g. "Green Line's
    // Dhaka-Chittagong service" is an OperatorRoute that plugs into the shared "Dhaka to
    // Chittagong" BusRoute. This is where an operator can customise things (their own stops,
    // their own inventory mode) without affecting how other operators run the same route.
    public class OperatorRoute : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid BusRouteId { get; set; }

        [MaxLength(50)]
        public string OperatorRouteCode { get; set; } = string.Empty;

        [MaxLength(160)]
        public string? DisplayName { get; set; }

        // Lets ONE operator override how seat inventory is managed for THIS route only,
        // without changing their platform-wide default (BusOperator.InventoryMode).
        // Null = just use the operator's normal default.
        public OperatorInventoryMode? InventoryModeOverride { get; set; }

        public bool IsActive { get; set; } = true;

        public BusOperator BusOperator { get; set; } = default!;
        public BusRoute BusRoute { get; set; } = default!;
        public ICollection<OperatorRouteStop> OperatorRouteStops { get; set; } = new List<OperatorRouteStop>();
        public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
        public ICollection<Trip> Trips { get; set; } = new List<Trip>();
        // Lets us translate this operator's own route ID (in THEIR system) to ours, for the
        // ones who connect through their own ERP API.
        public ICollection<ExternalRouteMapping> ExternalRouteMappings { get; set; } = new List<ExternalRouteMapping>();
    
    
    }
}
