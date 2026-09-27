using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Identity;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Diagnostics
{
    // One row per login attempt (successful or not) — basic security history. Uses the plain
    // BaseEntity, not AuditableEntity, because a login record is never edited or soft-deleted
    // after the fact; it's a permanent, unchangeable fact once written.
    public class LoginHistory : BaseEntity
    {
        public Guid UserId { get; set; }
        public DateTime LoginAtUtc { get; set; } = DateTime.UtcNow;

        [MaxLength(80)]
        public string? IpAddress { get; set; }

        [MaxLength(300)]
        public string? UserAgent { get; set; }

        public bool Success { get; set; }

        public ApplicationUser User { get; set; } = default!;
    }
}
