// Piece 5 (Operator Back-Office & Fleet Operations) — operator scoping. 🟡 tier, but with a twist
// the other controllers in this piece don't have: FareRule.BusOperatorId is NULLABLE — null means
// "platform-wide default price for this route, any operator without their own override uses it"
// (see the model's own comment). That's platform pricing policy, not any one operator's "own"
// row, so it stays Admin/Staff-only, same as CommissionRulesController — an operator's own staff
// only ever sees/writes fare rules with BusOperatorId == their own operator, never the null
// platform-default ones. See OperatorBranchesController's header comment for the
// Admin/Staff/Operator role-gate note.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FareRulesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<FareRuleResponseDto>());
            }

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            var query = db.FareRules.AsQueryable();
            if (busOperatorId != null)
            {
                // Deliberately excludes the null (platform-default) rows — those are platform
                // pricing policy, not this operator's own rows. See class comment.
                query = query.Where(x => x.BusOperatorId == busOperatorId);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.FareRules.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.BusOperatorId != busOperatorId) return Forbid();

            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(FareRuleCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);

            // Scoped (operator's own staff): the rule always belongs to THEIR operator — whatever
            // the client sent in BusOperatorId is ignored outright. This is also what makes it
            // impossible for an operator to create a null (platform-default) rule.
            Guid? targetOperatorId;
            if (busOperatorId != null)
            {
                targetOperatorId = busOperatorId.Value;
            }
            else
            {
                // Unscoped (platform Admin/Staff): null is a legitimate value here (platform
                // default) — only validate when a specific operator is actually named.
                if (dto.BusOperatorId != null && !await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId))
                {
                    return BadRequest(new { message = "BusOperatorId does not match a real BusOperator." });
                }
                targetOperatorId = dto.BusOperatorId;
            }

            var item = new FareRule
            {
                BusOperatorId = targetOperatorId,
                BusRouteId = dto.BusRouteId,
                BusType = dto.BusType,
                SeatType = dto.SeatType,
                BaseFare = dto.BaseFare,
                Currency = dto.Currency,
                EffectiveFromUtc = dto.EffectiveFromUtc,
                EffectiveToUtc = dto.EffectiveToUtc,
                IsActive = dto.IsActive,
            };

            db.FareRules.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, FareRuleUpdateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.FareRules.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "FareRule not found." });

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.BusOperatorId != busOperatorId) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This FareRule was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // Scoped staff can edit their own rule's pricing but can never move it to another
            // operator or turn it into a platform-default (null) rule. Only unscoped Admin/Staff
            // can reassign BusOperatorId, including setting/clearing it.
            if (busOperatorId == null)
            {
                if (dto.BusOperatorId != null && !await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId))
                {
                    return BadRequest(new { message = "BusOperatorId does not match a real BusOperator." });
                }
                item.BusOperatorId = dto.BusOperatorId;
            }

            item.BusRouteId = dto.BusRouteId;
            item.BusType = dto.BusType;
            item.SeatType = dto.SeatType;
            item.BaseFare = dto.BaseFare;
            item.Currency = dto.Currency;
            item.EffectiveFromUtc = dto.EffectiveFromUtc;
            item.EffectiveToUtc = dto.EffectiveToUtc;
            item.IsActive = dto.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This FareRule was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save FareRule.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.FareRules.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.BusOperatorId != busOperatorId) return Forbid();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This FareRule was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this FareRule — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static FareRuleResponseDto ToResponseDto(FareRule x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            BusRouteId = x.BusRouteId,
            BusType = x.BusType,
            SeatType = x.SeatType,
            BaseFare = x.BaseFare,
            Currency = x.Currency,
            EffectiveFromUtc = x.EffectiveFromUtc,
            EffectiveToUtc = x.EffectiveToUtc,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
