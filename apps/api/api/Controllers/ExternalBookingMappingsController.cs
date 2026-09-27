// Piece 6 (People/HR & ERP Integrations) — 🟡 tier. This translates our Booking ids to an
// operator's own ERP booking reference (their PNR/key), and tracks the last status we heard
// from their side — internal sync bookkeeping, not something a customer or an operator's own
// staff has a reason to touch. Reads are gated to Admin/platform-Staff (same bar as the rest of
// the backend's "internal" data); writes are Admin-only per the completion plan — hand-editing a
// mapping mid-sync could double-import a booking, so this is deliberately not opened up to
// operator-scoped Staff the way the People/HR controllers above are. The actual sync worker that
// would normally write these rows automatically is future work (flagged in the plan, not built
// here) — until it exists, Admin is the only way these get created or corrected.
//
// This comment always said "not opened up to operator-scoped Staff", but the reads below never
// actually enforced that — any Staff account, including one scoped to a single operator, could
// read every operator's ERP booking-mapping data. Fixed: reads now require Admin, or a
// Staff/Operator account whose StaffProfile.BusOperatorId is null (platform staff) — the same
// bar OperatorIntegrationsController uses for its own platform-only data.
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
    public class ExternalBookingMappingsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!await User.IsPlatformStaffOrAdminAsync(db))
            {
                return Ok(Array.Empty<ExternalBookingMappingResponseDto>());
            }

            var items = await db.ExternalBookingMappings.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!await User.IsPlatformStaffOrAdminAsync(db)) return Forbid();

            var item = await db.ExternalBookingMappings.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(ExternalBookingMappingCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new ExternalBookingMapping
            {
                OperatorIntegrationId = dto.OperatorIntegrationId,
                BookingId = dto.BookingId,
                ExternalBookingKey = dto.ExternalBookingKey,
                ExternalPnr = dto.ExternalPnr,
                LastKnownExternalStatus = dto.LastKnownExternalStatus,
                LastSyncedAtUtc = dto.LastSyncedAtUtc,
            };

            db.ExternalBookingMappings.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, ExternalBookingMappingUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.ExternalBookingMappings.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "ExternalBookingMapping not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This ExternalBookingMapping was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.OperatorIntegrationId = dto.OperatorIntegrationId;
            item.BookingId = dto.BookingId;
            item.ExternalBookingKey = dto.ExternalBookingKey;
            item.ExternalPnr = dto.ExternalPnr;
            item.LastKnownExternalStatus = dto.LastKnownExternalStatus;
            item.LastSyncedAtUtc = dto.LastSyncedAtUtc;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This ExternalBookingMapping was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save ExternalBookingMapping.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.ExternalBookingMappings.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This ExternalBookingMapping was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this ExternalBookingMapping — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static ExternalBookingMappingResponseDto ToResponseDto(ExternalBookingMapping x) => new()
        {
            Id = x.Id,
            OperatorIntegrationId = x.OperatorIntegrationId,
            BookingId = x.BookingId,
            ExternalBookingKey = x.ExternalBookingKey,
            ExternalPnr = x.ExternalPnr,
            LastKnownExternalStatus = x.LastKnownExternalStatus,
            LastSyncedAtUtc = x.LastSyncedAtUtc,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
