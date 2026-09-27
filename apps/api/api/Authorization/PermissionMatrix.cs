using TicketPortal.Api.Models.Enums;

namespace TicketPortal.Api.Authorization
{
    // The table from RBAC Amendment v3 ("Adopt the role-to-permission matrix"), translated
    // from prose into the fixed Permissions catalogue. Identity Admin is NOT in this table —
    // it's handled separately in CurrentActorService (implicit, all-permission, all-scope).
    //
    // Every row below cites the matrix row it implements. Where the matrix's prose named an
    // activity this project's fixed permission catalogue has no exact constant for (e.g.
    // "operator onboarding" — there is no BusOperators.* permission in the P0 catalogue),
    // that activity is deliberately left ungranted here rather than guessed at, and is called
    // out in AUTHORIZATION_DECISIONS.md as a gap for whoever next touches BusOperatorsController.
    //
    // StaffRole.Admin and StaffRole.SuperAdmin are NOT in this table on purpose — RBAC
    // Amendment v3 says those two values "must never imply the Identity Admin role" and are
    // being retired from new staff data (see StaffProfilesController/AdminController
    // validation). A StaffProfile carrying either value resolves to an empty permission set
    // (== can do nothing beyond being logged in) until someone deliberately migrates it.
    public static class PermissionMatrix
    {
        // Platform staff: StaffProfile.BusOperatorId == null.
        private static readonly IReadOnlyDictionary<StaffRole, string[]> PlatformScope = new Dictionary<StaffRole, string[]>
        {
            // "Platform Manager" row: operator onboarding/read, fleet/network/trip oversight,
            // cancellation approval, complaints, reports. Forbidden: user-role assignment,
            // JWT/settings, commission/tax/payment-provider config, payout processing.
            [StaffRole.Manager] = new[]
            {
                Permissions.FleetRead, Permissions.NetworkRead,
                Permissions.TripsRead, Permissions.TripsManage, Permissions.TripsCancel, Permissions.CrewManage,
                Permissions.CancellationApprove,
                Permissions.ComplaintsRead, Permissions.ComplaintsManage,
                Permissions.ReportsRead, Permissions.BookingRead, Permissions.StaffRead,
            },

            // "Platform Finance" row: finance read, reconciliation, settlement approval,
            // invoice/receipt and payout processing (this deployment's team decision — see
            // AUTHORIZATION_DECISIONS.md — is to grant payout processing to Platform Finance).
            // Forbidden: fleet/trip/counter/HR configuration, user-role management, finance
            // CONFIGURATION (commission/tax/provider rules stay Admin-only).
            [StaffRole.Finance] = new[]
            {
                Permissions.FinanceReadPlatform, Permissions.FinanceReconcile,
                Permissions.SettlementApprove, Permissions.PayoutProcess,
            },

            // "Platform Support" row: customer/booking lookup, complaints, support-side
            // cancellation workflow. StaffRole.Support is new (see Models/Enums/ModelEnums.cs)
            // — the demo data previously mislabeled this persona as StaffRole.Manager, which
            // is exactly the kind of over-broad job-role assignment this amendment exists to
            // stop (see DemoDataSeeder's rezaul.support fix).
            [StaffRole.Support] = new[]
            {
                Permissions.BookingRead, Permissions.ComplaintsRead, Permissions.ComplaintsManage,
            },
        };

