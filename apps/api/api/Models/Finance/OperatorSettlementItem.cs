using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;

namespace TicketPortal.Api.Models.Finance
{
    // ONE line inside an OperatorSettlement — the fare breakdown for one booking/ticket that's
    // part of this settlement run (fare, our cut, the gateway's cut, any refund, and what's
    // left over). PlatformLedgerId again traces this line back to the exact diary entry it came from.
    public class OperatorSettlementItem : AuditableEntity
    {
        public Guid OperatorSettlementId { get; set; }
        public Guid? BookingId { get; set; }
        public Guid? TicketId { get; set; }

        public Guid? PlatformLedgerId { get; set; }

        public StatementItemType ItemType { get; set; }
        public SaleChannel SaleChannel { get; set; }
        public decimal TicketFare { get; set; }
        public decimal PlatformCharge { get; set; }
        public decimal GatewayCharge { get; set; }
        public decimal RefundAmount { get; set; }
        public decimal NetAmount { get; set; }

        public OperatorSettlement OperatorSettlement { get; set; } = default!;
        public Booking? Booking { get; set; }
        public Ticket? Ticket { get; set; }
        public PlatformLedger? PlatformLedger { get; set; }
    }
}
