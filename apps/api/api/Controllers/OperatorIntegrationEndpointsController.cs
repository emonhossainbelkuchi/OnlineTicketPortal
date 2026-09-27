// Piece 6 (People/HR & ERP Integrations) — Admin-only gate. 🟡 tier, same fix and same reasoning
// as OperatorIntegrationsController right above it: this describes exactly which URLs/methods we
// call on an operator's own ERP, so it's locked down the same way — Admin-only end to end.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Integrations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorIntegrationEndpointsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin"))
            {
                return Ok(Array.Empty<OperatorIntegrationEndpointResponseDto>());
            }

            var items = await db.OperatorIntegrationEndpoints.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.OperatorIntegrationEndpoints.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(OperatorIntegrationEndpointCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new OperatorIntegrationEndpoint
            {
                OperatorIntegrationId = dto.OperatorIntegrationId,
                Purpose = dto.Purpose,
                HttpMethod = dto.HttpMethod,
                PathTemplate = dto.PathTemplate,
                IsActive = dto.IsActive,
            };

            db.OperatorIntegrationEndpoints.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, OperatorIntegrationEndpointUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.OperatorIntegrationEndpoints.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "OperatorIntegrationEndpoint not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This OperatorIntegrationEndpoint was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.OperatorIntegrationId = dto.OperatorIntegrationId;
            item.Purpose = dto.Purpose;
            item.HttpMethod = dto.HttpMethod;
            item.PathTemplate = dto.PathTemplate;
            item.IsActive = dto.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This OperatorIntegrationEndpoint was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save OperatorIntegrationEndpoint.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.OperatorIntegrationEndpoints.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This OperatorIntegrationEndpoint was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this OperatorIntegrationEndpoint — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static OperatorIntegrationEndpointResponseDto ToResponseDto(OperatorIntegrationEndpoint x) => new()
        {
            Id = x.Id,
            OperatorIntegrationId = x.OperatorIntegrationId,
            Purpose = x.Purpose,
            HttpMethod = x.HttpMethod,
            PathTemplate = x.PathTemplate,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
