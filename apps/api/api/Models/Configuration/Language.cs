using TicketPortal.Api.Models.Common;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Configuration
{
    // A language the site/app can be shown in (e.g. "en", "bn" for Bangla). Lets us add more
    // languages later just by adding a row here, instead of hardcoding a list in code.
    public class Language : AuditableEntity
    {
        [MaxLength(10)]
        public string Code { get; set; } = string.Empty; // e.g. "en", "bn"

        [MaxLength(80)]
        public string Name { get; set; } = string.Empty; // e.g. "English", "বাংলা"

        public bool IsDefault { get; set; } // The language shown when we can't tell the user's preference.
        public bool IsActive { get; set; } = true;
    }
}
