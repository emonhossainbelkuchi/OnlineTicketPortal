using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Marketing
{
    // A promotional campaign shown to customers (e.g. "20% off all Green Line trips this
    // week"). Can belong to one operator, or be platform-wide if BusOperatorId is null.
    // This is separate from Coupon — an Offer is a marketing announcement; a Coupon is the
    // actual code a customer types in to redeem a discount.
    public class Offer : AuditableEntity
    {
        public Guid? BusOperatorId { get; set; }

        [MaxLength(120)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public OfferStatus Status { get; set; } = OfferStatus.Active;
        public DateTime StartDateUtc { get; set; }
        public DateTime EndDateUtc { get; set; }

        public BusOperator? BusOperator { get; set; }
    }
}
