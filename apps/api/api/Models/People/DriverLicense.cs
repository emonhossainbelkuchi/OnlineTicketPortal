using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.People
{
    // A driver's licence details, kept for compliance — one per staff member who's a driver.
    public class DriverLicense : AuditableEntity
    {
        public Guid StaffProfileId { get; set; }

        [MaxLength(40)]
        public string LicenseNumber { get; set; } = string.Empty;

        public LicenseType Type { get; set; }
        public DateOnly IssueDate { get; set; }
        public DateOnly ExpiryDate { get; set; } // Useful for warning HR before it lapses.

        public StaffProfile StaffProfile { get; set; } = default!;
    }
}
