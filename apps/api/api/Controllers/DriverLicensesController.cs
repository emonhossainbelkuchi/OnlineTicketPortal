// Piece 6 (People/HR & ERP Integrations) — operator scoping. 🟡 tier: CRUD shape was fine, but
// this was reachable by ANY logged-in user, customers included. Fix, same two-part gate used
// throughout this piece:
//   1. Customers are blocked entirely — never a legitimate audience for driver licence data.
//   2. Among Staff, an operator's own staff only see/write licences for their OWN operator's
//      drivers (via StaffProfile.BusOperatorId, using the Piece 1 helper); platform Staff/Admin
//      (BusOperatorId == null on their own StaffProfile) see everything.
// StaffProfileId on Create is verified against that same scope rather than trusted as-is —
// otherwise an operator's own staff could attach a licence to a driver who isn't even theirs.

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
    public class DriverLicensesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<DriverLicenseResponseDto>());
            }

            var query = db.DriverLicenses.AsQueryable();

            if (!User.IsInRole("Admin"))
            {
                var scopeOperatorId = await User.GetBusOperatorIdAsync(db);
                if (scopeOperatorId != null)
                {
                    query = query.Where(d => db.StaffProfiles.Any(sp =>
                        sp.Id == d.StaffProfileId && sp.BusOperatorId == scopeOperatorId));
                }
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.DriverLicenses.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item.StaffProfileId)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(DriverLicenseCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();
            if (!await CanAccessAsync(dto.StaffProfileId))
            {
                return BadRequest(new { message = "That staff member doesn't belong to your operator." });
            }

            var item = new DriverLicense
            {
                StaffProfileId = dto.StaffProfileId,
                LicenseNumber = dto.LicenseNumber,
                Type = dto.Type,
                IssueDate = dto.IssueDate,
                ExpiryDate = dto.ExpiryDate,
            };

            db.DriverLicenses.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, DriverLicenseUpdateDto dto)
        {
            var item = await db.DriverLicenses.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "DriverLicense not found." });
            if (!await CanAccessAsync(item.StaffProfileId)) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This DriverLicense was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // StaffProfileId deliberately never touched here — a licence belongs to whoever it
            // was issued to; re-pointing it to a different employee isn't an edit, it's a new record.
            item.LicenseNumber = dto.LicenseNumber;
            item.Type = dto.Type;
            item.IssueDate = dto.IssueDate;
            item.ExpiryDate = dto.ExpiryDate;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This DriverLicense was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save DriverLicense.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await db.DriverLicenses.FirstOrDefaultAsync(x => x.Id == id);
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
                return Conflict(new { message = "This DriverLicense was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this DriverLicense — it is still referenced by other records." });
            }

            return NoContent();
        }

        // The operator-scoping pattern from the Completion Plan (Section 2), via the shared
        // Piece 1 helper: Admin sees everything; a platform Staff account (BusOperatorId == null
        // on their own StaffProfile) sees everything; an operator's own Staff only sees rows
        // whose StaffProfile belongs to that same operator. Plain customers never reach this —
        // both call sites gate on IsInRole("Admin"/"Staff") first.
        private async Task<bool> CanAccessAsync(Guid staffProfileId)
        {
            if (User.IsInRole("Admin")) return true;
            if (!User.IsInRole("Staff") && !User.IsInRole("Operator")) return false;

            var scopeOperatorId = await User.GetBusOperatorIdAsync(db);
            if (scopeOperatorId == null) return true;

            return await db.StaffProfiles.AnyAsync(sp =>
                sp.Id == staffProfileId && sp.BusOperatorId == scopeOperatorId);
        }

        private static DriverLicenseResponseDto ToResponseDto(DriverLicense x) => new()
        {
            Id = x.Id,
            StaffProfileId = x.StaffProfileId,
            LicenseNumber = x.LicenseNumber,
            Type = x.Type,
            IssueDate = x.IssueDate,
            ExpiryDate = x.ExpiryDate,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
