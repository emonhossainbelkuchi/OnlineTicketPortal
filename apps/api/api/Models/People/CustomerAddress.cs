using TicketPortal.Api.Models.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.People
{
    // A saved address for a customer (e.g. for delivery of a physical ticket, or just
    // convenience at checkout). A customer can have several; IsDefault marks the one to
    // pre-fill.
    public class CustomerAddress : AuditableEntity
    {
        public Guid CustomerProfileId { get; set; }

        [MaxLength(40)]
        public string Label { get; set; } = string.Empty; // e.g. "Home", "Office".

        [MaxLength(250)]
        public string AddressLine { get; set; } = string.Empty;

        [MaxLength(80)]
        public string City { get; set; } = string.Empty;

        [MaxLength(80)]
        public string District { get; set; } = string.Empty;

        [MaxLength(80)]
        public string Country { get; set; } = "Bangladesh";

        public bool IsDefault { get; set; }

        public CustomerProfile CustomerProfile { get; set; } = default!;
    }
}
