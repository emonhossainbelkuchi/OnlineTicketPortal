using TicketPortal.Api.Models.Common;
using System;

namespace TicketPortal.Api.Models.People
{
    // Which physical SalesCounter(s) a CounterStaff member is currently allowed to sell from.
    // Without this table, "Counter.Sell" alone would let any counter clerk of an operator sell
    // from ANY of that operator's counters — the exact gap RBAC Amendment v3 task 4 closes
    // ("Green Line CounterStaff at Gabtoli must not be able to complete a sale against Kalyanpur").
    //
    // An Operator Manager/BusOwner is NOT restricted by this table (see
    // CurrentActor.CanUseCounter) — it only scopes CounterStaff.
    //
    // One staff member can (in principle) hold more than one active assignment; uniqueness of
    // "no duplicate active row for the same (StaffProfileId, SalesCounterId) pair" is enforced
    // in StaffCounterAssignmentsController rather than a DB constraint, matching this codebase's
    // existing convention of not using filtered unique indexes for soft-delete-aware
    // uniqueness (see AppDbContext.ConfigureSoftDeleteFilters).
    public class StaffSalesCounterAssignment : AuditableEntity
    {
        public Guid StaffProfileId { get; set; }
        public Guid SalesCounterId { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime? EffectiveFromUtc { get; set; }
        public DateTime? EffectiveToUtc { get; set; } // Null = open-ended.

        public StaffProfile StaffProfile { get; set; } = default!;
        public SalesCounter SalesCounter { get; set; } = default!;
    }
}
