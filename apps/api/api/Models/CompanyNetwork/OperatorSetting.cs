using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.CompanyNetwork
{
    // Same idea as the platform-wide SystemSetting, but scoped to ONE operator — lets a
    // single operator have their own tweakable value (e.g. their own default hold length,
    // their own receipt footer text) without needing a new column on BusOperator for every
    // small setting anyone might want.
    public class OperatorSetting : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }

        [MaxLength(120)]
        public string Key { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string Value { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? Description { get; set; }

        public BusOperator BusOperator { get; set; } = default!;
    }
}
