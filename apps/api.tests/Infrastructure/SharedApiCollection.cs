using Xunit;

namespace TicketPortal.Api.Tests.Infrastructure
{
    // One TicketPortalWebApplicationFactory (one LocalDB database, one migration + full
    // DemoDataSeeder run) shared by every [Collection(Name)] test class below, instead of
    // paying that startup cost per class. xUnit collections also run sequentially with
    // respect to each other's classes by default within the same collection, which is exactly
    // what we want here: several of these tests mutate shared demo data (e.g. checking a
    // ticket in), so they must not run concurrently against it.
    //
    // FinanceLedgerServiceTests and SettlementGenerationServiceTests still create their own
    // throwaway BusOperator/OperatorWallet rather than relying on this ordering for
    // correctness — see their own comments — so this collection is a performance choice for
    // them, not a correctness dependency.
    [CollectionDefinition(Name)]
    public class SharedApiCollection : ICollectionFixture<TicketPortalWebApplicationFactory>
    {
        public const string Name = "TicketPortal API collection";
    }
}