        // Operator-scoped staff: StaffProfile.BusOperatorId == <that operator's Id>.
        private static readonly IReadOnlyDictionary<StaffRole, string[]> OperatorScope = new Dictionary<StaffRole, string[]>
        {
            // "Operator Manager or Operator back-office" row. StaffRole.Operator is the
            // enum's existing "operator's own management/back-office staff" value;
            // StaffRole.BusOwner is treated the same way (not called out separately by the
            // matrix — documented deviation, see AUTHORIZATION_DECISIONS.md).
            [StaffRole.Manager] = OperatorManagerPermissions,
            [StaffRole.Operator] = OperatorManagerPermissions,
            [StaffRole.BusOwner] = OperatorManagerPermissions,

            // "CounterStaff" row: counter dashboard, walk-in sale, PNR lookup to serve a sale,
            // receipt, approved counter cancellation flow. Forbidden: fleet/network/fare/trip/
            // counter CONFIGURATION, staff records, settlements, commission rules, unrelated
            // counters (assigned-counter scoping is enforced separately — see
            // CurrentActor.CanUseCounter — not by this permission set).
            [StaffRole.CounterStaff] = new[]
            {
                Permissions.CounterRead, Permissions.CounterSell, Permissions.CounterCancel,
                Permissions.BookingRead,
            },

            // "Supervisor" row: trip manifest, ticket check-in, crew/trip operational status.
            // Forbidden: sales/counter configuration, fleet/network/fare, staff/finance/settings.
            [StaffRole.Supervisor] = new[]
            {
                Permissions.ManifestRead, Permissions.TicketCheckIn, Permissions.TripsRead,
            },

            // "Operator Finance" row: read-only earnings, own statements/invoices/payouts/
            // settlements. Forbidden: changing commissions, approving/processing payouts,
            // other operators.
            [StaffRole.Finance] = new[]
            {
                Permissions.FinanceReadOwnOperator,
            },

            // "Driver or Helper" row: minimal assigned-trip manifest only, IF the product
            // needs crew login. No crew-login screens exist in this codebase yet (Concept §—
            // TripCrew is HR/assignment data only), so this deliberately grants nothing rather
            // than guessing at a permission for a feature that doesn't exist. Revisit once
            // crew login is a real requirement.
            [StaffRole.Driver] = Array.Empty<string>(),
            [StaffRole.Helper] = Array.Empty<string>(),
        };

        private static readonly string[] OperatorManagerPermissions =
        {
            Permissions.FleetRead, Permissions.FleetManage,
            Permissions.NetworkRead, Permissions.NetworkManage, Permissions.FarePolicyManage,
            Permissions.TripsRead, Permissions.TripsManage, Permissions.TripsCancel, Permissions.CrewManage,
            Permissions.CounterRead, Permissions.CounterConfigure, Permissions.CounterSell, Permissions.CounterCancel,
            Permissions.StaffRead, Permissions.StaffManage,
            Permissions.BookingRead, Permissions.ReportsRead,
            Permissions.FinanceReadOwnOperator,
            // RBAC Amendment v3 §8 (Chunk 8): "An operator manager may receive a redacted
            // status/read view for their own integration if useful, but never endpoint
            // secrets, test-connection controls, or mapping administration." IntegrationsRead
            // is scoped by CanManageOperator on the one endpoint that checks it
            // (OperatorIntegrationsController.GetStatus) — it does NOT unlock the full
            // OperatorIntegrationResponseDto/IntegrationSyncLogsController/mapping controllers,
            // which all still require IntegrationsManage (Admin-only).
            Permissions.IntegrationsRead,
        };

        public static IReadOnlyCollection<string> Resolve(StaffRole jobRole, bool isPlatformScope)
        {
            var table = isPlatformScope ? PlatformScope : OperatorScope;
            return table.TryGetValue(jobRole, out var perms) ? perms : Array.Empty<string>();
        }

        // "Only Platform Admin can assign Identity roles... An operator manager may... create/
        // deactivate only lower-ranked employees of their own operator... must not promote a
        // peer [or] assign Identity Admin" (RBAC Amendment v3, task 5). There is no explicit
        // rank field on StaffProfile, so this fixed set is the concrete, documented stand-in
        // for "lower-ranked": an Operator Manager/BusOwner may create or edit staff whose JOB
        // ROLE is one of these; anything else (Manager, Operator, BusOwner, Admin, SuperAdmin)
        // requires Platform Admin.
        public static readonly IReadOnlyCollection<StaffRole> OperatorManagerAssignableJobRoles = new[]
        {
            StaffRole.CounterStaff, StaffRole.Supervisor, StaffRole.Driver, StaffRole.Helper, StaffRole.Finance,
        };

        // StaffRole values a StaffProfile must never be created/updated with (RBAC Amendment
        // v3: "Remove those two values from staff creation/edit UI and reject them for new
        // data until a deliberate migration/rename is completed").
        public static readonly IReadOnlyCollection<StaffRole> RetiredJobRoles = new[]
        {
            StaffRole.SuperAdmin, StaffRole.Admin,
        };
    }
}
