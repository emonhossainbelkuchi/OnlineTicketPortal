using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Payments
{
    // A price for a route, optionally narrowed down by operator/bus type/seat type. If
    // BusOperatorId is null, the rule is a general "platform default" price for that route,
    // which specific operators can then override with their own more specific rule.
    public class FareRule : AuditableEntity
    {
        public Guid? BusOperatorId { get; set; } // Null = applies to any operator on this route, unless they have their own override.
        public Guid BusRouteId { get; set; }

        public BusType? BusType { get; set; }
        public SeatType? SeatType { get; set; }

        public decimal BaseFare { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        public DateTime EffectiveFromUtc { get; set; }
        public DateTime? EffectiveToUtc { get; set; }
        public bool IsActive { get; set; } = true;

        public BusOperator? BusOperator { get; set; }
        public BusRoute BusRoute { get; set; } = default!;
    }
}
