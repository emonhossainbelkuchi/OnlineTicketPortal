// Piece 6 (People/HR & ERP Integrations) — operator scoping. 🟡 tier, same two-part gate as the
// rest of this HR bucket: customers blocked entirely; among Staff, an operator's own staff only
// see/write their OWN operator's staff profiles; platform Staff/Admin see everything.
//
// This is the one controller in the bucket where the scoped field (BusOperatorId) lives
// directly on the entity rather than behind a StaffProfileId join, and it's also the actual
// security boundary, not just a visibility filter: without checking it on Create, an operator's
// own staff could plant a profile under a DIFFERENT operator (or under no operator at all —
// i.e. claim platform-staff scope) purely by choosing what to put in the request body. So
// BusOperatorId is verified/overridden on Create rather than trusted as-is, and dropped from
// Update entirely (see PeopleDtos.cs) — never reassignable after creation via this endpoint.
//
// Note this is a secondary path: the normal way a brand-new Staff/Operator account comes into
// being is AdminController.CreateStaff (Piece 1), which creates the login AND this profile
// together. This controller covers everything else — attaching a profile to an existing login,
// and every read/update/delete afterwards.
//
// RBAC Amendment v3 rewrote the authorization here. Three separate gaps existed:
//   1. Read/write required only "some kind of Staff account for this operator" — StaffRead/
//      StaffManage permission is now checked, so a CounterStaff or Supervisor (neither of
//      which have Staff.Manage) can no longer create/edit/delete staff records at all.
//   2. Any accessible caller — including the profile's OWNER — could set Role and IsActive
//      through the general Update endpoint, i.e. a CounterStaff could PUT their own profile
//      with Role=Manager and self-promote. Update now refuses to change Role/IsActive on the
//      caller's OWN profile, full stop, regardless of what permission they hold. A separate
//      limited endpoint (UpdateMyProfile) lets anyone fix their own contact details without
//      touching job-affecting fields at all.
//   3. Nothing stopped an Operator Manager from creating/editing a PEER Manager-tier profile
//      of their own operator. Non-Admin operator-scoped callers are now restricted to
//      lower-ranked job roles (PermissionMatrix.OperatorManagerAssignableJobRoles) on both the
//      target's CURRENT and NEW Role — Manager/Operator/BusOwner/Admin/SuperAdmin tier changes
//      stay Platform-Admin-only.

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
    public class StaffProfilesController(AppDbContext db, ICurrentActorService currentActor) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.StaffRead))
            {
                return Ok(Array.Empty<StaffProfileResponseDto>());
            }

            var query = db.StaffProfiles.AsQueryable();
            if (actor.BusOperatorId != null)
            {
                query = query.Where(sp => sp.BusOperatorId == actor.BusOperatorId);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.StaffRead)) return Forbid();

            var item = await db.StaffProfiles.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!actor.CanManageOperator(EffectiveOperatorId(item))) return Forbid();

            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(StaffProfileCreateDto dto)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.StaffManage)) return Forbid();

            if (PermissionMatrix.RetiredJobRoles.Contains(dto.Role))
            {
                return BadRequest(new { message = $"Role '{dto.Role}' is retired for new StaffProfile data." });
            }

            var busOperatorId = dto.BusOperatorId;
            if (!actor.IsAdmin)
            {
                if (actor.BusOperatorId != null)
                {
                    if (dto.BusOperatorId != actor.BusOperatorId)
                    {
                        return BadRequest(new { message = "You can only create staff profiles for your own operator." });
                    }
                    busOperatorId = actor.BusOperatorId;

                    // Operator-scoped, non-Admin: may only create "lower-ranked" job roles —
                    // see file header point 3.
                    if (!PermissionMatrix.OperatorManagerAssignableJobRoles.Contains(dto.Role))
                    {
                        return Forbid();
                    }
                }
                // else: platform Staff with Staff.Manage — allowed to set any BusOperatorId
                // and any (non-retired) job role.
            }

            var item = new StaffProfile
            {
                UserId = dto.UserId,
                BusOperatorId = busOperatorId,
                EmployeeCode = dto.EmployeeCode,
                Role = dto.Role,
                NationalIdNumber = dto.NationalIdNumber,
                JoiningDate = dto.JoiningDate,
                Address = dto.Address,
                TotalTripsCompleted = dto.TotalTripsCompleted,
                IsActive = dto.IsActive,
            };

            db.StaffProfiles.Add(item);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save StaffProfile.", details = error });
            }

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, StaffProfileUpdateDto dto)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.StaffManage)) return Forbid();

            var item = await db.StaffProfiles.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "StaffProfile not found." });
            if (!actor.CanManageOperator(EffectiveOperatorId(item))) return Forbid();

            // Self-promotion guard (file header point 2): no one edits their own Role or
            // IsActive through this endpoint, no matter what permission they hold — including
            // an Admin's own StaffProfile, if they happen to have one. Everything else about
            // your own profile (EmployeeCode, dates, trip count) is still editable here by
            // someone else with Staff.Manage; use UpdateMyProfile below for your own contact
            // details without needing Staff.Manage at all.
            if (item.UserId == actor.UserId && (dto.Role != item.Role || dto.IsActive != item.IsActive))
            {
                return Forbid();
            }

            if (PermissionMatrix.RetiredJobRoles.Contains(dto.Role))
            {
                return BadRequest(new { message = $"Role '{dto.Role}' is retired for StaffProfile data." });
            }

            // Non-Admin, operator-scoped: can't touch a peer/higher-tier profile, and can't
            // promote a lower-ranked one INTO Manager/Operator/BusOwner tier — file header
            // point 3.
            if (!actor.IsAdmin && actor.BusOperatorId != null)
            {
                var targetIsLowerRanked = PermissionMatrix.OperatorManagerAssignableJobRoles.Contains(item.Role);
                var newRoleIsLowerRanked = PermissionMatrix.OperatorManagerAssignableJobRoles.Contains(dto.Role);
                if (!targetIsLowerRanked || !newRoleIsLowerRanked)
                {
                    return Forbid();
                }
            }

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This StaffProfile was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // UserId/BusOperatorId deliberately never touched here — see file header.
            item.EmployeeCode = dto.EmployeeCode;
            item.Role = dto.Role;
            item.NationalIdNumber = dto.NationalIdNumber;
            item.JoiningDate = dto.JoiningDate;
            item.Address = dto.Address;
            item.TotalTripsCompleted = dto.TotalTripsCompleted;
            item.IsActive = dto.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This StaffProfile was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save StaffProfile.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        // RBAC Amendment v3, task 5: everyone — regardless of Staff.Manage — may keep their own
        // contact details current. Only NationalIdNumber/Address are touched; Role, IsActive,
        // EmployeeCode, and TotalTripsCompleted are not on StaffProfileMyProfileUpdateDto at
        // all, so there's no field here a caller could even attempt to self-promote through.
        [HttpPut("{id}/my-profile")]
        public async Task<IActionResult> UpdateMyProfile(Guid id, StaffProfileMyProfileUpdateDto dto)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (actor.Type != ActorType.Staff) return Forbid();

            var item = await db.StaffProfiles.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "StaffProfile not found." });
            if (item.UserId != actor.UserId) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This StaffProfile was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.NationalIdNumber = dto.NationalIdNumber;
            item.Address = dto.Address;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This StaffProfile was already modified or deleted by another request." });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.StaffManage)) return Forbid();

            var item = await db.StaffProfiles.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!actor.CanManageOperator(EffectiveOperatorId(item))) return Forbid();

            // No self-deactivation-via-delete either — same reasoning as the Update guard.
            if (item.UserId == actor.UserId) return Forbid();

            if (!actor.IsAdmin && actor.BusOperatorId != null &&
                !PermissionMatrix.OperatorManagerAssignableJobRoles.Contains(item.Role))
            {
                return Forbid();
            }

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This StaffProfile was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this StaffProfile — it is still referenced by other records." });
            }

            return NoContent();
        }

        // CanManageOperator expects a non-null Guid for a scoped resource; a platform-staff
        // StaffProfile (BusOperatorId == null) is only ever reachable by another platform-wide
        // actor or Admin (both already pass CanManageOperator's BusOperatorId == null branch),
        // so mapping null -> Guid.Empty here is safe: it can never match a real, non-null
        // caller BusOperatorId and therefore never grants operator-scoped staff access to a
        // platform profile they shouldn't see.
        private static Guid EffectiveOperatorId(StaffProfile item) => item.BusOperatorId ?? Guid.Empty;

        private static StaffProfileResponseDto ToResponseDto(StaffProfile x) => new()
        {
            Id = x.Id,
            UserId = x.UserId,
            BusOperatorId = x.BusOperatorId,
            EmployeeCode = x.EmployeeCode,
            Role = x.Role,
            NationalIdNumber = x.NationalIdNumber,
            JoiningDate = x.JoiningDate,
            Address = x.Address,
            TotalTripsCompleted = x.TotalTripsCompleted,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
