using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;

namespace TicketPortal.Api.Models.Finance
{
    // How much commission we take from ONE operator, for ONE sale channel. An operator can
    // have a different rate for online sales vs. counter-sale ERP usage — that's exactly what
    // SaleChannel here controls — and rules can optionally be narrowed further to one specific
    // route.
    public class CommissionRule : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid? OperatorContractId { get; set; }
        public Guid? BusRouteId { get; set; } // Null = applies to all of this operator's routes.

        // Use SaleChannel.Online for online-ticket commission, and SaleChannel.Counter for the
        // per-ticket fee an operator owes for using our ERP at their own cash counter.
        public SaleChannel SaleChannel { get; set; }
        public CommissionType CommissionType { get; set; } = CommissionType.Percentage;
        public decimal CommissionValue { get; set; } // e.g. 10 (meaning 10%) or a flat amount, depending on CommissionType.
        public DateOnly EffectiveFrom { get; set; }
        public DateOnly? EffectiveTo { get; set; }
        public bool IsActive { get; set; } = true;

        public BusOperator BusOperator { get; set; } = default!;
        public OperatorContract? OperatorContract { get; set; }
        public BusRoute? BusRoute { get; set; }
    }
}
