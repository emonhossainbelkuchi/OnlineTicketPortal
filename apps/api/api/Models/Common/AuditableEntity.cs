using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Common
{
    // Almost every real business table (Booking, Payment, Trip, Operator, etc.) inherits from
    // this instead of BaseEntity directly. It adds the "who/when" history every business record
    // needs, plus a safe way to delete something without actually losing the data.
    public abstract class AuditableEntity : BaseEntity
    {
        // When this row was first created, and who created it (staff, customer, or system job).
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public Guid? CreatedByUserId { get; set; }

        // Filled in only after the first edit. Null means "never been changed since creation".
        public DateTime? UpdatedAtUtc { get; set; }
        public Guid? UpdatedByUserId { get; set; }

        // We never hard-delete real business data (a Booking, a Payment...) because that would
        // destroy financial history. Instead we flag it as deleted and hide it from normal
        // queries (AppDbContext does this hiding automatically for every table using this class).
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAtUtc { get; set; }
        public Guid? DeletedByUserId { get; set; }

        // A hidden version number the database bumps automatically on every update to this row.
        // This is our safety net against two people/processes overwriting each other's changes
        // at the exact same time (for example, two admin staff editing the same Trip together) —
        // the second save fails loudly instead of silently wiping out the first one.
        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();

        // Helper for soft-deleting: marks the row deleted and stamps who/when, in one call,
        // instead of every part of the app remembering to set 4 fields by hand.
        public void MarkDeleted(Guid? deletedByUserId = null)
        {
            IsDeleted = true;
            DeletedAtUtc = DateTime.UtcNow;
            DeletedByUserId = deletedByUserId;
            UpdatedAtUtc = DateTime.UtcNow;
            UpdatedByUserId = deletedByUserId;
        }
    }
}
