// Piece 6 (People/HR & ERP Integrations) — 🟡 tier, same reasoning as
// ExternalBookingMappingsController: internal sync bookkeeping (which of the operator's own
// ERP routes corresponds to which of our OperatorRoutes), not customer- or operator-staff-
// facing. Reads: Admin/platform-Staff only (see ClaimsPrincipalExtensions.IsPlatformStaffOrAdminAsync —
// an operator's own scoped Staff/Operator account never qualifies here, same fix as the other
// three mapping controllers). Writes: Admin-only, per the completion plan — hand-editing a
// mapping mid-sync risks corrupting what the sync worker (future work, not built here) expects
// to find.

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
    public class ExternalRouteMappingsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!await User.IsPlatformStaffOrAdminAsync(db))
            {
                return Ok(Array.Empty<ExternalRouteMappingResponseDto>());
            }

            var items = await db.ExternalRouteMappings.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!await User.IsPlatformStaffOrAdminAsync(db)) return Forbid();

            var item = await db.ExternalRouteMappings.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(ExternalRouteMappingCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new ExternalRouteMapping
            {
                OperatorIntegrationId = dto.OperatorIntegrationId,
                OperatorRouteId = dto.OperatorRouteId,
                ExternalRouteKey = dto.ExternalRouteKey,
                ExternalRouteName = dto.ExternalRouteName,
            };

            db.ExternalRouteMappings.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, ExternalRouteMappingUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.ExternalRouteMappings.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "ExternalRouteMapping not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This ExternalRouteMapping was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.OperatorIntegrationId = dto.OperatorIntegrationId;
            item.OperatorRouteId = dto.OperatorRouteId;
            item.ExternalRouteKey = dto.ExternalRouteKey;
            item.ExternalRouteName = dto.ExternalRouteName;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This ExternalRouteMapping was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save ExternalRouteMapping.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.ExternalRouteMappings.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This ExternalRouteMapping was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this ExternalRouteMapping — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static ExternalRouteMappingResponseDto ToResponseDto(ExternalRouteMapping x) => new()
        {
            Id = x.Id,
            OperatorIntegrationId = x.OperatorIntegrationId,
            OperatorRouteId = x.OperatorRouteId,
            ExternalRouteKey = x.ExternalRouteKey,
            ExternalRouteName = x.ExternalRouteName,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
