using TicketPortal.Api.Models.Enums;

namespace TicketPortal.Api.Authorization
{
    public enum ActorType
    {
        Anonymous = 0,
        Admin = 1,        // Identity role "Admin" — platform super-user, always full access.
        Staff = 2,        // Identity role "Staff" WITH an active StaffProfile.
        UnprovisionedStaff = 3, // Identity role "Staff" but no active StaffProfile — denied
                                // everywhere a permission is required. See RBAC Amendment v3,
                                // "a profileless Staff account is effectively unscoped" gap.
        Customer = 4,
    }

    // Resolved fresh, from the database, on every request that needs it (see
    // CurrentActorService). Nothing here is ever read out of the JWT's claims — a role
    // change, a deactivated StaffProfile, or a revoked counter assignment must take effect
    // on the very next request, not whenever the caller's token happens to expire.
    public sealed class CurrentActor
    {
        public required Guid UserId { get; init; }
        public required ActorType Type { get; init; }

        // Only meaningful when Type == Staff.
        public Guid? StaffProfileId { get; init; }
        public StaffRole? JobRole { get; init; }

        // Null = platform staff (all-operator scope). Set = scoped to exactly this operator.
        // Meaningless (always null) for Admin/Customer/UnprovisionedStaff.
        public Guid? BusOperatorId { get; init; }

        // Every SalesCounter this actor currently has an active assignment to. Only
        // meaningful for CounterStaff — an Operator Manager/BusOwner is allowed to use ANY
        // counter belonging to their own operator regardless of this set (see
        // CanUseCounterAsync below).
        public IReadOnlyCollection<Guid> AssignedCounterIds { get; init; } = Array.Empty<Guid>();

        // The resolved permission set for this actor (Admin implicitly has every permission —
        // see CurrentActorService — so this collection is empty for Admin and callers should
        // use IsAdmin instead of checking Permissions.Count for that case).
        public IReadOnlyCollection<string> Permissions { get; init; } = Array.Empty<string>();

        public bool IsAdmin => Type == ActorType.Admin;

        public bool HasPermission(string permission) => IsAdmin || Permissions.Contains(permission);

        // Capability check ("may this actor perform this action AT ALL") — the first half of
        // every protected operation per RBAC Amendment v3. The second half (scope) is
        // CanManageOperator / CanUseCounter below.
        public bool HasAnyPermission(params string[] permissions) => IsAdmin || permissions.Any(Permissions.Contains);

        // Scope check: may this actor act on data belonging to targetOperatorId?
        // Admin: always. Platform staff (BusOperatorId == null): always — same as Admin.
        // Operator-scoped staff: only their own operator.
        public bool CanManageOperator(Guid targetOperatorId) =>
            IsAdmin || Type == ActorType.Staff && (BusOperatorId == null || BusOperatorId == targetOperatorId);

        // Scope check for a specific SalesCounter. Only CounterStaff is restricted to
        // specifically-assigned counters (RBAC Amendment v3 task 4); an Operator
        // Manager/BusOwner/platform staff who can already manage the counter's operator can
        // use any of that operator's counters.
        public bool CanUseCounter(Guid counterId, Guid counterOperatorId)
        {
            if (!CanManageOperator(counterOperatorId)) return false;
            if (JobRole != StaffRole.CounterStaff) return true;
            return AssignedCounterIds.Contains(counterId);
        }
    }
}
