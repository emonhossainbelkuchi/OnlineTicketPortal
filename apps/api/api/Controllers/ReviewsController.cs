using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Marketing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // Reviews are shown to future customers browsing a route/operator (see the model's own
    // comment), so reading stays open to everyone, unscoped — the fix here is entirely about
    // who's allowed to WRITE one. CustomerProfileId used to come straight from the request
    // body, and nothing checked that the reviewer had actually taken the trip — a client could
    // review any route for anyone, whether they ever booked it or not.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await db.Reviews.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.Reviews.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(ReviewCreateDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var customerProfileId = await db.CustomerProfiles
                .Where(cp => cp.UserId == userId)
                .Select(cp => (Guid?)cp.Id)
                .FirstOrDefaultAsync();

            if (customerProfileId == null)
            {
                return BadRequest(new { message = "You need a completed booking on this trip before you can leave a review." });
            }

            // Proof they actually travelled: a booking that's really theirs, really for this
            // trip, and really Completed — not just any booking ID they happen to send.
            var tookThisTrip = await db.Bookings.AnyAsync(b =>
                b.Id == dto.BookingId &&
                b.CustomerProfileId == customerProfileId &&
                b.TripId == dto.TripId &&
                b.Status == BookingStatus.Completed);

            if (!tookThisTrip)
            {
                return BadRequest(new
                {
                    message = "That booking doesn't belong to you, isn't for this trip, or hasn't been completed yet."
                });
            }

            var item = new Review
            {
                CustomerProfileId = customerProfileId.Value,
                TripId = dto.TripId,
                BookingId = dto.BookingId,
                Rating = dto.Rating,
                Comment = dto.Comment,
            };

            db.Reviews.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, ReviewUpdateDto dto)
        {
            var item = await db.Reviews.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "Review not found." });
            if (!await CanModifyAsync(item)) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This Review was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // TripId/BookingId/CustomerProfileId are deliberately never touched here — see
            // ReviewUpdateDto's comment.
            item.Rating = dto.Rating;
            item.Comment = dto.Comment;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Review was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save Review.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await db.Reviews.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanModifyAsync(item)) return Forbid();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Review was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this Review — it is still referenced by other records." });
            }

            return NoContent();
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        // Only the review's own author, or staff moderating content, can edit/delete it —
        // unlike GetAll/GetById above, writes are never open to just any authenticated user.
        private async Task<bool> CanModifyAsync(Review item)
        {
            if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator")) return true;

            var userId = GetCurrentUserId();
            if (userId == null) return false;

            return await db.CustomerProfiles.AnyAsync(cp =>
                cp.Id == item.CustomerProfileId && cp.UserId == userId);
        }

        private static ReviewResponseDto ToResponseDto(Review x) => new()
        {
            Id = x.Id,
            CustomerProfileId = x.CustomerProfileId,
            TripId = x.TripId,
            BookingId = x.BookingId,
            Rating = x.Rating,
            Comment = x.Comment,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
