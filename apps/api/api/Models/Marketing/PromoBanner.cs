using TicketPortal.Api.Models.Common;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Marketing
{
    // A homepage banner image/slide, e.g. for a seasonal promotion. Purely presentational.
    public class PromoBanner : AuditableEntity
    {
        [MaxLength(300)]
        public string ImageUrl { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? LinkUrl { get; set; } // Where tapping the banner takes the customer.

        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; }
    }
}
