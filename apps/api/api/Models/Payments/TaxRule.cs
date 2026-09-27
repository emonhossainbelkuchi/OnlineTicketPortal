using TicketPortal.Api.Models.Common;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Payments
{
    // A tax percentage that can be applied to a booking (e.g. VAT) — kept as data instead of a
    // hardcoded number so the rate can be changed without a deployment.
    public class TaxRule : AuditableEntity
    {
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        public decimal Percentage { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
