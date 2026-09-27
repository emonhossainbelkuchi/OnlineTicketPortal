using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Integrations
{
    // ONE specific API call we know how to make to an operator's ERP — e.g. "Purpose:
    // GetSeatAvailability, HttpMethod: GET, PathTemplate: /trips/{tripId}/seats". Stored as
    // data instead of hardcoded per-operator code, so wiring up a new operator's API mostly
    // means adding rows here, not writing new integration code each time.
    public class OperatorIntegrationEndpoint : AuditableEntity
    {
        public Guid OperatorIntegrationId { get; set; }

        [MaxLength(80)]
        public string Purpose { get; set; } = string.Empty; // What this endpoint is used for.

        [MaxLength(10)]
        public string HttpMethod { get; set; } = "GET";

        [MaxLength(300)]
        public string PathTemplate { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public OperatorIntegration OperatorIntegration { get; set; } = default!;
    }
}
