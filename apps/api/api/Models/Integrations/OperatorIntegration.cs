using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Integrations
{
    // This is the "connect from our API to their API" piece from the business plan — one row
    // per operator who has their own ERP system. It stores everything needed to actually call
    // out to that operator's API: their base web address, how to authenticate, and (via
    // Endpoints below) which URL path does what.
    public class OperatorIntegration : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }

        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(300)]
        public string BaseUrl { get; set; } = string.Empty; // The operator's own API address.

        public IntegrationAuthType AuthType { get; set; } = IntegrationAuthType.ApiKey;

        [MaxLength(120)]
        public string? ApiKeyHeaderName { get; set; }

        // Store encrypted/secret-managed values only; never store plain API secrets in production.
        [MaxLength(1000)]
        public string? SecretReference { get; set; }

        public int TimeoutSeconds { get; set; } = 30;
        public bool IsActive { get; set; } = true;
        public DateTime? LastSuccessfulSyncAtUtc { get; set; }

        public BusOperator BusOperator { get; set; } = default!;
        public ICollection<OperatorIntegrationEndpoint> Endpoints { get; set; } = new List<OperatorIntegrationEndpoint>();

        // These four "Mapping" collections are the translation dictionaries between OUR ids
        // and the operator's own ids for the same real-world thing (their route/trip/seat/booking).
        public ICollection<ExternalRouteMapping> RouteMappings { get; set; } = new List<ExternalRouteMapping>();
        public ICollection<ExternalTripMapping> TripMappings { get; set; } = new List<ExternalTripMapping>();
        public ICollection<ExternalSeatMapping> SeatMappings { get; set; } = new List<ExternalSeatMapping>();
        public ICollection<ExternalBookingMapping> BookingMappings { get; set; } = new List<ExternalBookingMapping>();

        public ICollection<IntegrationSyncLog> SyncLogs { get; set; } = new List<IntegrationSyncLog>(); // Every time WE called THEM.
        public ICollection<IntegrationWebhookLog> WebhookLogs { get; set; } = new List<IntegrationWebhookLog>(); // Every time THEY called US.
    }
}
