using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Marketing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Purely presentational reference data — structurally fine as CRUD, it just needed an
    // admin-only gate on writes. Reading stays open to everyone: banners are meant to be shown
    // on the storefront.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PromoBannersController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await db.PromoBanners.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.PromoBanners.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(PromoBannerCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new PromoBanner
            {
                ImageUrl = dto.ImageUrl,
                LinkUrl = dto.LinkUrl,
                IsActive = dto.IsActive,
                DisplayOrder = dto.DisplayOrder,
            };

            db.PromoBanners.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, PromoBannerUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.PromoBanners.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "PromoBanner not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This PromoBanner was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.ImageUrl = dto.ImageUrl;
            item.LinkUrl = dto.LinkUrl;
            item.IsActive = dto.IsActive;
            item.DisplayOrder = dto.DisplayOrder;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This PromoBanner was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save PromoBanner.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.PromoBanners.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This PromoBanner was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this PromoBanner — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static PromoBannerResponseDto ToResponseDto(PromoBanner x) => new()
        {
            Id = x.Id,
            ImageUrl = x.ImageUrl,
            LinkUrl = x.LinkUrl,
            IsActive = x.IsActive,
            DisplayOrder = x.DisplayOrder,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}