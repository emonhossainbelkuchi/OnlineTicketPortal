using TicketPortal.Api.Models.Common;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Payments
{
    // A currency the platform can price/display in (BDT is the base/default). Exists so
    // supporting a new currency later is a config change, not a code change.
    public class Currency : AuditableEntity
    {
        [MaxLength(3)]
        public string Code { get; set; } = "BDT";

        [MaxLength(10)]
        public string Symbol { get; set; } = string.Empty; // e.g. "৳".

        public decimal ExchangeRateToBase { get; set; } = 1m; // How many of this currency equal 1 unit of the base currency.
        public bool IsBaseCurrency { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
