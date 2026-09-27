using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.BusFleet
{
    // One photo of a bus, shown to customers while browsing search results.
    public class BusImage : AuditableEntity
    {
        public Guid BusId { get; set; }

        [MaxLength(300)]
        public string ImageUrl { get; set; } = string.Empty;

        [MaxLength(120)]
        public string? Caption { get; set; }

        public bool IsPrimary { get; set; }   // The main photo shown first.
        public int DisplayOrder { get; set; } // Order of the rest, in a gallery.

        public Bus Bus { get; set; } = default!;
    }
}
