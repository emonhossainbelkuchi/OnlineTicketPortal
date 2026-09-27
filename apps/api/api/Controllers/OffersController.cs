using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Marketing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Reference/marketing data — structurally fine as CRUD, it just needed an admin-only gate
    // on writes so a client can't create or edit promotional campaigns themselves. Reading
    // stays open to everyone: offers are meant to be shown to customers browsing the site.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OffersController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await db.Offers.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.Offers.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(OfferCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new Offer
            {
                BusOperatorId = dto.BusOperatorId,
                Title = dto.Title,
                Description = dto.Description,
                Status = dto.Status,
                StartDateUtc = dto.StartDateUtc,
                EndDateUtc = dto.EndDateUtc,
            };

            db.Offers.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, OfferUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Offers.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "Offer not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This Offer was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.BusOperatorId = dto.BusOperatorId;
            item.Title = dto.Title;
            item.Description = dto.Description;
            item.Status = dto.Status;
            item.StartDateUtc = dto.StartDateUtc;
            item.EndDateUtc = dto.EndDateUtc;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Offer was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save Offer.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Offers.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Offer was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this Offer — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static OfferResponseDto ToResponseDto(Offer x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            Title = x.Title,
            Description = x.Description,
            Status = x.Status,
            StartDateUtc = x.StartDateUtc,
            EndDateUtc = x.EndDateUtc,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}