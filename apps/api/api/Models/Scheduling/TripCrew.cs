using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.People;
using System;

namespace TicketPortal.Api.Models.Scheduling
{
    // Which staff member is doing which job (driver, helper, etc.) on ONE specific trip.
    public class TripCrew : AuditableEntity
    {
        public Guid TripId { get; set; }
        public Guid StaffProfileId { get; set; }
        public CrewRole Role { get; set; }
        public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;

        public Trip Trip { get; set; } = default!;
        public StaffProfile StaffProfile { get; set; } = default!;
    }
}
