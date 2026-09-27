using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Identity;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Diagnostics
{
    // A lightweight "who did what" feed — e.g. for showing an admin an activity timeline.
    // Simpler than AuditLog: it says WHAT happened (Action, EntityName/EntityId) but not the
    // full before/after data, so it's cheaper to write and easier to display as a feed.
    public class ActivityLog : AuditableEntity
    {
        public Guid? UserId { get; set; }

        [MaxLength(120)]
        public string Action { get; set; } = string.Empty;

        [MaxLength(120)]
        public string? EntityName { get; set; }

        [MaxLength(64)]
        public string? EntityId { get; set; }

        [MaxLength(80)]
        public string? IpAddress { get; set; }

        public ApplicationUser? User { get; set; }
    }
}
