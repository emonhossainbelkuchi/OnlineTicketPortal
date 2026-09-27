using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace TicketPortal.Api.Tests.Infrastructure
{
    // Chunk 10 P0 task 1 — the plan's own recommendation: "a dedicated LocalDB database
    // recreated per test run", driven through the REAL app startup pipeline (Program.cs) so
    // migrations, DbSeeder (roles + bootstrap admin) and — because we run as Development —
    // DemoDataSeeder all execute exactly as they do for a real developer running `nx run
    // api:serve` for the first time. Tests then log in as one of the well-known demo accounts
    // (see DemoAccounts.cs) and talk to the API only over real HTTP, the same way the
    // Angular/React clients do — this project intentionally never new()s up a controller or
    // service and calls a method on it directly.
    //
    // One factory instance is shared across every integration test class (see
    // SharedApiCollection) so the (fairly heavy) full demo-data seed only happens once per
    // test run, not once per class. Tests that need to be independent of shared demo data
    // create their own rows (see FinanceLedgerServiceTests/SettlementGenerationServiceTests,
    // which create a throwaway BusOperator so they can assert exact numbers with zero risk of
    // seeded data changing the total).
    public class TicketPortalWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
    {
        // Unique per test-run (not per class) so re-running the suite, or running it alongside
        // a developer's own `TicketPortalDB`, never collides with another database.
        private readonly string _databaseName = $"TicketPortalTestDB_{Guid.NewGuid():N}";

        private string ConnectionString =>
            $@"Data Source=(localdb)\MSSQLLocalDB;Initial Catalog={_databaseName};Integrated Security=True;TrustServerCertificate=True";

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            // Development, not Testing/Production: this is what makes Program.cs (a) accept
            // the non-secret JWT signing key from appsettings.Development.json instead of
            // failing fast, and (b) run DemoDataSeeder after migrating. See Program.cs's own
            // comments on both gates before changing this.
            builder.UseEnvironment("Development");

            builder.UseSetting("ConnectionStrings:DefaultConnection", ConnectionString);

            // Chunk 10 security checklist: real deployments must never take a payment gateway
            // request seriously in a way that touches a live provider. Payments:DemoMode is
            // already true in the committed appsettings.json (Chunk 1), so no override is
            // needed here — this line just documents that the test suite is relying on it and
            // will start failing loudly (real HTTP calls to a gateway) if a future change ever
            // flips that default.
        }

        public async Task InitializeAsync()
        {
            // Building the host (via a throwaway client) is what actually runs Program.cs's
            // top-level statements — migrations + all seeding — against the fresh database
            // named above. Nothing about the request itself matters.
            using var warmupClient = CreateClient();
        }

        // Explicit interface implementation: WebApplicationFactory<T> already has its own
        // public `ValueTask DisposeAsync()` (from IAsyncDisposable) that tears the test host
        // down — a same-named `Task DisposeAsync()` can't also be a normal public member
        // (return type alone can't distinguish two members of the same name), so xUnit's
        // IAsyncLifetime.DisposeAsync is implemented explicitly instead and delegates to the
        // base class's version after doing its own cleanup.
        async Task IAsyncLifetime.DisposeAsync()
        {
            // LocalDB doesn't clean up after itself — drop the per-run database so repeated
            // local test runs don't quietly accumulate TicketPortalTestDB_* files forever.
            // Best-effort: a failure here should never fail the test run itself.
            try
            {
                await using var connection = new SqlConnection(
                    @"Data Source=(localdb)\MSSQLLocalDB;Initial Catalog=master;Integrated Security=True;TrustServerCertificate=True");
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText =
                    $"ALTER DATABASE [{_databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; " +
                    $"DROP DATABASE IF EXISTS [{_databaseName}];";
                await command.ExecuteNonQueryAsync();
            }
            catch
            {
                // Best-effort cleanup only — see comment above.
            }

            await base.DisposeAsync();
        }

        // Convenience for tests that need to reach into the database directly to ARRANGE data
        // (e.g. finding a specific seeded row to act on, or backdating a hold's expiry so a
        // sweep has something to find) or to call a service method directly where no HTTP
        // endpoint exists for it. This is deliberately NOT used to bypass an HTTP call the
        // test is supposed to be making — see each test class's own comments.
        public IServiceScope CreateScope() => Services.CreateScope();
    }
}
