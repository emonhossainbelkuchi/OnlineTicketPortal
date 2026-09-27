using TicketPortal.Api.Models.People;
using Microsoft.AspNetCore.Identity;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Identity
{
    // Every person who can log in — customer, staff, counter agent, admin — has exactly one
    // row here. This is ASP.NET's built-in login account (handles password, email, etc.).
    // It does NOT hold business details like "date of birth" or "job title" — those live
    // in CustomerProfile or StaffProfile, one of which gets attached to a user depending on
    // whether they're a customer or an internal staff member.
    public class ApplicationUser : IdentityUser<Guid>
    {
        [MaxLength(120)]
        public string FullName { get; set; } = string.Empty;

        // We disable accounts instead of deleting login records, so history (who booked what,
        // who processed what) is never lost.
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAtUtc { get; set; }

        // Only ONE of these two will actually be filled in for a given user — a customer gets
        // a CustomerProfile, an internal staff member gets a StaffProfile.
        public CustomerProfile? CustomerProfile { get; set; }
        public StaffProfile? StaffProfile { get; set; }
    }
}
