using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Data
{
    // Seeds platform-wide reference data (Terminals, BusRoutes) that no module's controller
    // is responsible for creating, but that Trip and Booking require via non-nullable FK.
    // Safe to call on every startup — it only inserts when the tables are empty.
    //
    // Also seeds the real login-permission roles and a bootstrap Admin account (Completion
    // Plan Piece 1 — "seed real ApplicationRole rows... right now the only way to grant a role
    // is a raw SQL insert, which isn't a real solution"). See AdminController for how every
    // other Staff/Operator/Admin account gets created after this one exists.
    public static class DbSeeder
    {
        // Fixed GUIDs (not Guid.NewGuid()) so the same IDs come back every time you drop
        // and recreate the database — hardcode them straight into Postman requests instead
        // of re-querying the database after every reseed.
        public static readonly Guid DhakaGabtoliId = Guid.Parse("11111111-1111-1111-1111-111111111101");
        public static readonly Guid DhakaKalyanpurId = Guid.Parse("11111111-1111-1111-1111-111111111102");
        public static readonly Guid ChittagongCentralId = Guid.Parse("11111111-1111-1111-1111-111111111103");
        public static readonly Guid SylhetKadamtaliId = Guid.Parse("11111111-1111-1111-1111-111111111104");
        public static readonly Guid CoxsBazarId = Guid.Parse("11111111-1111-1111-1111-111111111105");

        public static readonly Guid DhakaToChittagongRouteId = Guid.Parse("22222222-2222-2222-2222-222222222201");
        public static readonly Guid ChittagongToDhakaRouteId = Guid.Parse("22222222-2222-2222-2222-222222222202");
        public static readonly Guid DhakaToSylhetRouteId = Guid.Parse("22222222-2222-2222-2222-222222222203");
        public static readonly Guid DhakaToCoxsBazarRouteId = Guid.Parse("22222222-2222-2222-2222-222222222204");

        public static async Task SeedReferenceDataAsync(AppDbContext db)
        {
            if (!await db.Terminals.AnyAsync())
            {
                db.Terminals.AddRange(
                    new Terminal { Id = DhakaGabtoliId, Name = "Gabtoli Bus Terminal", Code = "DHK-GBT", City = "Dhaka", District = "Dhaka", Division = "Dhaka" },
                    new Terminal { Id = DhakaKalyanpurId, Name = "Kalyanpur Bus Stand", Code = "DHK-KLP", City = "Dhaka", District = "Dhaka", Division = "Dhaka" },
                    new Terminal { Id = ChittagongCentralId, Name = "Chittagong Central Terminal", Code = "CTG-CEN", City = "Chittagong", District = "Chittagong", Division = "Chittagong" },
                    new Terminal { Id = SylhetKadamtaliId, Name = "Sylhet Kadamtali Terminal", Code = "SYL-KDT", City = "Sylhet", District = "Sylhet", Division = "Sylhet" },
                    new Terminal { Id = CoxsBazarId, Name = "Cox's Bazar Bus Terminal", Code = "CXB-CEN", City = "Cox's Bazar", District = "Cox's Bazar", Division = "Chittagong" }
                );
                await db.SaveChangesAsync();
            }

            if (!await db.BusRoutes.AnyAsync())
            {
                db.BusRoutes.AddRange(
                    new BusRoute { Id = DhakaToChittagongRouteId, OriginTerminalId = DhakaGabtoliId, DestinationTerminalId = ChittagongCentralId, RouteCode = "DHK-CTG", Name = "Dhaka - Chittagong", DistanceKm = 264, EstimatedDurationMinutes = 360 },
                    new BusRoute { Id = ChittagongToDhakaRouteId, OriginTerminalId = ChittagongCentralId, DestinationTerminalId = DhakaGabtoliId, RouteCode = "CTG-DHK", Name = "Chittagong - Dhaka", DistanceKm = 264, EstimatedDurationMinutes = 360, ReverseRouteId = DhakaToChittagongRouteId },
                    new BusRoute { Id = DhakaToSylhetRouteId, OriginTerminalId = DhakaKalyanpurId, DestinationTerminalId = SylhetKadamtaliId, RouteCode = "DHK-SYL", Name = "Dhaka - Sylhet", DistanceKm = 247, EstimatedDurationMinutes = 330 },
                    new BusRoute { Id = DhakaToCoxsBazarRouteId, OriginTerminalId = DhakaGabtoliId, DestinationTerminalId = CoxsBazarId, RouteCode = "DHK-CXB", Name = "Dhaka - Cox's Bazar", DistanceKm = 414, EstimatedDurationMinutes = 540 }
                );
                await db.SaveChangesAsync();
            }
        }

        // The four login-permission tiers used by every [Authorize]/IsInRole check across the
        // whole backend (see the Completion Plan's "Shared conventions" section). Idempotent —
        // safe to run on every startup.
        //
        // Role semantics decided here (nothing else pins this down):
        //   Customer — assigned automatically by AccountController.Register (public self-signup).
        //   Staff    — every account with a StaffProfile, BOTH our own platform staff
        //              (StaffProfile.BusOperatorId == null) AND an operator's own staff
        //              (BusOperatorId == that operator). Every `IsInRole("Staff")` check
        //              elsewhere in the codebase is written against this one role; BusOperatorId
        //              is what narrows an operator's staff down to their own rows on top of that
        //              (see Extensions/ClaimsPrincipalExtensions.GetBusOperatorIdAsync).
        //   Operator — seeded because the plan calls for it explicitly, and assignable through
        //              AdminController, but nothing in the codebase currently gates on it: every
        //              scoping check that tells "our staff" from "an operator's staff" apart
        //              uses BusOperatorId, not the role name. Reserved for a future
        //              operator-company-portal login that isn't tied to an individual
        //              StaffProfile — flag for removal if that need never materializes.
        //   Admin    — full access everywhere; only ever granted through AdminController.
        public static async Task SeedRolesAsync(RoleManager<ApplicationRole> roleManager)
        {
            string[] roles = ["Admin", "Staff", "Operator", "Customer"];

            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new ApplicationRole { Name = role });
                }
            }
        }

        // Fixed Guid, same reasoning as the Terminal/BusRoute ids above — a fresh clone of this
        // repo needs ONE working Admin account to call AdminController with, or nobody can ever
        // grant anyone else a role without a raw SQL insert (the exact problem Piece 1 exists to
        // remove). Dev-only credentials — rotate or remove before any real deployment.
        public static readonly Guid BootstrapAdminId = Guid.Parse("33333333-3333-3333-3333-333333333301");
        public const string BootstrapAdminUserName = "admin";
        public const string BootstrapAdminPassword = "Admin@12345";

        // Idempotent, and (since the merge) self-healing. The old version returned as soon as a
        // user named "admin" existed and never looked at that account again, so ANY stale state
        // in a reused development database silently locked you out of the admin panel forever:
        // a password changed while testing /api/account/change-password, five wrong attempts
        // (Identity locks the account for 15 minutes even for the CORRECT password afterwards),
        // an "admin" row created by another branch of the project, or an account that lost its
        // "Admin" role. It also ignored a failed CreateAsync completely (e.g. the email already
        // belonging to a different user), so nothing in the console explained why login failed.
        //
        // repairDevelopmentCredentials must only be true in the Development environment (see
        // Program.cs). When true, an existing bootstrap admin is put back into the documented
        // known-good state: unlocked, e-mail confirmed, in the Admin role, and using
        // BootstrapAdminPassword. When false (Production), an existing admin is never touched
        // beyond making sure it has the Admin role, so a real, rotated password is never reset.
        public static async Task SeedAdminUserAsync(
            UserManager<ApplicationUser> userManager,
            ILogger? logger = null,
            bool repairDevelopmentCredentials = false)
        {
            const string adminEmail = "admin@ticketportal.local";

            var admin = await userManager.FindByNameAsync(BootstrapAdminUserName);

            if (admin == null)
            {
                admin = new ApplicationUser
                {
                    Id = BootstrapAdminId,
                    UserName = BootstrapAdminUserName,
                    Email = adminEmail,
                    FullName = "Platform Admin",
                    EmailConfirmed = true,
                };

                var created = await userManager.CreateAsync(admin, BootstrapAdminPassword);
                if (!created.Succeeded)
                {
                    var reasons = string.Join("; ", created.Errors.Select(e => e.Description));
                    var owner = await userManager.FindByEmailAsync(adminEmail);
                    logger?.LogError(
                        "Bootstrap admin '{UserName}' could NOT be created: {Reasons}. " +
                        "{OwnerHint}",
                        BootstrapAdminUserName,
                        reasons,
                        owner != null
                            ? $"The e-mail {adminEmail} already belongs to the account '{owner.UserName}' - log in with that username, or delete that row / the whole development database and restart."
                            : "Delete the local development database and restart so it is created from scratch.");
                    return;
                }

                logger?.LogInformation(
                    "Bootstrap admin created: username '{UserName}', password '{Password}' (development only).",
                    BootstrapAdminUserName, BootstrapAdminPassword);
            }
            else if (repairDevelopmentCredentials)
            {
                var repairs = new List<string>();

                if (!admin.EmailConfirmed || !admin.IsActive)
                {
                    admin.EmailConfirmed = true;
                    admin.IsActive = true;
                    var updated = await userManager.UpdateAsync(admin);
                    if (updated.Succeeded) repairs.Add("confirmed e-mail / re-activated account");
                }

                if (await userManager.IsLockedOutAsync(admin) || admin.AccessFailedCount > 0)
                {
                    await userManager.SetLockoutEndDateAsync(admin, null);
                    await userManager.ResetAccessFailedCountAsync(admin);
                    repairs.Add("cleared login lockout");
                }

                if (!await userManager.CheckPasswordAsync(admin, BootstrapAdminPassword))
                {
                    var token = await userManager.GeneratePasswordResetTokenAsync(admin);
                    var reset = await userManager.ResetPasswordAsync(admin, token, BootstrapAdminPassword);
                    if (reset.Succeeded)
                    {
                        repairs.Add("reset password to the documented development password");
                    }
                    else
                    {
                        logger?.LogError(
                            "Bootstrap admin password could not be reset: {Reasons}",
                            string.Join("; ", reset.Errors.Select(e => e.Description)));
                    }
                }

                if (repairs.Count > 0)
                {
                    logger?.LogWarning(
                        "Bootstrap admin '{UserName}' was repaired ({Repairs}). Login: {UserName} / {Password}",
                        BootstrapAdminUserName, string.Join(", ", repairs), BootstrapAdminUserName, BootstrapAdminPassword);
                }
            }

            if (!await userManager.IsInRoleAsync(admin, "Admin"))
            {
                var roleResult = await userManager.AddToRoleAsync(admin, "Admin");
                if (!roleResult.Succeeded)
                {
                    logger?.LogError(
                        "Bootstrap admin could not be added to the Admin role: {Reasons}",
                        string.Join("; ", roleResult.Errors.Select(e => e.Description)));
                }
            }
        }
    }
}
