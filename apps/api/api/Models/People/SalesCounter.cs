using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.People
{
    // ONE physical cash counter where an operator sells tickets in person. This only exists
    // for operators using our ERP for their counter sales (see BusOperator.InventoryMode) —
    // an operator running their own ERP end-to-end has no reason to have rows here, since we
    // have no visibility into (or business in) their counter sales at all.
    public class SalesCounter : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid TerminalId { get; set; }
        public Guid? OperatorBranchId { get; set; }

        [MaxLength(120)]
        public string CounterName { get; set; } = string.Empty;

        [MaxLength(30)]
        public string CounterCode { get; set; } = string.Empty;

        [MaxLength(30)]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(250)]
        public string Address { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public BusOperator BusOperator { get; set; } = default!;
        public Terminal Terminal { get; set; } = default!;
        public OperatorBranch? OperatorBranch { get; set; }
        // Every cash-counter sale made here — the cash itself stays with the operator, but we
        // still record the sale so we can bill them our per-ticket ERP commission.
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<StaffSalesCounterAssignment> StaffAssignments { get; set; } = new List<StaffSalesCounterAssignment>();
    }
}
