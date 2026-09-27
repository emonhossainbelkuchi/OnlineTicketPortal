using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Identity;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Diagnostics
{
    // A compliance-style record of exactly what changed on a row and who changed it —
    // OldValuesJson/NewValuesJson hold a before-and-after snapshot, which is what makes this
    // different from the lighter-weight ActivityLog (which just says an action happened, not
    // exactly what data changed). Uses the plain BaseEntity since an audit entry itself should
    // never be edited or soft-deleted — that would defeat its whole purpose.
    public class AuditLog : BaseEntity
    {
        public Guid? UserId { get; set; }

        [MaxLength(120)]
        public string EntityName { get; set; } = string.Empty; // Which table changed.

        [MaxLength(64)]
        public string EntityId { get; set; } = string.Empty; // Which row.

        [MaxLength(40)]
        public string Action { get; set; } = string.Empty; // Created / Updated / Deleted.

        public string? OldValuesJson { get; set; }
        public string? NewValuesJson { get; set; }

        [MaxLength(80)]
        public string? IpAddress { get; set; }

        [MaxLength(300)]
        public string? UserAgent { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public ApplicationUser? User { get; set; }
    }
}
