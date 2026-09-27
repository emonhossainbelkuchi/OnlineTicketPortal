using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.People
{
    // A third-party travel agent who sells tickets on behalf of an operator (or the platform
    // generally) and earns their own commission for it — a different sales channel again from
    // "online" or "counter".
    public class Agent : AuditableEntity
    {
        public Guid? BusOperatorId { get; set; } // Null if this agent isn't tied to one specific operator.

        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(40)]
        public string AgencyCode { get; set; } = string.Empty;

        [MaxLength(120)]
        public string ContactPerson { get; set; } = string.Empty;

        [MaxLength(30)]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(120)]
        public string? Email { get; set; }

        [MaxLength(250)]
        public string Address { get; set; } = string.Empty;

        public decimal CommissionPercentage { get; set; }
        public bool IsActive { get; set; } = true;

        public BusOperator? BusOperator { get; set; }
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}
