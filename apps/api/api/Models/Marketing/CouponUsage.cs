using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.People;
using System;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.Marketing
{
    // ONE time a Coupon was actually used, on one Booking. Exists so we can enforce
    // PerUserLimit (by checking how many times this customer already used this coupon) and
    // report on how much a coupon has cost us in total discounts given.
    public class CouponUsage : AuditableEntity
    {
        public Guid CouponId { get; set; }
        public Guid BookingId { get; set; }
        public Guid? CustomerProfileId { get; set; }
        public decimal DiscountApplied { get; set; } // The actual discount amount this one time.

        public Coupon Coupon { get; set; } = default!;
        public Booking Booking { get; set; } = default!;
        public CustomerProfile? CustomerProfile { get; set; }
    }
}
