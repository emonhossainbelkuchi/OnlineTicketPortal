using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Identity;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.People
{
    // The business-side profile for anyone who works in the system (our own staff, or an
    // operator's staff) — attached one-to-one to a login account (ApplicationUser). Role here
    // is their JOB (see StaffRole), which is separate from what they're allowed to click on
    // in the system (that's ApplicationRole, the login permission).
    public class StaffProfile : AuditableEntity
    {
        public Guid UserId { get; set; }
        public Guid? BusOperatorId { get; set; } // Null for our own platform staff, set for an operator's staff.

        [MaxLength(50)]
        public string EmployeeCode { get; set; } = string.Empty;

        public StaffRole Role { get; set; }

        [MaxLength(30)]
        public string? NationalIdNumber { get; set; }

        public DateOnly? JoiningDate { get; set; }

        [MaxLength(250)]
        public string? Address { get; set; }

        public int TotalTripsCompleted { get; set; } // Running count, mainly relevant for drivers.
        public bool IsActive { get; set; } = true;

        public ApplicationUser User { get; set; } = default!;
        public BusOperator? BusOperator { get; set; }
        public DriverLicense? DriverLicense { get; set; }
        public ICollection<TripCrew> TripCrewAssignments { get; set; } = new List<TripCrew>();
        public ICollection<StaffAttendance> AttendanceRecords { get; set; } = new List<StaffAttendance>();
        public ICollection<StaffSalary> SalaryRecords { get; set; } = new List<StaffSalary>();
        public ICollection<StaffSalesCounterAssignment> CounterAssignments { get; set; } = new List<StaffSalesCounterAssignment>();
    }
}
