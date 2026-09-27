using TicketPortal.Api.Models.Common;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Configuration
{
    // A simple "settings box" for whole-platform values that change sometimes but don't need
    // their own dedicated table — e.g. a support email address, a default hold length, a
    // maintenance-mode flag. Stored as Key/Value text so new settings can be added without
    // a code change or a database migration.
    public class SystemSetting : AuditableEntity
    {
        [MaxLength(120)]
        public string Key { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string Value { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? Description { get; set; } // Plain-English note on what this setting controls.
    }
}
