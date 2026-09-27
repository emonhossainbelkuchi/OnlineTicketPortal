using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Payments
{
    // The fee/display settings for one payment method under one provider — e.g. "Cards via
    // SSLCommerz charge a 2.5% fee". Separate from PaymentProvider itself so one provider can
    // support several methods (a gateway that accepts both cards and mobile banking), each
    // with their own fee structure.
    public class PaymentMethodConfiguration : AuditableEntity
    {
        public Guid PaymentProviderId { get; set; }
        public PaymentMethod Method { get; set; }

        [MaxLength(80)]
        public string DisplayName { get; set; } = string.Empty; // What the customer sees at checkout.

        public decimal? FixedFee { get; set; }
        public decimal? PercentageFee { get; set; }
        public bool IsActive { get; set; } = true;

        public PaymentProvider PaymentProvider { get; set; } = default!;
    }
}
