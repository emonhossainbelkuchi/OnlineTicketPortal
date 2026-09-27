// Piece 6 (People/HR & ERP Integrations) — ownership scoping. 🟡 tier, same shape as
// CustomerProfilesController right above it: a customer only ever sees/writes their own saved
// addresses; Admin/Staff see everyone's for support purposes. CustomerProfileId is no longer
// client-supplied at all (see PeopleDtos.cs) — it's always resolved from whoever is logged in,
// the same "never trust a client-supplied ownership id" fix already applied to
// Booking/Complaint/Review in earlier pieces.

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
    public class CustomerAddressesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.CustomerAddresses.AsQueryable();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                var userId = GetCurrentUserId();
                query = query.Where(a => db.CustomerProfiles.Any(cp =>
                    cp.Id == a.CustomerProfileId && cp.UserId == userId));
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.CustomerAddresses.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CustomerAddressCreateDto dto)
        {
            var customerProfileId = await ResolveOrCreateCustomerProfileIdAsync();
            if (customerProfileId == null) return Unauthorized();

            var item = new CustomerAddress
            {
                CustomerProfileId = customerProfileId.Value,
                Label = dto.Label,
                AddressLine = dto.AddressLine,
                City = dto.City,
                District = dto.District,
                Country = dto.Country,
                IsDefault = dto.IsDefault,
            };

            db.CustomerAddresses.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, CustomerAddressUpdateDto dto)
        {
            var item = await db.CustomerAddresses.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "CustomerAddress not found." });
            if (!await CanAccessAsync(item)) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This CustomerAddress was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // CustomerProfileId deliberately never touched here — an address doesn't move
            // between customers.
            item.Label = dto.Label;
            item.AddressLine = dto.AddressLine;
            item.City = dto.City;
            item.District = dto.District;
            item.Country = dto.Country;
            item.IsDefault = dto.IsDefault;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This CustomerAddress was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save CustomerAddress.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await db.CustomerAddresses.FirstOrDefaultAsync(x => x.Id == id);
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
                return Conflict(new { message = "This CustomerAddress was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this CustomerAddress — it is still referenced by other records." });
            }

            return NoContent();
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private async Task<bool> CanAccessAsync(CustomerAddress item)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator")) return true;

            var userId = GetCurrentUserId();
            if (userId == null) return false;

            return await db.CustomerProfiles.AnyAsync(cp =>
                cp.Id == item.CustomerProfileId && cp.UserId == userId);
        }

        // Same lazy-provisioning idea as BookingsController/ComplaintsController — a logged-in
        // customer without a CustomerProfile yet still gets one here rather than being blocked
        // from saving an address at all.
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

        private static CustomerAddressResponseDto ToResponseDto(CustomerAddress x) => new()
        {
            Id = x.Id,
            CustomerProfileId = x.CustomerProfileId,
            Label = x.Label,
            AddressLine = x.AddressLine,
            City = x.City,
            District = x.District,
            Country = x.Country,
            IsDefault = x.IsDefault,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
