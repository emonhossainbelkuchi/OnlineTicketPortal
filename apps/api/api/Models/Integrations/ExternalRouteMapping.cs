using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Integrations
{
    // Says "our OperatorRoute X is the same real-world route as their route key Y in their own
    // system" — needed because we and the operator's ERP each have our own separate IDs for
    // the same route.
    public class ExternalRouteMapping : AuditableEntity
    {
        public Guid OperatorIntegrationId { get; set; }
        public Guid OperatorRouteId { get; set; }

        [MaxLength(120)]
        public string ExternalRouteKey { get; set; } = string.Empty; // Their ID for this route.

        [MaxLength(160)]
        public string? ExternalRouteName { get; set; }

        public OperatorIntegration OperatorIntegration { get; set; } = default!;
        public OperatorRoute OperatorRoute { get; set; } = default!;
    }
}
