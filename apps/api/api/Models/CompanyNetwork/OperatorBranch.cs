using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.People;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.CompanyNetwork
{
    // One physical office/branch belonging to an operator (separate from a Terminal, which is
    // a shared bus station). An operator can run several SalesCounters out of one branch.
    public class OperatorBranch : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }

        [MaxLength(120)]
        public string BranchName { get; set; } = string.Empty;

        [MaxLength(250)]
        public string Address { get; set; } = string.Empty;

        [MaxLength(30)]
        public string Phone { get; set; } = string.Empty;

        [MaxLength(80)]
        public string City { get; set; } = string.Empty;

        [MaxLength(80)]
        public string District { get; set; } = string.Empty;

        public BusOperator BusOperator { get; set; } = default!;
        public ICollection<SalesCounter> SalesCounters { get; set; } = new List<SalesCounter>();
    }
}
