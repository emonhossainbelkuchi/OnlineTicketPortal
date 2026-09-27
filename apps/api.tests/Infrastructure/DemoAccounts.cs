namespace TicketPortal.Api.Tests.Infrastructure
{
    // Every value here is copied from DemoDataSeeder.cs (Development-only, non-secret, and
    // already documented for humans in SETUP_AND_DEMO_GUIDE.md's account table) — nothing new
    // is introduced. Centralized here so a future rename in the seeder only needs updating in
    // one place, not in every test file.
    public static class DemoAccounts
    {
        public const string Password = "Demo@12345";

        public const string BootstrapAdminUserName = "admin";
        public const string BootstrapAdminPassword = "Admin@12345";

        // Platform staff (BusOperatorId == null).
        public const string PlatformFinance = "nusrat.finance";   // StaffRole.Finance
        public const string PlatformManager = "tanvir.ops";       // StaffRole.Manager
        public const string PlatformSupport = "rezaul.support";   // StaffRole.Support

        // Green Line staff.
        public const string GreenLineManager = "abdul.karim.gl";     // StaffRole.Manager (FleetManage etc.)
        public const string GreenLineCounterStaff = "selina.counter.gl"; // StaffRole.CounterStaff — no FleetManage, no TicketCheckIn

        // Shohagh staff.
        public const string ShohaghSupervisor = "delwar.supervisor.sho"; // StaffRole.Supervisor — has Ticket.CheckIn
        public const string ShohaghCounterStaff = "rina.counter.sho";    // StaffRole.CounterStaff

        // A customer — ActorType.Customer, zero staff permissions.
        public const string Customer = "rahim.uddin";
    }
}
