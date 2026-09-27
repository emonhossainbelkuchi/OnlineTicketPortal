// Piece 5 (Operator Back-Office & Fleet Operations) — operator scoping. 🟡 tier. BusImage has no
// BusOperatorId of its own — it hangs off Bus, so scoping/ownership checks join through
// Bus.BusOperatorId. See OperatorBranchesController's header comment for the Admin/Staff/Operator
// role-gate note.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.BusFleet;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class BusImagesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<BusImageResponseDto>());
            }

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            var query = db.BusImages.AsQueryable();
            if (busOperatorId != null)
            {
                query = query.Where(x => db.Buses.Any(b =>
                    b.Id == x.BusId && b.BusOperatorId == busOperatorId));
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.BusImages.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null)
            {
                var owns = await db.Buses.AnyAsync(b => b.Id == item.BusId && b.BusOperatorId == busOperatorId);
                if (!owns) return Forbid();
            }

            return Ok(ToResponseDto(item));
        }

        // Looks up which operator a given Bus actually belongs to, or null if that BusId doesn't
        // exist at all — shared by Create/Update so "does it exist" and "whose is it" live in
        // one place.
        private async Task<Guid?> GetBusOperatorOwnerAsync(Guid busId) =>
            await db.Buses
                .Where(b => b.Id == busId)
                .Select(b => (Guid?)b.BusOperatorId)
                .FirstOrDefaultAsync();

        [HttpPost]
        public async Task<IActionResult> Create(BusImageCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);

            var busOwnerId = await GetBusOperatorOwnerAsync(dto.BusId);
            if (busOwnerId == null)
            {
                return BadRequest(new { message = "BusId does not match a real Bus." });
            }

            // Scoped staff can only add images to their OWN operator's buses — this is what
            // stops one operator from uploading images onto another operator's fleet.
            if (busOperatorId != null && busOwnerId != busOperatorId)
            {
                return BadRequest(new { message = "That Bus belongs to a different operator." });
            }

            var item = new BusImage
            {
                BusId = dto.BusId,
                ImageUrl = dto.ImageUrl,
                Caption = dto.Caption,
                IsPrimary = dto.IsPrimary,
                DisplayOrder = dto.DisplayOrder,
            };

            db.BusImages.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, BusImageUpdateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.BusImages.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "BusImage not found." });

            var busOperatorId = await User.GetBusOperatorIdAsync(db);

            var currentBusOwnerId = await GetBusOperatorOwnerAsync(item.BusId);
            if (busOperatorId != null && currentBusOwnerId != busOperatorId) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This BusImage was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // If the caller is moving this image to a different Bus, re-check the same "does it
            // exist / whose is it" rules against the NEW target, not just the old one.
            if (dto.BusId != item.BusId)
            {
                var newBusOwnerId = await GetBusOperatorOwnerAsync(dto.BusId);
                if (newBusOwnerId == null)
                {
                    return BadRequest(new { message = "BusId does not match a real Bus." });
                }
                if (busOperatorId != null && newBusOwnerId != busOperatorId)
                {
                    return BadRequest(new { message = "That Bus belongs to a different operator." });
                }
            }

            item.BusId = dto.BusId;
            item.ImageUrl = dto.ImageUrl;
            item.Caption = dto.Caption;
            item.IsPrimary = dto.IsPrimary;
            item.DisplayOrder = dto.DisplayOrder;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This BusImage was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save BusImage.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.BusImages.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null)
            {
                var owns = await db.Buses.AnyAsync(b => b.Id == item.BusId && b.BusOperatorId == busOperatorId);
                if (!owns) return Forbid();
            }

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This BusImage was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this BusImage — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static BusImageResponseDto ToResponseDto(BusImage x) => new()
        {
            Id = x.Id,
            BusId = x.BusId,
            ImageUrl = x.ImageUrl,
            Caption = x.Caption,
            IsPrimary = x.IsPrimary,
            DisplayOrder = x.DisplayOrder,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
