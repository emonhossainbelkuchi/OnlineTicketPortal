using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Marketing;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Services
{
    // This is the ONLY place in the codebase allowed to create a CouponUsage or bump
    // Coupon.UsedCount. Before this existed, CouponUsagesController let any authenticated
    // client POST a CouponUsage with any CouponId/BookingId/DiscountApplied it liked —
    // Coupon.IsActive, the valid-date window, UsageLimit and PerUserLimit were never
    // actually checked, so a client could apply any coupon to any booking for any discount.
    public class CouponRedemptionService
    {
        private readonly AppDbContext _db;

        public CouponRedemptionService(AppDbContext db)
        {
            _db = db;
        }

        // Validates every rule the Coupon itself carries, then records one CouponUsage row
        // and increments Coupon.UsedCount to match — the two always move together so
        // UsedCount can never drift from the real number of CouponUsage rows.
        public async Task<CouponUsage> RedeemAsync(Guid couponId, Guid bookingId, Guid customerProfileId)
        {
            var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Id == couponId)
                ?? throw new InvalidOperationException($"Coupon {couponId} does not exist.");

            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId)
                ?? throw new InvalidOperationException($"Booking {bookingId} does not exist.");

            // Same status gate as PaymentConfirmationService.InitiatePaymentAsync — once a
            // booking has moved past Draft/PendingPayment (payment initiated, confirmed,
            // cancelled, etc.) its pricing is locked, so a coupon can no longer change an
            // amount that's already been charged or is mid-charge.
            if (booking.Status != BookingStatus.PendingPayment && booking.Status != BookingStatus.Draft)
            {
                throw new InvalidOperationException(
                    $"Booking {bookingId} is {booking.Status} and can no longer have a coupon applied.");
            }

            if (!coupon.IsActive)
            {
                throw new InvalidOperationException($"Coupon '{coupon.Code}' is not active.");
            }

            var now = DateTime.UtcNow;
            if (now < coupon.ValidFromUtc || now > coupon.ValidToUtc)
            {
                throw new InvalidOperationException(
                    $"Coupon '{coupon.Code}' is only valid from {coupon.ValidFromUtc:yyyy-MM-dd} " +
                    $"to {coupon.ValidToUtc:yyyy-MM-dd}.");
            }

            if (coupon.UsageLimit.HasValue)
            {
                var totalUses = await _db.CouponUsages.CountAsync(u => u.CouponId == couponId);
                if (totalUses >= coupon.UsageLimit.Value)
                {
                    throw new InvalidOperationException(
                        $"Coupon '{coupon.Code}' has reached its usage limit ({coupon.UsageLimit.Value}).");
                }
            }

            if (coupon.PerUserLimit.HasValue)
            {
                var customerUses = await _db.CouponUsages.CountAsync(
                    u => u.CouponId == couponId && u.CustomerProfileId == customerProfileId);
                if (customerUses >= coupon.PerUserLimit.Value)
                {
                    throw new InvalidOperationException(
                        $"You've already used coupon '{coupon.Code}' the maximum " +
                        $"({coupon.PerUserLimit.Value}) number of times allowed.");
                }
            }

            if (coupon.MinBookingAmount.HasValue && booking.GrandTotal < coupon.MinBookingAmount.Value)
            {
                throw new InvalidOperationException(
                    $"Coupon '{coupon.Code}' requires a minimum booking amount of " +
                    $"{coupon.MinBookingAmount.Value:0.##} {booking.Currency}.");
            }

            if (booking.CouponId.HasValue)
            {
                throw new InvalidOperationException($"Booking {bookingId} already has a coupon applied.");
            }

            var discount = coupon.Type switch
            {
                CouponType.FixedAmount => coupon.DiscountAmount ?? 0m,
                CouponType.Percentage => booking.GrandTotal * ((coupon.DiscountPercentage ?? 0m) / 100m),
                _ => 0m
            };

            if (coupon.Type == CouponType.Percentage && coupon.MaxDiscountAmount.HasValue)
            {
                discount = Math.Min(discount, coupon.MaxDiscountAmount.Value);
            }

            // A discount can never exceed what the booking is actually worth — guards against
            // a large FixedAmount coupon pushing the effective total negative.
            discount = Math.Round(Math.Min(discount, booking.GrandTotal), 2);

            var usage = new CouponUsage
            {
                CouponId = couponId,
                BookingId = bookingId,
                CustomerProfileId = customerProfileId,
                DiscountApplied = discount,
            };

            _db.CouponUsages.Add(usage);
            coupon.UsedCount += 1;
            coupon.UpdatedAtUtc = DateTime.UtcNow;

            // Links the booking back to the coupon that was used on it, and actually applies
            // the discount — this is the fix: previously CouponUsage.DiscountApplied was
            // computed and stored but never touched the booking itself, so GrandTotal (and
            // therefore what PaymentConfirmationService.InitiatePaymentAsync charges) never
            // moved. RecomputeTotals() is the same formula BookingsController.Create uses for
            // TaxAmount, kept in one place so the two pricing paths can't drift apart.
            booking.CouponId = couponId;
            booking.DiscountAmount = discount;
            booking.RecomputeTotals();

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // Two customers can race to redeem the same limited coupon at the same
                // moment: both pass the UsageLimit check above against the same "totalUses
                // under the limit" snapshot, but only the first SaveChangesAsync actually
                // lands — Coupon.RowVersion (an EF Core optimistic-concurrency token) makes
                // the second one throw DbUpdateConcurrencyException instead of silently
                // letting both redemptions through and corrupting UsedCount. Data was never
                // actually wrong either way; this only changes what the LOSER of the race is
                // told. Previously that exception fell straight through to Program.cs's global
                // handler, which treats any DbUpdateException as a generic, unhelpful 500 ("A
                // database error occurred while saving your changes."). Re-checking the limit
                // here and throwing the same InvalidOperationException every other validation
                // failure above uses gets it the same clean 400 message instead.
                var currentTotalUses = await _db.CouponUsages.CountAsync(u => u.CouponId == couponId);
                if (coupon.UsageLimit.HasValue && currentTotalUses >= coupon.UsageLimit.Value)
                {
                    throw new InvalidOperationException(
                        $"Coupon '{coupon.Code}' has reached its usage limit ({coupon.UsageLimit.Value}).");
                }

                throw new InvalidOperationException(
                    $"Coupon '{coupon.Code}' was just redeemed by another request. Please try again.");
            }

            return usage;
        }
    }
}
