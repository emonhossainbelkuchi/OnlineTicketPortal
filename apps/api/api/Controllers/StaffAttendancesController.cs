// Piece 6 (People/HR & ERP Integrations) — operator scoping. 🟡 tier, identical shape to
// DriverLicensesController right above it: customers blocked entirely; among Staff, an
// operator's own staff only see/write attendance records for their OWN operator's employees
// (via StaffProfile.BusOperatorId); platform Staff/Admin see everything. StaffProfileId on
// Create is verified against that scope rather than trusted as-is.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.People;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class StaffAttendancesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<StaffAttendanceResponseDto>());
            }

            var query = db.StaffAttendances.AsQueryable();

            if (!User.IsInRole("Admin"))
            {
                var scopeOperatorId = await User.GetBusOperatorIdAsync(db);
                if (scopeOperatorId != null)
                {
                    query = query.Where(a => db.StaffProfiles.Any(sp =>
                        sp.Id == a.StaffProfileId && sp.BusOperatorId == scopeOperatorId));
                }
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.StaffAttendances.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item.StaffProfileId)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(StaffAttendanceCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();
            if (!await CanAccessAsync(dto.StaffProfileId))
            {
                return BadRequest(new { message = "That staff member doesn't belong to your operator." });
            }

            var item = new StaffAttendance
            {
                StaffProfileId = dto.StaffProfileId,
                AttendanceDate = dto.AttendanceDate,
                Status = dto.Status,
                Remarks = dto.Remarks,
            };

            db.StaffAttendances.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, StaffAttendanceUpdateDto dto)
        {
            var item = await db.StaffAttendances.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "StaffAttendance not found." });
            if (!await CanAccessAsync(item.StaffProfileId)) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This StaffAttendance was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // StaffProfileId deliberately never touched here — same reasoning as DriverLicense.
            item.AttendanceDate = dto.AttendanceDate;
            item.Status = dto.Status;
            item.Remarks = dto.Remarks;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This StaffAttendance was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save StaffAttendance.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await db.StaffAttendances.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item.StaffProfileId)) return Forbid();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This StaffAttendance was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this StaffAttendance — it is still referenced by other records." });
            }

            return NoContent();
        }

        // Same operator-scoping helper shape as DriverLicensesController — see its comment.
        private async Task<bool> CanAccessAsync(Guid staffProfileId)
        {
            if (User.IsInRole("Admin")) return true;
            if (!User.IsInRole("Staff") && !User.IsInRole("Operator")) return false;

            var scopeOperatorId = await User.GetBusOperatorIdAsync(db);
            if (scopeOperatorId == null) return true;

            return await db.StaffProfiles.AnyAsync(sp =>
                sp.Id == staffProfileId && sp.BusOperatorId == scopeOperatorId);
        }

        private static StaffAttendanceResponseDto ToResponseDto(StaffAttendance x) => new()
        {
            Id = x.Id,
            StaffProfileId = x.StaffProfileId,
            AttendanceDate = x.AttendanceDate,
            Status = x.Status,
            Remarks = x.Remarks,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
