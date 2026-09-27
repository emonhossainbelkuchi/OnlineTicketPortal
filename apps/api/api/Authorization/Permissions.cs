namespace TicketPortal.Api.Authorization
{
    // RBAC Amendment v3, Chunk 2 P0 task 1: the fixed, named permission catalogue every
    // endpoint checks against. Nothing in this codebase should authorize on a controller
    // name, a StaffProfile.Role string, or a bare User.IsInRole("Staff")/"Operator" check —
    // those only prove the caller is SOME kind of employee, not that they're allowed to do
    // THIS specific thing. See PermissionMatrix.cs for which StaffRole gets which of these,
    // and CurrentActorService for how a request's actor + permission set is resolved.
    //
    // Deliberately a flat list of constants (not an enum) so a permission can be logged,
    // compared, and stored (e.g. in AuditLog) as a plain, self-describing string.
    public static class Permissions
    {
        // --- Fleet (BusesController, BusImagesController, BusMaintenanceLogsController) ---
        public const string FleetRead = "Fleet.Read";
        public const string FleetManage = "Fleet.Manage";

        // --- Network (routes/terminals/branches) & fares ---
        public const string NetworkRead = "Network.Read";
        public const string NetworkManage = "Network.Manage";
        public const string FarePolicyManage = "FarePolicy.Manage";

        // --- Trips & scheduling ---
        public const string TripsRead = "Trips.Read";
        public const string TripsManage = "Trips.Manage";
        public const string TripsCancel = "Trips.Cancel";
        public const string CrewManage = "Crew.Manage";

        // --- Counter desk ---
        public const string CounterRead = "Counter.Read";
        public const string CounterConfigure = "Counter.Configure";
        public const string CounterSell = "Counter.Sell";
        public const string CounterCancel = "Counter.Cancel";
        public const string TicketCheckIn = "Ticket.CheckIn";
        public const string ManifestRead = "Manifest.Read";

        // --- HR / staff records ---
        public const string StaffRead = "Staff.Read";
        public const string StaffManage = "Staff.Manage";

        // --- Bookings & customer-facing cancellations ---
        public const string BookingRead = "Booking.Read";
        public const string BookingManage = "Booking.Manage";
        public const string CancellationApprove = "Cancellation.Approve";

        // --- Complaints ---
        public const string ComplaintsRead = "Complaints.Read";
        public const string ComplaintsManage = "Complaints.Manage";

        // --- Finance ---
        public const string FinanceReadPlatform = "Finance.ReadPlatform";
        public const string FinanceReadOwnOperator = "Finance.ReadOwnOperator";
        public const string FinanceReconcile = "Finance.Reconcile";
        public const string SettlementApprove = "Settlement.Approve";
        public const string PayoutProcess = "Payout.Process";
        public const string FinanceConfigure = "Finance.Configure";

        // --- API-connected operator integrations ---
        public const string IntegrationsRead = "Integrations.Read";
        public const string IntegrationsManage = "Integrations.Manage";

        // --- Platform-wide administration ---
        public const string PlatformUsersManage = "PlatformUsers.Manage";
        public const string PlatformConfigurationManage = "PlatformConfiguration.Manage";
        public const string AuditRead = "Audit.Read";
        public const string ReportsRead = "Reports.Read";

        // Every constant above, for validation/tests (e.g. AssignRole-style "is this a real
        // permission name" checks, and AUTH_TEST_CASES.md generation).
        public static readonly IReadOnlyCollection<string> All = new[]
        {
            FleetRead, FleetManage,
            NetworkRead, NetworkManage, FarePolicyManage,
            TripsRead, TripsManage, TripsCancel, CrewManage,
            CounterRead, CounterConfigure, CounterSell, CounterCancel, TicketCheckIn, ManifestRead,
            StaffRead, StaffManage,
            BookingRead, BookingManage, CancellationApprove,
            ComplaintsRead, ComplaintsManage,
            FinanceReadPlatform, FinanceReadOwnOperator, FinanceReconcile, SettlementApprove, PayoutProcess, FinanceConfigure,
            IntegrationsRead, IntegrationsManage,
            PlatformUsersManage, PlatformConfigurationManage, AuditRead, ReportsRead,
        };
    }
}
