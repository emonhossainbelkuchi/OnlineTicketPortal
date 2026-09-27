// Piece 5 (Operator Back-Office & Fleet Operations) — operator scoping. 🟡 tier. TripCrew has no
// BusOperatorId of its own — it hangs off Trip, so scoping/ownership checks join through
// Trip.BusOperatorId. See OperatorBranchesController's header comment for the
// Admin/Staff/Operator role-gate note.
//
// Chunk 5 (RBAC Amendment v3 / Chunk 2 task 6 names TripCrewsController as one of the
// controllers Crew.Manage belongs on): Create/Update/Delete now also require the Crew.Manage
// permission, on top of the existing role gate + Trip-operator scoping below — a CounterStaff
// account passes the role gate today but has no business assigning drivers to trips.
// GetAll/GetById stay as plain Staff-role-gated reads, same as before this change; nothing in
// the plan calls for a separate read-side permission here.
//
// Two extra checks beyond plain scoping, both called out directly in the completion plan:
//   1. StaffProfileId must belong to the SAME operator as the Trip (or be platform staff, who can
//      crew any operator's trip) — otherwise one operator could assign another operator's staff
//      (or vice versa) as crew on a trip that isn't theirs.
//   2. The plan asked us to sanity-check whether a driver/crew member can be double-booked onto
//      two trips at once. No such check existed — this was presumably never intended, so
//      HasOverlappingAssignmentAsync below adds it rather than just flagging it and moving on.
using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TripCrewsController(AppDbContext db, ICurrentActorService currentActor) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<TripCrewResponseDto>());
            }

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            var query = db.TripCrews.AsQueryable();
            if (busOperatorId != null)
            {
                query = query.Where(x => db.Trips.Any(t =>
                    t.Id == x.TripId && t.BusOperatorId == busOperatorId));
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.TripCrews.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null)
            {
                var owns = await db.Trips.AnyAsync(t => t.Id == item.TripId && t.BusOperatorId == busOperatorId);
                if (!owns) return Forbid();
            }

            return Ok(ToResponseDto(item));
        }

        // A driver (or any crew member) shouldn't be double-booked onto two trips whose journeys
        // actually overlap in time. Cancelled trips don't count — they're never actually run.
        // excludeTripCrewId lets Update check "everyone but myself" so editing an assignment's
        // own Role/AssignedAtUtc doesn't trip over its own existing row.
        private async Task<bool> HasOverlappingAssignmentAsync(
            Guid staffProfileId, DateTime departureUtc, DateTime arrivalUtc, Guid? excludeTripCrewId)
        {
            var query = db.TripCrews
                .Where(tc => tc.StaffProfileId == staffProfileId)
                .Where(tc => tc.Trip.Status != TripStatus.Cancelled);

            if (excludeTripCrewId != null)
            {
                query = query.Where(tc => tc.Id != excludeTripCrewId.Value);
            }

            // Two time ranges overlap when each one starts before the other ends.
            return await query.AnyAsync(tc =>
                tc.Trip.DepartureTimeUtc < arrivalUtc && departureUtc < tc.Trip.ArrivalTimeUtc);
        }

        // Confirms TripId/StaffProfileId are real, that (when scoped) the Trip belongs to the
        // caller's own operator, and that the StaffProfile isn't a different operator's own
        // staff. Returns (error, trip) — error is non-null to short-circuit on, trip is non-null
        // whenever error is null.
        private async Task<(IActionResult? Error, Trip? Trip)> ValidateAssignmentAsync(
            Guid tripId, Guid staffProfileId, Guid? busOperatorId)
        {
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
            if (trip == null)
            {
                return (BadRequest(new { message = "TripId does not match a real Trip." }), null);
            }

            if (busOperatorId != null && trip.BusOperatorId != busOperatorId)
            {
                return (BadRequest(new { message = "That Trip belongs to a different operator." }), null);
            }

            var staffProfile = await db.StaffProfiles.FirstOrDefaultAsync(sp => sp.Id == staffProfileId);
            if (staffProfile == null)
            {
                return (BadRequest(new { message = "StaffProfileId does not match a real StaffProfile." }), null);
            }

            // Null BusOperatorId on the StaffProfile = platform staff, who can crew any
            // operator's trip. A non-null value must match the Trip's own operator.
            if (staffProfile.BusOperatorId != null && staffProfile.BusOperatorId != trip.BusOperatorId)
            {
                return (BadRequest(new { message = "That StaffProfile belongs to a different operator than the Trip." }), null);
            }

            return (null, trip);
        }

        [HttpPost]
        public async Task<IActionResult> Create(TripCrewCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.CrewManage)) return Forbid();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);

            var (error, trip) = await ValidateAssignmentAsync(dto.TripId, dto.StaffProfileId, busOperatorId);
            if (error != null) return error;

            if (await HasOverlappingAssignmentAsync(dto.StaffProfileId, trip!.DepartureTimeUtc, trip.ArrivalTimeUtc, null))
            {
                return Conflict(new
                {
                    message = "This staff member is already assigned to another trip whose schedule overlaps this one."
                });
            }

            var item = new TripCrew
            {
                TripId = dto.TripId,
                StaffProfileId = dto.StaffProfileId,
                Role = dto.Role,
                AssignedAtUtc = dto.AssignedAtUtc,
            };

            db.TripCrews.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, TripCrewUpdateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.CrewManage)) return Forbid();

            var item = await db.TripCrews.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "TripCrew not found." });

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null)
            {
                var owns = await db.Trips.AnyAsync(t => t.Id == item.TripId && t.BusOperatorId == busOperatorId);
                if (!owns) return Forbid();
            }

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This TripCrew was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // Re-validate against the (possibly new) TripId/StaffProfileId, same as Create —
            // moving this assignment to a different trip or crew member has to pass the same
            // ownership and overlap checks a brand-new assignment would.
            var (error, trip) = await ValidateAssignmentAsync(dto.TripId, dto.StaffProfileId, busOperatorId);
            if (error != null) return error;

            if (await HasOverlappingAssignmentAsync(dto.StaffProfileId, trip!.DepartureTimeUtc, trip.ArrivalTimeUtc, item.Id))
            {
                return Conflict(new
                {
                    message = "This staff member is already assigned to another trip whose schedule overlaps this one."
                });
            }

            item.TripId = dto.TripId;
            item.StaffProfileId = dto.StaffProfileId;
            item.Role = dto.Role;
            item.AssignedAtUtc = dto.AssignedAtUtc;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This TripCrew was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error2 = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save TripCrew.", details = error2 });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.CrewManage)) return Forbid();

            var item = await db.TripCrews.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null)
            {
                var owns = await db.Trips.AnyAsync(t => t.Id == item.TripId && t.BusOperatorId == busOperatorId);
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
                return Conflict(new { message = "This TripCrew was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this TripCrew — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static TripCrewResponseDto ToResponseDto(TripCrew x) => new()
        {
            Id = x.Id,
            TripId = x.TripId,
            StaffProfileId = x.StaffProfileId,
            Role = x.Role,
            AssignedAtUtc = x.AssignedAtUtc,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
