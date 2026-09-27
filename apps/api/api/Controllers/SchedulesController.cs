// Piece 5 (Operator Back-Office & Fleet Operations) — operator scoping. 🟡 tier. Schedule has its
// own BusOperatorId, same shape as OperatorBranchesController — see that controller's header
// comment for the Admin/Staff/Operator role-gate note. Two extra checks here, for the same reason
// as Piece 7's audit note about "an operator editing another operator's bus": BusId must be a Bus
// that actually belongs to this schedule's operator (an operator can't run a schedule on a
// vehicle they don't own), and OperatorRouteId, when set, must belong to the same operator too.
// BusRouteId is deliberately NOT checked this way — it's the shared platform-wide route (see
// BusRoute's own model comment), not anything operator-owned, so any operator can reference any
// BusRoute.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SchedulesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<ScheduleResponseDto>());
            }

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            var query = db.Schedules.AsQueryable();
            if (busOperatorId != null)
            {
                query = query.Where(x => x.BusOperatorId == busOperatorId);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.Schedules.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.BusOperatorId != busOperatorId) return Forbid();

            return Ok(ToResponseDto(item));
        }

        // Confirms BusId/OperatorRouteId actually belong to targetOperatorId. Returns an error
        // result to short-circuit on, or null if everything checks out.
        private async Task<IActionResult?> ValidateFleetReferencesAsync(Guid busId, Guid? operatorRouteId, Guid targetOperatorId)
        {
            var busOwnerId = await db.Buses
                .Where(b => b.Id == busId)
                .Select(b => (Guid?)b.BusOperatorId)
                .FirstOrDefaultAsync();

            if (busOwnerId == null)
            {
                return BadRequest(new { message = "BusId does not match a real Bus." });
            }
            if (busOwnerId != targetOperatorId)
            {
                return BadRequest(new { message = "That Bus belongs to a different operator." });
            }

            if (operatorRouteId != null)
            {
                var routeOwnerId = await db.OperatorRoutes
                    .Where(r => r.Id == operatorRouteId)
                    .Select(r => (Guid?)r.BusOperatorId)
                    .FirstOrDefaultAsync();

                if (routeOwnerId == null)
                {
                    return BadRequest(new { message = "OperatorRouteId does not match a real OperatorRoute." });
                }
                if (routeOwnerId != targetOperatorId)
                {
                    return BadRequest(new { message = "That OperatorRoute belongs to a different operator." });
                }
            }

            return null;
        }

        [HttpPost]
        public async Task<IActionResult> Create(ScheduleCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);

            // Scoped (operator's own staff): the schedule always belongs to THEIR operator —
            // whatever the client sent in BusOperatorId is ignored outright.
            Guid targetOperatorId;
            if (busOperatorId != null)
            {
                targetOperatorId = busOperatorId.Value;
            }
            else
            {
                if (!await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId))
                {
                    return BadRequest(new { message = "BusOperatorId does not match a real BusOperator." });
                }
                targetOperatorId = dto.BusOperatorId;
            }

            var fleetError = await ValidateFleetReferencesAsync(dto.BusId, dto.OperatorRouteId, targetOperatorId);
            if (fleetError != null) return fleetError;

            var item = new Schedule
            {
                BusOperatorId = targetOperatorId,
                BusRouteId = dto.BusRouteId,
                OperatorRouteId = dto.OperatorRouteId,
                BusId = dto.BusId,
                ScheduleCode = dto.ScheduleCode,
                DepartureTimeOfDay = dto.DepartureTimeOfDay,
                ArrivalTimeOfDay = dto.ArrivalTimeOfDay,
                OperatingDays = dto.OperatingDays,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                BaseFare = dto.BaseFare,
                Currency = dto.Currency,
                IsActive = dto.IsActive,
            };

            db.Schedules.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, ScheduleUpdateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.Schedules.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "Schedule not found." });

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.BusOperatorId != busOperatorId) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This Schedule was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // Scoped staff can edit their own schedule but can never move it to another operator.
            // Only unscoped Admin/Staff can reassign BusOperatorId.
            Guid targetOperatorId;
            if (busOperatorId == null)
            {
                if (!await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId))
                {
                    return BadRequest(new { message = "BusOperatorId does not match a real BusOperator." });
                }
                item.BusOperatorId = dto.BusOperatorId;
                targetOperatorId = dto.BusOperatorId;
            }
            else
            {
                targetOperatorId = busOperatorId.Value;
            }

            var fleetError = await ValidateFleetReferencesAsync(dto.BusId, dto.OperatorRouteId, targetOperatorId);
            if (fleetError != null) return fleetError;

            item.BusRouteId = dto.BusRouteId;
            item.OperatorRouteId = dto.OperatorRouteId;
            item.BusId = dto.BusId;
            item.ScheduleCode = dto.ScheduleCode;
            item.DepartureTimeOfDay = dto.DepartureTimeOfDay;
            item.ArrivalTimeOfDay = dto.ArrivalTimeOfDay;
            item.OperatingDays = dto.OperatingDays;
            item.EffectiveFrom = dto.EffectiveFrom;
            item.EffectiveTo = dto.EffectiveTo;
            item.BaseFare = dto.BaseFare;
            item.Currency = dto.Currency;
            item.IsActive = dto.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Schedule was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save Schedule.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.Schedules.FirstOrDefaultAsync(x => x.Id == id);
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
                return Conflict(new { message = "This Schedule was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this Schedule — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static ScheduleResponseDto ToResponseDto(Schedule x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            BusRouteId = x.BusRouteId,
            OperatorRouteId = x.OperatorRouteId,
            BusId = x.BusId,
            ScheduleCode = x.ScheduleCode,
            DepartureTimeOfDay = x.DepartureTimeOfDay,
            ArrivalTimeOfDay = x.ArrivalTimeOfDay,
            OperatingDays = x.OperatingDays,
            EffectiveFrom = x.EffectiveFrom,
            EffectiveTo = x.EffectiveTo,
            BaseFare = x.BaseFare,
            Currency = x.Currency,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
