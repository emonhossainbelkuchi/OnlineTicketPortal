// Piece 6 (People/HR & ERP Integrations) — 🟡 tier, same reasoning as
// ExternalBookingMappingsController/ExternalRouteMappingsController: internal sync bookkeeping
// (which of the operator's own ERP seat identifiers corresponds to which of our TripSeats).
// Reads: Admin/platform-Staff only (see ClaimsPrincipalExtensions.IsPlatformStaffOrAdminAsync).
// Writes: Admin-only, per the completion plan.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Integrations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ExternalSeatMappingsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!await User.IsPlatformStaffOrAdminAsync(db))
            {
                return Ok(Array.Empty<ExternalSeatMappingResponseDto>());
            }

            var items = await db.ExternalSeatMappings.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!await User.IsPlatformStaffOrAdminAsync(db)) return Forbid();

            var item = await db.ExternalSeatMappings.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(ExternalSeatMappingCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new ExternalSeatMapping
            {
                OperatorIntegrationId = dto.OperatorIntegrationId,
                TripSeatId = dto.TripSeatId,
                ExternalSeatKey = dto.ExternalSeatKey,
                ExternalSeatNumber = dto.ExternalSeatNumber,
            };

            db.ExternalSeatMappings.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, ExternalSeatMappingUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.ExternalSeatMappings.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "ExternalSeatMapping not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This ExternalSeatMapping was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.OperatorIntegrationId = dto.OperatorIntegrationId;
            item.TripSeatId = dto.TripSeatId;
            item.ExternalSeatKey = dto.ExternalSeatKey;
            item.ExternalSeatNumber = dto.ExternalSeatNumber;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This ExternalSeatMapping was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save ExternalSeatMapping.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.ExternalSeatMappings.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This ExternalSeatMapping was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this ExternalSeatMapping — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static ExternalSeatMappingResponseDto ToResponseDto(ExternalSeatMapping x) => new()
        {
            Id = x.Id,
            OperatorIntegrationId = x.OperatorIntegrationId,
            TripSeatId = x.TripSeatId,
            ExternalSeatKey = x.ExternalSeatKey,
            ExternalSeatNumber = x.ExternalSeatNumber,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
