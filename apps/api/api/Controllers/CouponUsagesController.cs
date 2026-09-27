using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Marketing;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // This is the record of every time a Coupon was actually used — it's what
    // CouponRedemptionService checks to enforce UsageLimit/PerUserLimit, so it can never be
    // client-writable directly (a client used to be able to POST any
    // CouponId/BookingId/DiscountApplied here with none of the coupon's own rules checked).
    // The only way a row appears here now is through Redeem below, which hands everything to
    // CouponRedemptionService. No generic PUT/DELETE either — a redemption record is a fact
    // about what already happened, not something to edit or take back after the fact.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CouponUsagesController(AppDbContext db, CouponRedemptionService couponRedemptionService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.CouponUsages.AsQueryable();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff"))
            {
                var userId = GetCurrentUserId();
                query = query.Where(u => db.CustomerProfiles.Any(cp =>
                    cp.Id == u.CustomerProfileId && cp.UserId == userId));
            }

            var items = await query.OrderByDescending(u => u.CreatedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.CouponUsages.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        // The one way a CouponUsage is ever created. The caller supplies a code and a booking —
        // never a discount amount or whose usage it is — CouponRedemptionService works both of
        // those out itself, from the coupon's own rules and the booking's real owner.
        [HttpPost("redeem")]
        public async Task<IActionResult> Redeem(CouponRedeemDto dto)
        {
            var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == dto.BookingId);
            if (booking == null) return NotFound(new { message = "Booking not found." });

            if (booking.CustomerProfileId == null)
            {
                return BadRequest(new { message = "This booking has no customer profile — coupons can't be redeemed on a guest checkout." });
            }

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff"))
            {
                var userId = GetCurrentUserId();
                var owns = await db.CustomerProfiles.AnyAsync(cp =>
                    cp.Id == booking.CustomerProfileId && cp.UserId == userId);
                if (!owns) return Forbid();
            }

            var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == dto.Code.Trim());
            if (coupon == null) return BadRequest(new { message = $"Coupon code '{dto.Code}' does not exist." });

            try
            {
                var usage = await couponRedemptionService.RedeemAsync(coupon.Id, dto.BookingId, booking.CustomerProfileId.Value);
                return CreatedAtAction(nameof(GetById), new { id = usage.Id }, ToResponseDto(usage));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // No generic POST/PUT/DELETE on purpose — see the class comment above.

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private async Task<bool> CanAccessAsync(CouponUsage usage)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Staff")) return true;

            var userId = GetCurrentUserId();
            if (userId == null) return false;

            return await db.CustomerProfiles.AnyAsync(cp =>
                cp.Id == usage.CustomerProfileId && cp.UserId == userId);
        }

        private static CouponUsageResponseDto ToResponseDto(CouponUsage x) => new()
        {
            Id = x.Id,
            CouponId = x.CouponId,
            BookingId = x.BookingId,
            CustomerProfileId = x.CustomerProfileId,
            DiscountApplied = x.DiscountApplied,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
