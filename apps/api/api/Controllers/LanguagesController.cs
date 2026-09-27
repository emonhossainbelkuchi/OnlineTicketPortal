// Piece 1 (Identity, Access Control & Platform Configuration) — Admin-only gate. 🟢 tier per the
// completion plan: structurally fine as generic CRUD, this only ever needed locking down, no new
// service. Was reachable read/write by any authenticated user; now Admin-only end to end — which
// locales the platform supports; low-risk on its own, but reference data all the same. Real
// Staff/Operator role-scoping (StaffProfile.BusOperatorId) doesn't apply here since this is
// platform-wide reference/finance data, not any one operator's own rows.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class LanguagesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin"))
            {
                return Ok(Array.Empty<LanguageResponseDto>());
            }

            var items = await db.Languages.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Languages.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(LanguageCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new Language
            {
                Code = dto.Code,
                Name = dto.Name,
                IsDefault = dto.IsDefault,
                IsActive = dto.IsActive,
            };

            db.Languages.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, LanguageUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Languages.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "Language not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This Language was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.Code = dto.Code;
            item.Name = dto.Name;
            item.IsDefault = dto.IsDefault;
            item.IsActive = dto.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Language was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save Language.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Languages.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Language was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this Language — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static LanguageResponseDto ToResponseDto(Language x) => new()
        {
            Id = x.Id,
            Code = x.Code,
            Name = x.Name,
            IsDefault = x.IsDefault,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}