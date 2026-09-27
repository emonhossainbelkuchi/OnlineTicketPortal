using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Authorization
{
    public class CurrentActorService(AppDbContext db) : ICurrentActorService
    {
        // Same ClaimsPrincipal is used for every check within one request, so memoize the one
        // DB round-trip instead of re-resolving on every HasPermission-style call in an action.
        private CurrentActor? _cached;

        public async Task<CurrentActor> ResolveAsync(ClaimsPrincipal user)
        {
            if (_cached != null) return _cached;

            var claim = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(claim, out var userId))
                return _cached = new CurrentActor { UserId = Guid.Empty, Type = ActorType.Anonymous };

            if (user.IsInRole("Admin"))
                return _cached = new CurrentActor { UserId = userId, Type = ActorType.Admin };

            // "Operator" is being retired as a login role (RBAC Amendment v3) — no demo
            // account currently uses it, but the check stays here defensively so an
            // already-issued Operator-role token doesn't silently fall through to Customer.
            if (!user.IsInRole("Staff") && !user.IsInRole("Operator"))
                return _cached = new CurrentActor { UserId = userId, Type = ActorType.Customer };

            var profile = await db.StaffProfiles
                .Where(sp => sp.UserId == userId)
                .Select(sp => new { sp.Id, sp.Role, sp.BusOperatorId, sp.IsActive })
                .FirstOrDefaultAsync();

            // No StaffProfile at all, or a deactivated one: a Staff login token alone proves
            // nothing about what this account is allowed to do (RBAC Amendment v3, "a
            // profileless Staff account is effectively unscoped" gap). Deny every permission
            // check rather than defaulting to platform-wide access.
            if (profile is null || !profile.IsActive)
                return _cached = new CurrentActor { UserId = userId, Type = ActorType.UnprovisionedStaff };

            var isPlatformScope = profile.BusOperatorId == null;
            var permissions = PermissionMatrix.Resolve(profile.Role, isPlatformScope);

            var assignedCounterIds = profile.Role == StaffRole.CounterStaff
                ? await db.StaffSalesCounterAssignments
                    .Where(a => a.StaffProfileId == profile.Id && a.IsActive)
                    .Select(a => a.SalesCounterId)
                    .ToListAsync()
                : new List<Guid>();

            return _cached = new CurrentActor
            {
                UserId = userId,
                Type = ActorType.Staff,
                StaffProfileId = profile.Id,
                JobRole = profile.Role,
                BusOperatorId = profile.BusOperatorId,
                AssignedCounterIds = assignedCounterIds,
                Permissions = permissions,
            };
        }
    }
}
