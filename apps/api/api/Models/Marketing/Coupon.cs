using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.Marketing
{
    // A redeemable discount code a customer can type in at checkout (e.g. "SAVE100").
    // UsageLimit/PerUserLimit/UsedCount together stop it being used more times than intended.
    public class Coupon : AuditableEntity
    {
        [MaxLength(40)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? Description { get; set; }

        public CouponType Type { get; set; } // Fixed amount off, or a percentage off.
        public decimal? DiscountAmount { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? MaxDiscountAmount { get; set; } // Caps how much a percentage discount can be worth.
        public decimal? MinBookingAmount { get; set; } // Booking must be at least this much to qualify.
        public int? UsageLimit { get; set; } // Total times this code can ever be used, across everyone.
        public int UsedCount { get; set; } // Running count, checked against UsageLimit.
        public int? PerUserLimit { get; set; } // Times any ONE customer can use it.
        public DateTime ValidFromUtc { get; set; }
        public DateTime ValidToUtc { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<CouponUsage> Usages { get; set; } = new List<CouponUsage>(); // One row per time it was actually redeemed.
    }
}
