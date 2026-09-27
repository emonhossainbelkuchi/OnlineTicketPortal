// Piece 6 (People/HR & ERP Integrations) — ownership scoping. 🟡 tier, identical shape to
// CustomerAddressesController right above it: a customer only ever sees/writes their own saved
// emergency contacts; Admin/Staff see everyone's for support purposes. CustomerProfileId is no
// longer client-supplied (see PeopleDtos.cs) — always resolved from whoever is logged in.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.People;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class EmergencyContactsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.EmergencyContacts.AsQueryable();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                var userId = GetCurrentUserId();
                query = query.Where(e => db.CustomerProfiles.Any(cp =>
                    cp.Id == e.CustomerProfileId && cp.UserId == userId));
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.EmergencyContacts.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(EmergencyContactCreateDto dto)
        {
            var customerProfileId = await ResolveOrCreateCustomerProfileIdAsync();
            if (customerProfileId == null) return Unauthorized();

            var item = new EmergencyContact
            {
                CustomerProfileId = customerProfileId.Value,
                Name = dto.Name,
                Phone = dto.Phone,
                Relation = dto.Relation,
            };

            db.EmergencyContacts.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, EmergencyContactUpdateDto dto)
        {
            var item = await db.EmergencyContacts.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "EmergencyContact not found." });
            if (!await CanAccessAsync(item)) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This EmergencyContact was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // CustomerProfileId deliberately never touched here — a contact doesn't move
            // between customers.
            item.Name = dto.Name;
            item.Phone = dto.Phone;
            item.Relation = dto.Relation;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This EmergencyContact was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save EmergencyContact.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await db.EmergencyContacts.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This EmergencyContact was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this EmergencyContact — it is still referenced by other records." });
            }

            return NoContent();
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private async Task<bool> CanAccessAsync(EmergencyContact item)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator")) return true;

            var userId = GetCurrentUserId();
            if (userId == null) return false;

            return await db.CustomerProfiles.AnyAsync(cp =>
                cp.Id == item.CustomerProfileId && cp.UserId == userId);
        }

        // Same lazy-provisioning idea as CustomerAddressesController — a logged-in customer
        // without a CustomerProfile yet still gets one here rather than being blocked from
        // saving a contact at all.
        private async Task<Guid?> ResolveOrCreateCustomerProfileIdAsync()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(claim, out var userId)) return null;

            var existingId = await db.CustomerProfiles
                .Where(cp => cp.UserId == userId)
                .Select(cp => (Guid?)cp.Id)
                .FirstOrDefaultAsync();

            if (existingId != null) return existingId;

            var profile = new CustomerProfile { UserId = userId };
            db.CustomerProfiles.Add(profile);
            await db.SaveChangesAsync();
            return profile.Id;
        }

        private static EmergencyContactResponseDto ToResponseDto(EmergencyContact x) => new()
        {
            Id = x.Id,
            CustomerProfileId = x.CustomerProfileId,
            Name = x.Name,
            Phone = x.Phone,
            Relation = x.Relation,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
