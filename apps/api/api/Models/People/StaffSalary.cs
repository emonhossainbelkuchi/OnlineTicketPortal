using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.People
{
    // One pay-period's salary record for a staff member — basic HR/payroll tracking, separate
    // from the operator/platform commission finance tables in Models/Finance.
    public class StaffSalary : AuditableEntity
    {
        public Guid StaffProfileId { get; set; }
        public DateOnly PayPeriodStart { get; set; }
        public DateOnly PayPeriodEnd { get; set; }
        public decimal Amount { get; set; }
        public bool IsPaid { get; set; }
        public DateTime? PaidAtUtc { get; set; }

        [MaxLength(120)]
        public string? PaymentReference { get; set; }

        public StaffProfile StaffProfile { get; set; } = default!;
    }
}
