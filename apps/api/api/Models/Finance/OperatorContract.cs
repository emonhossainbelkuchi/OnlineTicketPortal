using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Finance
{
    // The commercial agreement with ONE operator — how often we settle up with them, and who
    // pays the payment gateway's fee on their online sales. This is the "parent" agreement
    // that individual CommissionRule rows attach to.
    public class OperatorContract : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }

        [MaxLength(60)]
        public string ContractNo { get; set; } = string.Empty;

        public DateOnly EffectiveFrom { get; set; }
        public DateOnly? EffectiveTo { get; set; }

        // How many days between settlement runs for this operator (the "certain time interval"
        // from the business plan) — e.g. 7 means we settle up with them weekly.
        public int SettlementIntervalDays { get; set; } = 7;

        public GatewayFeeBearer GatewayFeeBearer { get; set; } = GatewayFeeBearer.Operator;
        public bool IsActive { get; set; } = true;

        [MaxLength(500)]
        public string? Notes { get; set; }

        public BusOperator BusOperator { get; set; } = default!;
        public ICollection<CommissionRule> CommissionRules { get; set; } = new List<CommissionRule>();
    }
}
