// Piece 1 (Identity, Access Control & Platform Configuration) — originally Admin-only end to
// end. RBAC Amendment v3 / Chunk 7 task 1+2 ("Fix finance access mismatch"): reads now also
// open to whoever holds Finance.ReadPlatform (PermissionMatrix.cs grants this only to Platform
// Finance — StaffRole.Finance with no BusOperatorId — matching the amendment's correction that
// finance-configuration reads belong to "the mapped Finance or Admin personas", not every
// platform Staff account). Tax rates applied to every fare are still Finance.Configure to
// write — the matrix grants that to nobody, so only Admin can change one. Real Staff/Operator
// role-scoping (StaffProfile.BusOperatorId) doesn't apply here since this is platform-wide
// reference/finance data, not any one operator's own rows.

using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TaxRulesController(AppDbContext db, ICurrentActorService currentActor) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceReadPlatform))
            {
                return Ok(Array.Empty<TaxRuleResponseDto>());
            }

            var items = await db.TaxRules.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceReadPlatform)) return Forbid();

            var item = await db.TaxRules.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(TaxRuleCreateDto dto)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceConfigure)) return Forbid();

            var item = new TaxRule
            {
                Name = dto.Name,
                Percentage = dto.Percentage,
                IsActive = dto.IsActive,
            };

            db.TaxRules.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, TaxRuleUpdateDto dto)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceConfigure)) return Forbid();

            var item = await db.TaxRules.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "TaxRule not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This TaxRule was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.Name = dto.Name;
            item.Percentage = dto.Percentage;
            item.IsActive = dto.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This TaxRule was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save TaxRule.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.FinanceConfigure)) return Forbid();

            var item = await db.TaxRules.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This TaxRule was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this TaxRule — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static TaxRuleResponseDto ToResponseDto(TaxRule x) => new()
        {
            Id = x.Id,
            Name = x.Name,
            Percentage = x.Percentage,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}