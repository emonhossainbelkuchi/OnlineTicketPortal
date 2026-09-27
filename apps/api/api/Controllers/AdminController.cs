using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Identity;
using TicketPortal.Api.Models.People;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Completion Plan Piece 1 — Identity, Access Control & Platform Configuration.
    // Admin-only account/role provisioning. Kept separate from AccountController on purpose:
    // AccountController.Register is the public, UNauthenticated customer self-signup path — it
    // must never be able to hand out Staff/Operator/Admin permissions to a caller who hasn't
    // already been let in the door by an existing Admin.
    //
    // Three jobs live here:
    //   1. GetUsers    — list every login account with its current role(s). Nothing else in
    //      the API lists users at all, so this is also the only way an Admin can find a
    //      userId to hand to AssignRole below instead of already having to know one.
    //   2. AssignRole  — change an EXISTING user's permission tier. For one-off fixes
    //      (promoting someone, correcting a mistake) on an account that already exists,
    //      regardless of how it was created.
    //   3. CreateStaff — the normal way a NEW Staff/Operator account comes into being. Creates
    //      the login and its StaffProfile together, in one step, so BusOperatorId is set
    //      correctly from the very first moment the account exists — never a two-step
    //      "create the login, then hope someone remembers to attach a StaffProfile later"
    //      process. This is the answer to the plan's "decide and document how a new
    //      Staff/Operator account gets created with the right StaffProfile.BusOperatorId set at
    //      registration time" — see DbSeeder.SeedRolesAsync for the full role-semantics writeup.
    [Authorize]
    [Route("api/admin")]
    [ApiController]
    public class AdminController(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager) : ControllerBase
    {
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            if (!User.IsInRole("Admin")) return Forbid();

            // .Include(StaffProfile) so BusOperatorId is available without an extra round trip
            // per row — there is no paging here on purpose, this mirrors every other simple
            // GetAll in the codebase (see BusOperatorsController) rather than inventing a
            // one-off paging shape just for this endpoint.
            var users = await userManager.Users
                .Include(u => u.StaffProfile)
                .OrderBy(u => u.UserName)
                .ToListAsync();

            var result = new List<AdminUserListItemDto>();
            foreach (var user in users)
            {
                result.Add(new AdminUserListItemDto
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    Email = user.Email,
                    FullName = user.FullName,
                    IsActive = user.IsActive,
                    CreatedAtUtc = user.CreatedAtUtc,
                    LastLoginAtUtc = user.LastLoginAtUtc,
                    // One GetRolesAsync call per user — fine at admin-console scale, not a
                    // hot customer-facing path, and keeps this readable over a hand-rolled
                    // join against AspNetUserRoles.
                    Roles = (await userManager.GetRolesAsync(user)).ToList(),
                    BusOperatorId = user.StaffProfile?.BusOperatorId,
                });
            }

            return Ok(result);
        }

        [HttpPost("users/{userId}/roles")]
        public async Task<IActionResult> AssignRole(Guid userId, AssignRoleDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            // RBAC Amendment v3, task 5: "Operator" is retired as a login role — no demo
            // account uses it, and Staff (plus the correct StaffProfile.Role job title) is the
            // only login role an operator's own employee should ever be assigned.
            if (dto.Role == "Operator")
            {
                return BadRequest(new
                {
                    message = "The 'Operator' identity role is retired. Assign 'Staff' and set the " +
                               "correct StaffProfile job role (Manager/CounterStaff/etc.) instead."
                });
            }

            if (!await roleManager.RoleExistsAsync(dto.Role))
            {
                var validRoles = await roleManager.Roles.Select(r => r.Name).ToListAsync();
                return BadRequest(new { message = $"Unknown role '{dto.Role}'.", validRoles });
            }

            var user = await userManager.FindByIdAsync(userId.ToString());
            if (user == null) return NotFound(new { message = "User not found." });

            // A user has exactly one permission tier at a time — replace, don't accumulate.
            var currentRoles = await userManager.GetRolesAsync(user);
            if (currentRoles.Count > 0)
            {
                var removeResult = await userManager.RemoveFromRolesAsync(user, currentRoles);
                if (!removeResult.Succeeded)
                {
                    return BadRequest(removeResult.Errors.Select(e => e.Description));
                }
            }

            var addResult = await userManager.AddToRoleAsync(user, dto.Role);
            if (!addResult.Succeeded)
            {
                return BadRequest(addResult.Errors.Select(e => e.Description));
            }

            return Ok(new AssignRoleResponseDto
            {
                UserId = user.Id,
                UserName = user.UserName!,
                // GetRolesAsync returns IList<string>, which does NOT implicitly convert to
                // IReadOnlyCollection<string> (see AccountController.Login for the same fix)
                // — .ToList() here is required to compile, not optional.
                Roles = (await userManager.GetRolesAsync(user)).ToList(),
            });
        }

        [HttpPost("staff")]
        public async Task<IActionResult> CreateStaff(CreateStaffAccountDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            // "Operator" is retired (see AssignRole above) — Staff is the only login role for
            // an operator's own employee now, distinguished by StaffProfile.BusOperatorId /
            // .Role, not by a separate Identity role.
            if (dto.Role is not ("Staff" or "Admin"))
            {
                return BadRequest(new
                {
                    message = "Role must be 'Staff' or 'Admin'. " +
                               "Use POST /api/account/register for Customer accounts."
                });
            }

            // RBAC Amendment v3: StaffRole.Admin/SuperAdmin must never be assignable to a new
            // StaffProfile — those two values are reserved for a future deliberate migration
            // and must never be read as implying the Identity Admin role (see PermissionMatrix).
            if (PermissionMatrix.RetiredJobRoles.Contains(dto.JobRole))
            {
                return BadRequest(new
                {
                    message = $"JobRole '{dto.JobRole}' is retired for new staff. " +
                               "Use the Identity Role field to grant platform Admin access instead."
                });
            }

            if (dto.BusOperatorId.HasValue &&
                !await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId.Value))
            {
                return BadRequest(new { message = "BusOperatorId does not match a real BusOperator." });
            }

            var user = new ApplicationUser
            {
                UserName = dto.UserName,
                Email = dto.Email,
                FullName = dto.FullName,
            };

            // RBAC Amendment v3, task 5: the login account and its StaffProfile must be
            // created atomically — previously a StaffProfile save failure (e.g. a duplicate
            // EmployeeCode) left a fully working login with a role but NO StaffProfile at all,
            // which CurrentActorService now treats as UnprovisionedStaff (denied everywhere),
            // but which used to fall through the old broad IsInRole("Staff") checks as if it
            // were unscoped platform staff. A DB transaction around the whole operation means
            // a StaffProfile failure rolls back the user creation and role assignment too,
            // instead of leaving that half-created account behind.
            await using var transaction = await db.Database.BeginTransactionAsync();

            var createResult = await userManager.CreateAsync(user, dto.Password);
            if (!createResult.Succeeded)
            {
                await transaction.RollbackAsync();
                return BadRequest(createResult.Errors.Select(e => e.Description));
            }

            var roleResult = await userManager.AddToRoleAsync(user, dto.Role);
            if (!roleResult.Succeeded)
            {
                await transaction.RollbackAsync();
                return BadRequest(roleResult.Errors.Select(e => e.Description));
            }

            var profile = new StaffProfile
            {
                UserId = user.Id,
                BusOperatorId = dto.BusOperatorId,
                EmployeeCode = dto.EmployeeCode,
                Role = dto.JobRole,
            };
            db.StaffProfiles.Add(profile);

            try
            {
                await db.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync();
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not create staff account — no login or StaffProfile was saved.", details = error });
            }

            return StatusCode(201, new CreateStaffAccountResponseDto
            {
                UserId = user.Id,
                StaffProfileId = profile.Id,
                UserName = user.UserName!,
                Role = dto.Role,
                BusOperatorId = profile.BusOperatorId,
            });
        }
    }
}
