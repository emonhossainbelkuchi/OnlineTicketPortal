using TicketPortal.Api.Models.Common;
using System;

namespace TicketPortal.Api.Models.BusFleet
{
    // Join table: which amenities does THIS bus actually have. Uses the plain BaseEntity
    // (not AuditableEntity) because a mapping row like this has no real history worth
    // tracking beyond "does it exist right now" — it's just a link, not a business fact.
    public class BusAmenityMapping : BaseEntity
    {
        public Guid BusId { get; set; }
        public Guid BusAmenityId { get; set; }

        public Bus Bus { get; set; } = default!;
        public BusAmenity Amenity { get; set; } = default!;
    }
}
