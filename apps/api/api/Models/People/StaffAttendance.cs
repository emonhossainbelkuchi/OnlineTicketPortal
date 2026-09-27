using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.People
{
    // One day's attendance record for one staff member — basic HR tracking.
    public class StaffAttendance : AuditableEntity
    {
        public Guid StaffProfileId { get; set; }
        public DateOnly AttendanceDate { get; set; }
        public AttendanceStatus Status { get; set; }

        [MaxLength(250)]
        public string? Remarks { get; set; }

        public StaffProfile StaffProfile { get; set; } = default!;
    }
}
