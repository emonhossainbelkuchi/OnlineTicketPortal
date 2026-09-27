using TicketPortal.Api.Models.Common;
using System;

namespace TicketPortal.Api.Models.Bookings
{
    // One tier of a CancellationPolicy — e.g. "cancel more than 24 hours before departure,
    // get 80% refund" is one row here. A policy usually has several of these rules covering
    // different time windows before departure.
    public class CancellationPolicyRule : AuditableEntity
    {
        public Guid CancellationPolicyId { get; set; }

        public int MinHoursBeforeDeparture { get; set; }
        public int? MaxHoursBeforeDeparture { get; set; } // Null = no upper bound (this is the "earliest" tier).
        public decimal RefundPercentage { get; set; }
        public decimal FixedCancellationFee { get; set; }

        public CancellationPolicy CancellationPolicy { get; set; } = default!;
    }
}
