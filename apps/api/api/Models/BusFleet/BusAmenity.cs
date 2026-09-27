using TicketPortal.Api.Models.Common;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.BusFleet
{
    // One selectable feature a bus can have, e.g. "WiFi", "Charging Port", "Blanket".
    // Kept as its own table (instead of a fixed list of boolean columns on Bus) so new
    // amenities can be added later without a schema change.
    public class BusAmenity : AuditableEntity
    {
        [MaxLength(80)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? IconUrl { get; set; }

        public bool IsActive { get; set; } = true;

        public ICollection<BusAmenityMapping> BusMappings { get; set; } = new List<BusAmenityMapping>();
    }
}
