# RBAC Migration Gap Report

Produced during the Chunk 10 pass, in response to RBAC Amendment v3's task 9 ("add static
review gates: no broad Staff/Operator authorization paths remain in business controllers").
Read this before assuming Chunk 2 is finished — as of chunks 1-9, **it is not**, though
Chunk 7's finance-permissions work made real progress (see "History" below).

## The finding

RBAC Amendment v3 called for deleting or replacing every business-controller path that
grants access simply because `User.IsInRole("Staff")` or `User.IsInRole("Operator")` is
true, in favor of the `Permissions` catalogue (`actor.HasPermission(Permissions.X)`) and
`CurrentActor.CanManageOperator(...)` for ownership scoping.

A plain source-text scan of every file in `apps/api/Controllers/` for that exact pattern,
run against the repo with chunks 1-9 applied, found:

- **42 controller files** still contain at least one `User.IsInRole("Staff")` or
  `User.IsInRole("Operator")` check.
- **37 of those** have **no** `Permissions`-catalogue check (`HasPermission(Permissions.`)
  anywhere in the file — i.e. fully unmigrated.
- **5** (`BookingsController.cs`, `OperatorSettlementsController.cs`, `PaymentsController.cs`,
  `TicketsController.cs`, `TripCrewsController.cs`) are **partially** migrated: some actions
  already use `HasPermission`, but at least one other action or read-scope branch in the same
  file still uses the old broad check.
- **21 controllers** now show real `Permissions`-catalogue usage, including several brand-new
  ones (`CommissionRulesController.cs`, `FinanceReconciliationController.cs`,
  `OperatorIntegrationsController.cs`, `PaymentMethodConfigurationsController.cs`,
  `PaymentProvidersController.cs`, `StaffCounterAssignmentsController.cs`,
  `TaxRulesController.cs`) that were built permission-aware from the start rather than
  migrated after the fact.

This is a mechanical count, not a manual security audit of each file — see the caveat in
`apps/api.tests/Architecture/NoBroadRoleChecksTests.cs`'s own header comment. A file being on
this list means it has the anti-pattern the amendment named; it does not mean every file has
been individually confirmed exploitable, and a file being OFF this list does not mean it has
been individually confirmed fully correct — only that it doesn't have this one pattern.

## History

| Pass | Fully unmigrated | Partially migrated | Migrated |
|---|---|---|---|
| After Chunk 4 | 45 | 2 (Bookings, Tickets) | 5 |
| After Chunk 9 (current) | 37 | 5 (+ OperatorSettlements, Payments, TripCrews) | 21 |

Chunk 7's finance-permissions work is the biggest single improvement: it fully migrated
`OperatorInvoicesController.cs`, `OperatorPaymentReceiptsController.cs`,
`OperatorPayoutsController.cs`, `OperatorSettlementItemsController.cs`, and
`OperatorWalletsController.cs`, and partially migrated `OperatorSettlementsController.cs`,
`PaymentsController.cs`, and `TripCrewsController.cs`. Zero files regressed (gained the
broad-check pattern) between these two passes.

## Why this matters for planning

The amendment's own target list for Chunk 2 named almost exactly these controllers:
"Buses, Trips, Schedules, FareRules, SalesCounters, Bookings, Tickets, StaffProfiles,
StaffAttendances, StaffSalaries, cancellation/refund controllers, commission/settlement/
invoice/payout/wallet controllers, operator integrations/mappings/logs, AdminController, and
audit/log controllers." Of that list, Buses, SalesCounters, StaffProfiles, Trips, and most of
the operator-finance controllers (invoices/payouts/wallets/settlement-items) are now done —
real progress since Chunk 4. **Schedules, FareRules, StaffAttendances, StaffSalaries,
AdminController, every audit/log controller, and the cancellation/refund controllers are
still on the unmigrated list below.** This is core Chunk 2 scope, not Chunk 10 polish —
whoever owns Chunk 2 needs to pick this back up.

## The current gap list (baseline as of chunks 1-9)

This exact list is also hardcoded in `apps/api.tests/Architecture/NoBroadRoleChecksTests.cs`
as `KnownGapFiles` — the two must be kept in sync (the test's own second `Fact`,
`KnownGapListStaysInSyncWithTheRepo`, checks that automatically). **Shrink this list as files
get migrated. Never grow it, and never add a file to make the test pass** — that defeats the
entire purpose of a review gate.

Fully unmigrated (37):

```
ActivityLogsController.cs           OperatorBranchesController.cs
AdminController.cs                  OperatorRouteStopsController.cs
AgentsController.cs                 OperatorStatementItemsController.cs
AuditLogsController.cs              OperatorStatementsController.cs
BusImagesController.cs              PaymentHistoriesController.cs
BusMaintenanceLogsController.cs     PaymentWebhookEventsController.cs
BusOperatorsController.cs           PlatformLedgersController.cs
CancellationPoliciesController.cs   RefundHistoriesController.cs
CancellationRequestsController.cs   RefundsController.cs
ComplaintsController.cs             ReviewsController.cs
CouponUsagesController.cs           SchedulesController.cs
CustomerAddressesController.cs      SeatHoldItemsController.cs
CustomerProfilesController.cs       SeatHoldsController.cs
CustomerWalletTransactionsController.cs   StaffAttendancesController.cs
DriverLicensesController.cs         StaffSalariesController.cs
EmergencyContactsController.cs      TripStatusHistoriesController.cs
FareRulesController.cs
IntegrationSyncLogsController.cs
IntegrationWebhookLogsController.cs
LoginHistoriesController.cs
NotificationLogsController.cs
```

Partially migrated (5) — some actions done, at least one is not:

```
BookingsController.cs
OperatorSettlementsController.cs
PaymentsController.cs
TicketsController.cs
TripCrewsController.cs
```

A note on `SeatHoldsController.cs`: its broad checks are in `GetAll`'s **read-scope**
branch (deciding whether a caller sees all holds, their own operator's, or none), not
gating the write actions — `Create` is intentionally open to any authenticated user
(customer checkout) and has no permission check by design, and `Release` has its own
`CanManageOperator`/ownership check. It's still on this list because a read-scope decision
made purely from `IsInRole` is exactly the pattern the amendment asked to eliminate — but the
severity here is lower than, say, a finance controller granting write access the same way.
This kind of per-file nuance is exactly why the list needs a human pass, not just a mechanical
count — this report did not have time to characterize the other 36 files individually.

## Recommended next step

Work through this list migrating each controller to `actor.HasPermission(Permissions.X)` +
`actor.CanManageOperator(operatorId)`, following the pattern already established in
`BusesController.cs`, `StaffProfilesController.cs`, and Chunk 7's finance controllers. As
each file is migrated:

1. Remove it from `KnownGapFiles` in `NoBroadRoleChecksTests.cs`.
2. Remove it from the list in this document (and update the History table above).
3. Add or extend `Permissions` enum entries and `PermissionMatrix` rows if the controller
   needs a permission that doesn't exist yet.
4. Add denied-case tests for it in `AuthorizationDeniedCaseTests.cs` (or a new file, if the
   controller has enough distinct cases to warrant one).

The gate test (`NoControllerOutsideTheKnownGapList_UsesABroadStaffOrOperatorRoleCheck`) will
keep failing loudly if a NEW broad check ever gets added anywhere else, which is the actual
long-term value here — it turns "please don't do this again" into something CI enforces.
