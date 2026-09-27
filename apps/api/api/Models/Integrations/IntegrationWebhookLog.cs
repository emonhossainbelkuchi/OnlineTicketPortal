using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Integrations
{
    // The reverse direction of IntegrationSyncLog: a record of one notification an operator's
    // ERP sent TO US (e.g. "this booking's status just changed on our end"). ExternalEventId
    // is meant to let us recognise if the same notification arrives twice, so we don't process
    // it a second time by mistake.
    public class IntegrationWebhookLog : AuditableEntity
    {
        public Guid OperatorIntegrationId { get; set; }

        [MaxLength(120)]
        public string? ExternalEventId { get; set; }

        [MaxLength(80)]
        public string EventType { get; set; } = string.Empty;

        public DateTime ReceivedAtUtc { get; set; } = DateTime.UtcNow;
        public bool IsProcessed { get; set; }
        public DateTime? ProcessedAtUtc { get; set; }
        public string? PayloadJson { get; set; }

        [MaxLength(1000)]
        public string? ErrorMessage { get; set; }

        public OperatorIntegration OperatorIntegration { get; set; } = default!;
    }
}
