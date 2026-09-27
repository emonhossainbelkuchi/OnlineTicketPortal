// Piece 5 (Operator Back-Office & Fleet Operations) — operator scoping. 🟡 tier. Same fix as
// OperatorBranchesController, but OperatorRouteStop has no BusOperatorId of its own — it hangs
// off OperatorRoute, so scoping/ownership checks join through OperatorRoute.BusOperatorId. See
// OperatorBranchesController's header comment for the Admin/Staff/Operator role-gate note.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.CompanyNetwork;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorRouteStopsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<OperatorRouteStopResponseDto>());
            }

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            var query = db.OperatorRouteStops.AsQueryable();
            if (busOperatorId != null)
            {
                query = query.Where(x => db.OperatorRoutes.Any(r =>
                    r.Id == x.OperatorRouteId && r.BusOperatorId == busOperatorId));
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.OperatorRouteStops.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null)
            {
                var owns = await db.OperatorRoutes.AnyAsync(r =>
                    r.Id == item.OperatorRouteId && r.BusOperatorId == busOperatorId);
                if (!owns) return Forbid();
            }

            return Ok(ToResponseDto(item));
        }

        // Looks up which operator a given OperatorRoute actually belongs to, or null if that
        // OperatorRouteId doesn't exist at all — shared by Create/Update so the "does it exist"
        // and "whose is it" checks stay in one place.
        private async Task<Guid?> GetRouteOperatorIdAsync(Guid operatorRouteId) =>
            await db.OperatorRoutes
                .Where(r => r.Id == operatorRouteId)
                .Select(r => (Guid?)r.BusOperatorId)
                .FirstOrDefaultAsync();

        [HttpPost]
        public async Task<IActionResult> Create(OperatorRouteStopCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);

            var routeOperatorId = await GetRouteOperatorIdAsync(dto.OperatorRouteId);
            if (routeOperatorId == null)
            {
                return BadRequest(new { message = "OperatorRouteId does not match a real OperatorRoute." });
            }

            // Scoped staff can only add stops to their OWN operator's routes — this is what
            // stops one operator from tampering with another operator's route stops.
            if (busOperatorId != null && routeOperatorId != busOperatorId)
            {
                return BadRequest(new { message = "That OperatorRoute belongs to a different operator." });
            }

            var item = new OperatorRouteStop
            {
                OperatorRouteId = dto.OperatorRouteId,
                TerminalId = dto.TerminalId,
                StopOrder = dto.StopOrder,
                ArrivalOffsetMinutes = dto.ArrivalOffsetMinutes,
                DepartureOffsetMinutes = dto.DepartureOffsetMinutes,
                IsPickupPoint = dto.IsPickupPoint,
                IsDropOffPoint = dto.IsDropOffPoint,
                ExternalStopKey = dto.ExternalStopKey,
            };

            db.OperatorRouteStops.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, OperatorRouteStopUpdateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.OperatorRouteStops.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "OperatorRouteStop not found." });

            var busOperatorId = await User.GetBusOperatorIdAsync(db);

            var currentRouteOperatorId = await GetRouteOperatorIdAsync(item.OperatorRouteId);
            if (busOperatorId != null && currentRouteOperatorId != busOperatorId) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This OperatorRouteStop was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // If the caller is moving this stop to a different OperatorRoute, re-check the same
            // "does it exist / whose is it" rules against the NEW target, not just the old one.
            if (dto.OperatorRouteId != item.OperatorRouteId)
            {
                var newRouteOperatorId = await GetRouteOperatorIdAsync(dto.OperatorRouteId);
                if (newRouteOperatorId == null)
                {
                    return BadRequest(new { message = "OperatorRouteId does not match a real OperatorRoute." });
                }
                if (busOperatorId != null && newRouteOperatorId != busOperatorId)
                {
                    return BadRequest(new { message = "That OperatorRoute belongs to a different operator." });
                }
            }

            item.OperatorRouteId = dto.OperatorRouteId;
            item.TerminalId = dto.TerminalId;
            item.StopOrder = dto.StopOrder;
            item.ArrivalOffsetMinutes = dto.ArrivalOffsetMinutes;
            item.DepartureOffsetMinutes = dto.DepartureOffsetMinutes;
            item.IsPickupPoint = dto.IsPickupPoint;
            item.IsDropOffPoint = dto.IsDropOffPoint;
            item.ExternalStopKey = dto.ExternalStopKey;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This OperatorRouteStop was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save OperatorRouteStop.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.OperatorRouteStops.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null)
            {
                var owns = await db.OperatorRoutes.AnyAsync(r =>
                    r.Id == item.OperatorRouteId && r.BusOperatorId == busOperatorId);
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
                return Conflict(new { message = "This OperatorRouteStop was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this OperatorRouteStop — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static OperatorRouteStopResponseDto ToResponseDto(OperatorRouteStop x) => new()
        {
            Id = x.Id,
            OperatorRouteId = x.OperatorRouteId,
            TerminalId = x.TerminalId,
            StopOrder = x.StopOrder,
            ArrivalOffsetMinutes = x.ArrivalOffsetMinutes,
            DepartureOffsetMinutes = x.DepartureOffsetMinutes,
            IsPickupPoint = x.IsPickupPoint,
            IsDropOffPoint = x.IsDropOffPoint,
            ExternalStopKey = x.ExternalStopKey,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
