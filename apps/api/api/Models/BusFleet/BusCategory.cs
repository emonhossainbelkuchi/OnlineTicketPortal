using TicketPortal.Api.Models.Common;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.BusFleet
{
    // A marketing-friendly grouping of buses (separate from the technical BusType enum) —
    // e.g. "Premium Fleet", "Standard Fleet" — for filtering/branding on the search results page.
    public class BusCategory : AuditableEntity
    {
        [MaxLength(80)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;

        public ICollection<Bus> Buses { get; set; } = new List<Bus>();
    }
}
