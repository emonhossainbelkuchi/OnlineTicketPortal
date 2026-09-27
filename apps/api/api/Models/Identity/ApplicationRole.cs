using Microsoft.AspNetCore.Identity;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Identity
{
    // A LOGIN role, used only to decide what someone is ALLOWED TO DO in the system
    // (e.g. "Admin", "FinanceOfficer", "CounterStaff"). This is plumbing from ASP.NET's
    // built-in login system (Identity), not a business concept.
    //
    // Don't confuse this with StaffRole (in Models/Enums) — StaffRole describes someone's
    // JOB (Driver, Supervisor, BusOwner...) for HR/reporting purposes. A person's login
    // permissions (ApplicationRole) and their job title (StaffRole) are two separate things
    // and are not automatically kept in sync — that has to be done deliberately wherever
    // staff accounts are created or their job changes.
    public class ApplicationRole : IdentityRole<Guid>
    {
        [MaxLength(250)]
        public string? Description { get; set; }
    }
}
