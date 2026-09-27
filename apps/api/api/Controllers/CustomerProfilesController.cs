// Piece 6 (People/HR & ERP Integrations) — ownership scoping. 🟡 tier: CRUD shape was fine, the
// problem was GetAll leaking every customer's PII (national ID, date of birth, wallet balance...)
// to any logged-in user. Fix: a customer now only ever sees their own profile; Admin/Staff (same
// bar used by Complaints/Reviews in Piece 4) can see everyone's, for support purposes.
//
// Two extra fixes bundled in here, both real invariants rather than pure scoping:
//   - UserId is no longer trusted from the request body for a plain customer — it's forced to
//     the caller's own id, the same way Booking/Complaint/Review never trust a client-supplied
//     ownership id. Admin/Staff may still set it explicitly (creating a profile on someone
//     else's behalf).
//   - WalletBalance is gone from Create/Update entirely (see PeopleDtos.cs header) — it was
//     directly client-settable, which is a real money bug: CustomerWalletService is the only
//     code allowed to change this field, and it always pairs the change with a
//     CustomerWalletTransaction row so the balance can be verified against the transaction
//     history. A raw CRUD PUT bypassing that would let a client set their own balance to
//     anything and break that invariant permanently.

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
    public class CustomerProfilesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.CustomerProfiles.AsQueryable();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                var userId = GetCurrentUserId();
                query = query.Where(cp => cp.UserId == userId);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.CustomerProfiles.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!CanAccess(item)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CustomerProfileCreateDto dto)
        {
            var callerId = GetCurrentUserId();
            if (callerId == null) return Unauthorized();

            var isStaffOrAdmin = User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator");
            var targetUserId = isStaffOrAdmin ? dto.UserId : callerId.Value;

            // One profile per login — same invariant CustomerProfile's own class comment
            // describes ("attached one-to-one to a login account").
            var alreadyExists = await db.CustomerProfiles.AnyAsync(cp => cp.UserId == targetUserId);
            if (alreadyExists)
            {
                return Conflict(new { message = "A CustomerProfile already exists for this user." });
            }

            var item = new CustomerProfile
            {
                UserId = targetUserId,
                NationalIdNumber = dto.NationalIdNumber,
                DateOfBirth = dto.DateOfBirth,
                Gender = dto.Gender,
                EmergencyContactPhone = dto.EmergencyContactPhone,
                PreferredLanguageCode = dto.PreferredLanguageCode,
                // WalletBalance intentionally not set — always starts at 0; only
                // CustomerWalletService may ever change it from here on.
            };

            db.CustomerProfiles.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, CustomerProfileUpdateDto dto)
        {
            var item = await db.CustomerProfiles.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "CustomerProfile not found." });
            if (!CanAccess(item)) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This CustomerProfile was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // UserId/WalletBalance deliberately never touched here — see file header.
            item.NationalIdNumber = dto.NationalIdNumber;
            item.DateOfBirth = dto.DateOfBirth;
            item.Gender = dto.Gender;
            item.EmergencyContactPhone = dto.EmergencyContactPhone;
            item.PreferredLanguageCode = dto.PreferredLanguageCode;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This CustomerProfile was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save CustomerProfile.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await db.CustomerProfiles.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!CanAccess(item)) return Forbid();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This CustomerProfile was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this CustomerProfile — it is still referenced by other records." });
            }

            return NoContent();
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private bool CanAccess(CustomerProfile item)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator")) return true;
            return item.UserId == GetCurrentUserId();
        }

        private static CustomerProfileResponseDto ToResponseDto(CustomerProfile x) => new()
        {
            Id = x.Id,
            UserId = x.UserId,
            NationalIdNumber = x.NationalIdNumber,
            DateOfBirth = x.DateOfBirth,
            Gender = x.Gender,
            EmergencyContactPhone = x.EmergencyContactPhone,
            WalletBalance = x.WalletBalance,
            PreferredLanguageCode = x.PreferredLanguageCode,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
