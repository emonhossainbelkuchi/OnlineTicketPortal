using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Marketing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Defining a coupon (its code, discount rules, limits) is Admin-only — a customer being
    // able to create or edit a coupon's own rules would let them hand themselves any discount
    // they like. Reading the catalog stays open to any authenticated user, same as before.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CouponsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await db.Coupons.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.Coupons.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CouponCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new Coupon
            {
                Code = dto.Code,
                Description = dto.Description,
                Type = dto.Type,
                DiscountAmount = dto.DiscountAmount,
                DiscountPercentage = dto.DiscountPercentage,
                MaxDiscountAmount = dto.MaxDiscountAmount,
                MinBookingAmount = dto.MinBookingAmount,
                UsageLimit = dto.UsageLimit,
                PerUserLimit = dto.PerUserLimit,
                ValidFromUtc = dto.ValidFromUtc,
                ValidToUtc = dto.ValidToUtc,
                IsActive = dto.IsActive,
            };

            db.Coupons.Add(item);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save Coupon — is the Code already in use?", details = error });
            }

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, CouponUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Coupons.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "Coupon not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This Coupon was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.Code = dto.Code;
            item.Description = dto.Description;
            item.Type = dto.Type;
            item.DiscountAmount = dto.DiscountAmount;
            item.DiscountPercentage = dto.DiscountPercentage;
            item.MaxDiscountAmount = dto.MaxDiscountAmount;
            item.MinBookingAmount = dto.MinBookingAmount;
            item.UsageLimit = dto.UsageLimit;
            item.PerUserLimit = dto.PerUserLimit;
            item.ValidFromUtc = dto.ValidFromUtc;
            item.ValidToUtc = dto.ValidToUtc;
            item.IsActive = dto.IsActive;
            // UsedCount is deliberately left untouched here — it only ever moves through
            // CouponRedemptionService, one real redemption at a time.
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Coupon was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save Coupon.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Coupons.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Coupon was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this Coupon — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static CouponResponseDto ToResponseDto(Coupon x) => new()
        {
            Id = x.Id,
            Code = x.Code,
            Description = x.Description,
            Type = x.Type,
            DiscountAmount = x.DiscountAmount,
            DiscountPercentage = x.DiscountPercentage,
            MaxDiscountAmount = x.MaxDiscountAmount,
            MinBookingAmount = x.MinBookingAmount,
            UsageLimit = x.UsageLimit,
            UsedCount = x.UsedCount,
            PerUserLimit = x.PerUserLimit,
            ValidFromUtc = x.ValidFromUtc,
            ValidToUtc = x.ValidToUtc,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
