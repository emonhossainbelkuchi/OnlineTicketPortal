using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using Xunit;

namespace TicketPortal.Api.Tests.Architecture
{
    // RBAC Amendment v3 / Chunk 10 task 9 ("static review gates"): "no broad Staff/Operator
    // authorization paths remain in business controllers". This is a pure source-text scan —
    // no DB, no host, no compiled-code reflection — so it runs in milliseconds and can never
    // be broken by an unrelated infrastructure problem (LocalDB not installed, etc).
    //
    // IMPORTANT — what this test actually proves and doesn't:
    //   It proves no controller OUTSIDE the KnownGapFiles baseline below contains a bare
    //   `User.IsInRole("Staff")` / `User.IsInRole("Operator")` check. It does NOT prove every
    //   file in the baseline is currently exploitable, and it does NOT prove every file
    //   outside the baseline is fully and correctly migrated to the Permissions catalogue —
    //   only that it isn't using this ONE specific anti-pattern. Full authorization
    //   correctness still needs the human review this amendment also calls for.
    //
    // As of the current codebase (chunks 1-9 applied — this file is kept in sync as work
    // lands; see docs/RBAC_MIGRATION_GAP_REPORT.md for the full writeup and history), 42
    // controller files still contain the broad check; 37 of those have NO permission-catalogue
    // check anywhere in the file (fully unmigrated); 5 (Bookings, OperatorSettlements,
    // Payments, Tickets, TripCrews) are partially migrated — some actions already use
    // HasPermission, at least one other spot in the same file still doesn't. This baseline is
    // the ratchet: shrink it as files get migrated, NEVER grow it, and never add a file to it
    // to make this test pass — that defeats the entire point of a review gate.
    public class NoBroadRoleChecksTests
    {
        private static readonly Regex BroadRoleCheckPattern =
            new(@"IsInRole\(\s*""(Staff|Operator)""\s*\)", RegexOptions.Compiled);

        // Keep this list alphabetical so a diff against docs/RBAC_MIGRATION_GAP_REPORT.md's
        // own list is trivial to eyeball.
        private static readonly HashSet<string> KnownGapFiles = new(StringComparer.OrdinalIgnoreCase)
        {
            "ActivityLogsController.cs", "AdminController.cs", "AgentsController.cs",
            "AuditLogsController.cs", "BookingsController.cs", "BusImagesController.cs",
            "BusMaintenanceLogsController.cs", "BusOperatorsController.cs",
            "CancellationPoliciesController.cs", "CancellationRequestsController.cs",
            "ComplaintsController.cs", "CouponUsagesController.cs", "CustomerAddressesController.cs",
            "CustomerProfilesController.cs", "CustomerWalletTransactionsController.cs",
            "DriverLicensesController.cs", "EmergencyContactsController.cs", "FareRulesController.cs",
            "IntegrationSyncLogsController.cs", "IntegrationWebhookLogsController.cs",
            "LoginHistoriesController.cs", "NotificationLogsController.cs",
            "OperatorBranchesController.cs", "OperatorRouteStopsController.cs",
            "OperatorSettlementsController.cs", "OperatorStatementItemsController.cs",
            "OperatorStatementsController.cs",
            "PaymentHistoriesController.cs", "PaymentWebhookEventsController.cs",
            "PaymentsController.cs", "PlatformLedgersController.cs", "RefundHistoriesController.cs",
            "RefundsController.cs", "ReviewsController.cs", "SchedulesController.cs",
            "SeatHoldItemsController.cs", "SeatHoldsController.cs", "StaffAttendancesController.cs",
            "StaffSalariesController.cs", "TicketsController.cs", "TripCrewsController.cs",
            "TripStatusHistoriesController.cs",
        };

        private static string GetControllersDirectory([CallerFilePath] string thisFilePath = "")
        {
            // This file lives at apps/api.tests/Architecture/NoBroadRoleChecksTests.cs — walk
            // up to the repo's apps/ folder and back down into api/Controllers, using the
            // compiler-supplied path to this very file rather than any assumption about the
            // test runner's working directory or output folder.
            var architectureDir = Path.GetDirectoryName(thisFilePath)!;
            var apiTestsDir = Directory.GetParent(architectureDir)!.FullName;
            var appsDir = Directory.GetParent(apiTestsDir)!.FullName;
            return Path.Combine(appsDir, "api", "Controllers");
        }

        [Fact]
        public void NoControllerOutsideTheKnownGapList_UsesABroadStaffOrOperatorRoleCheck()
        {
            var controllersDir = GetControllersDirectory();
            Assert.True(Directory.Exists(controllersDir),
                $"Could not find the Controllers directory at '{controllersDir}' — has the " +
                "project layout changed? Update GetControllersDirectory if apps/api/Controllers moved.");

            var offendingFiles = new List<string>();

            foreach (var filePath in Directory.EnumerateFiles(controllersDir, "*.cs", SearchOption.TopDirectoryOnly))
            {
                var fileName = Path.GetFileName(filePath);
                if (KnownGapFiles.Contains(fileName))
                {
                    continue; // Tracked, pre-existing debt — see docs/RBAC_MIGRATION_GAP_REPORT.md.
                }

                var content = File.ReadAllText(filePath);
                if (BroadRoleCheckPattern.IsMatch(content))
                {
                    offendingFiles.Add(fileName);
                }
            }

            Assert.True(offendingFiles.Count == 0,
                "New broad User.IsInRole(\"Staff\")/IsInRole(\"Operator\") check(s) found outside " +
                "the tracked gap list — RBAC Amendment v3 requires every business controller to " +
                "authorize via the Permissions catalogue (actor.HasPermission(...)) instead. " +
                $"Offending file(s): {string.Join(", ", offendingFiles)}. If this file is a NEW, " +
                "deliberate addition to the known gap list (it should not be — fix the check " +
                "instead), that decision belongs in docs/RBAC_MIGRATION_GAP_REPORT.md with a " +
                "reason, not a silent edit to this test.");
        }

        // Informational ratchet check, not a hard failure: confirms the gap list here still
        // matches reality. If this fails because the count went DOWN, that's good news —
        // shrink KnownGapFiles (and update docs/RBAC_MIGRATION_GAP_REPORT.md) to match. If it
        // fails because a file that WAS clean now has a broad check again, that's a real
        // regression the test above should also have caught.
        [Fact]
        public void KnownGapListStaysInSyncWithTheRepo()
        {
            var controllersDir = GetControllersDirectory();
            var actualGapFiles = Directory.EnumerateFiles(controllersDir, "*.cs", SearchOption.TopDirectoryOnly)
                .Where(f => BroadRoleCheckPattern.IsMatch(File.ReadAllText(f)))
                .Select(Path.GetFileName)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var fixedSinceBaseline = KnownGapFiles.Except(actualGapFiles!).ToList();
            var newSinceBaseline = actualGapFiles.Except(KnownGapFiles!).ToList();

            Assert.True(fixedSinceBaseline.Count == 0 && newSinceBaseline.Count == 0,
                "docs/RBAC_MIGRATION_GAP_REPORT.md's list is out of date. " +
                (fixedSinceBaseline.Count > 0
                    ? $"Migrated since baseline (remove from KnownGapFiles + the doc): {string.Join(", ", fixedSinceBaseline)}. "
                    : "") +
                (newSinceBaseline.Count > 0
                    ? $"New/regressed (the test above should also be failing): {string.Join(", ", newSinceBaseline)}."
                    : ""));
        }
    }
}
