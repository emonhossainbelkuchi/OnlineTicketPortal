using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Marketing;
using TicketPortal.Api.Models.People;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // A complaint always belongs to whoever is logged in — CustomerProfileId used to come
    // straight from the request body, so a client could file a complaint as any customer they
    // liked. Status only ever moves through the staff-only status action below; a customer can
    // edit their own Subject/Description but can't resolve/close their own complaint.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ComplaintsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = db.Complaints.AsQueryable();

            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                var userId = GetCurrentUserId();
                query = query.Where(c => db.CustomerProfiles.Any(cp =>
                    cp.Id == c.CustomerProfileId && cp.UserId == userId));
            }

            var items = await query.OrderByDescending(c => c.CreatedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.Complaints.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(ComplaintCreateDto dto)
        {
            var customerProfileId = await ResolveOrCreateCustomerProfileIdAsync();
            if (customerProfileId == null) return Unauthorized();

            if (dto.BookingId.HasValue)
            {
                var ownsBooking = await db.Bookings.AnyAsync(b =>
                    b.Id == dto.BookingId.Value && b.CustomerProfileId == customerProfileId);
                if (!ownsBooking) return BadRequest(new { message = "That booking doesn't belong to you." });
            }

            var item = new Complaint
            {
                CustomerProfileId = customerProfileId.Value,
                BookingId = dto.BookingId,
                Subject = dto.Subject,
                Description = dto.Description,
            };

            db.Complaints.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, ComplaintUpdateDto dto)
        {
            var item = await db.Complaints.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "Complaint not found." });
            if (!await CanAccessAsync(item)) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This Complaint was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            if (dto.BookingId.HasValue)
            {
                var ownsBooking = await db.Bookings.AnyAsync(b =>
                    b.Id == dto.BookingId.Value && b.CustomerProfileId == item.CustomerProfileId);
                if (!ownsBooking) return BadRequest(new { message = "That booking doesn't belong to you." });
            }

            // Status/ResolvedAtUtc are deliberately untouched here — see the status action below.
            item.BookingId = dto.BookingId;
            item.Subject = dto.Subject;
            item.Description = dto.Description;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Complaint was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save Complaint.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        // Staff-only — the only way a Complaint's Status actually moves. ResolvedAtUtc is
        // stamped here automatically the moment Status first becomes Resolved/Closed, and
        // cleared again if the complaint is reopened — never something a client sends directly.
        [HttpPost("{id}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, ComplaintStatusUpdateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.Complaints.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            item.Status = dto.Status;
            item.ResolvedAtUtc = dto.Status is ComplaintStatus.Resolved or ComplaintStatus.Closed
                ? item.ResolvedAtUtc ?? DateTime.UtcNow
                : null;
            item.UpdatedAtUtc = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Ok(ToResponseDto(item));
        }

        // Staff/Admin only — a customer being able to delete their own complaint would let
        // them erase a record staff may already be acting on.
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.Complaints.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Complaint was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this Complaint — it is still referenced by other records." });
            }

            return NoContent();
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private async Task<bool> CanAccessAsync(Complaint item)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator")) return true;

            var userId = GetCurrentUserId();
            if (userId == null) return false;

            return await db.CustomerProfiles.AnyAsync(cp =>
                cp.Id == item.CustomerProfileId && cp.UserId == userId);
        }

        // Same lazy-provisioning idea as BookingsController.ResolveOrCreateCustomerProfileIdAsync
        // — a complaint doesn't require a prior booking (e.g. a signup/account issue), so a
        // logged-in customer without a CustomerProfile yet still gets one here rather than
        // being blocked from filing anything at all.
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

        private static ComplaintResponseDto ToResponseDto(Complaint x) => new()
        {
            Id = x.Id,
            CustomerProfileId = x.CustomerProfileId,
            BookingId = x.BookingId,
            Subject = x.Subject,
            Description = x.Description,
            Status = x.Status,
            ResolvedAtUtc = x.ResolvedAtUtc,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
