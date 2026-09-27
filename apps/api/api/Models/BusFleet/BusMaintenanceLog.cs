using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.BusFleet
{
    // An internal record of servicing/repairs done on a bus — purely operational bookkeeping
    // for the operator, not shown to customers.
    public class BusMaintenanceLog : AuditableEntity
    {
        public Guid BusId { get; set; }

        public DateTime MaintenanceDateUtc { get; set; }
        public int? OdometerKm { get; set; }

        [MaxLength(120)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        public decimal Cost { get; set; }
        public DateTime? NextDueDateUtc { get; set; } // When the next service is due.

        [MaxLength(120)]
        public string? PerformedBy { get; set; }

        public Bus Bus { get; set; } = default!;
    }
}
