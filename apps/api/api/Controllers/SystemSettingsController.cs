// Piece 1 (Identity, Access Control & Platform Configuration) — Admin-only gate. 🟢 tier per the
// completion plan: structurally fine as generic CRUD, this only ever needed locking down, no new
// service. Was reachable read/write by any authenticated user; now Admin-only end to end — free-
// form platform-wide key/value settings — letting anyone write to this is close to letting anyone
// reconfigure the app. Real Staff/Operator role-scoping (StaffProfile.BusOperatorId) doesn't
// apply here since this is platform-wide reference/finance data, not any one operator's own rows.

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
    public class SystemSettingsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin"))
            {
                return Ok(Array.Empty<SystemSettingResponseDto>());
            }

            var items = await db.SystemSettings.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.SystemSettings.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(SystemSettingCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new SystemSetting
            {
                Key = dto.Key,
                Value = dto.Value,
                Description = dto.Description,
            };

            db.SystemSettings.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, SystemSettingUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.SystemSettings.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "SystemSetting not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This SystemSetting was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.Key = dto.Key;
            item.Value = dto.Value;
            item.Description = dto.Description;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This SystemSetting was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save SystemSetting.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.SystemSettings.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This SystemSetting was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this SystemSetting — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static SystemSettingResponseDto ToResponseDto(SystemSetting x) => new()
        {
            Id = x.Id,
            Key = x.Key,
            Value = x.Value,
            Description = x.Description,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}