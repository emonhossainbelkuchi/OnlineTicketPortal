// RBAC Amendment v3 task 4. Grants/revokes which SalesCounter(s) a CounterStaff member may
// sell from — see StaffSalesCounterAssignment's doc comment for the gap this closes, and
// BookingsController's counter-sale block for where the assignment is actually enforced.
//
// Gated on Staff.Manage (assigning someone to a counter is an HR decision, same permission as
// StaffProfilesController's writes) plus the usual operator scope: Admin/platform staff manage
// any operator's assignments; an Operator Manager/BusOwner may only grant/revoke assignments
// where BOTH the StaffProfile and the SalesCounter belong to their own operator — they cannot
// reach across into another operator's counters or staff (RBAC Amendment v3 task 5's "must not
// ... grant counter assignments outside their operator").

using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.People;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class StaffCounterAssignmentsController(AppDbContext db, ICurrentActorService currentActor) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? staffProfileId, [FromQuery] Guid? salesCounterId)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.StaffRead))
            {
                return Ok(Array.Empty<StaffSalesCounterAssignmentResponseDto>());
            }

            var query = db.StaffSalesCounterAssignments
                .Include(a => a.StaffProfile)
                .AsQueryable();

            if (actor.BusOperatorId != null)
            {
                query = query.Where(a => a.StaffProfile.BusOperatorId == actor.BusOperatorId);
            }
            if (staffProfileId != null)
            {
                query = query.Where(a => a.StaffProfileId == staffProfileId);
            }
            if (salesCounterId != null)
            {
                query = query.Where(a => a.SalesCounterId == salesCounterId);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpPost]
        public async Task<IActionResult> Create(StaffSalesCounterAssignmentCreateDto dto)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.StaffManage)) return Forbid();

            var staffProfile = await db.StaffProfiles.FirstOrDefaultAsync(sp => sp.Id == dto.StaffProfileId);
            if (staffProfile == null)
            {
                return BadRequest(new { message = "StaffProfileId does not match a real StaffProfile." });
            }

            var salesCounter = await db.SalesCounters.FirstOrDefaultAsync(sc => sc.Id == dto.SalesCounterId);
            if (salesCounter == null)
            {
                return BadRequest(new { message = "SalesCounterId does not match a real SalesCounter." });
            }

            if (staffProfile.BusOperatorId != salesCounter.BusOperatorId)
            {
                return BadRequest(new { message = "The StaffProfile and the SalesCounter belong to different operators." });
            }

            if (!actor.CanManageOperator(salesCounter.BusOperatorId))
            {
                return Forbid();
            }

            // No duplicate active row for the same pair — enforced here rather than a DB
            // constraint, see StaffSalesCounterAssignment's doc comment.
            var alreadyActive = await db.StaffSalesCounterAssignments.AnyAsync(a =>
                a.StaffProfileId == dto.StaffProfileId && a.SalesCounterId == dto.SalesCounterId && a.IsActive);
            if (alreadyActive)
            {
                return Conflict(new { message = "This staff member already has an active assignment to this counter." });
            }

            var item = new StaffSalesCounterAssignment
            {
                StaffProfileId = dto.StaffProfileId,
                SalesCounterId = dto.SalesCounterId,
                EffectiveFromUtc = dto.EffectiveFromUtc,
                EffectiveToUtc = dto.EffectiveToUtc,
                IsActive = true,
            };

            db.StaffSalesCounterAssignments.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { staffProfileId = item.StaffProfileId }, ToResponseDto(item));
        }

        // Revoke — deactivate rather than a plain field flip, so history of who was ever
        // assigned to a counter survives (useful for the audit trail a settlement dispute or
        // an investigation into a bad sale might need).
        [HttpDelete("{id}")]
        public async Task<IActionResult> Revoke(Guid id)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.StaffManage)) return Forbid();

            var item = await db.StaffSalesCounterAssignments
                .Include(a => a.StaffProfile)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (item == null) return NotFound();

            if (!actor.CanManageOperator(item.StaffProfile.BusOperatorId ?? Guid.Empty)) return Forbid();

            item.IsActive = false;
            item.EffectiveToUtc ??= DateTime.UtcNow;
            item.UpdatedAtUtc = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return NoContent();
        }

        private static StaffSalesCounterAssignmentResponseDto ToResponseDto(StaffSalesCounterAssignment x) => new()
        {
            Id = x.Id,
            StaffProfileId = x.StaffProfileId,
            SalesCounterId = x.SalesCounterId,
            IsActive = x.IsActive,
            EffectiveFromUtc = x.EffectiveFromUtc,
            EffectiveToUtc = x.EffectiveToUtc,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
