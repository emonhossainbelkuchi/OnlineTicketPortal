# Admin Dashboard & Reports — Data Map

Completion Plan v2, Chunk 9 ("Admin: server-side dashboard & reports"). This is the
card/column -> query map the code comments point back to. If a number on the dashboard or
reports page looks wrong, this is where to check the formula before assuming the UI is buggy.

## Endpoints

Both are Admin-only (`AdminDashboardController.cs`, `User.IsInRole("Admin")` — same check
`AdminController.cs` itself uses). Neither accepts a Staff/Operator token; the console and
AnalyticsPage both surface the resulting 403 as a normal error state.

- `GET /api/admin/dashboard/summary?from=&to=&operatorId=` — chart/KPI-shaped, backs
  `console/pages/admin/Dashboard.tsx`.
- `GET /api/admin/dashboard/reports?from=&to=&operatorId=` — flat report rows, backs
  `pages/AnalyticsPage.tsx` and its CSV export.

`from`/`to` are `DateOnly` (`yyyy-MM-dd`), inclusive of the whole day on both ends. Omit both
for the default trailing-30-days window; omit `operatorId` for "all operators". An `operatorId`
that doesn't match a real `BusOperator` returns 400, not an empty result.

## Where every figure comes from

Money and commission figures are `PlatformLedger` rows, filtered to
`CreatedAtUtc in [fromUtc, toExclusiveUtc)` and (when given) `BusOperatorId == operatorId` —
the exact same range/scope predicate `SettlementGenerationService.GenerateSettlementAsync` uses
to build a real settlement, so a dashboard number for a period always agrees with a hand-checked
settlement for that same period.

| Field | Source |
|---|---|
| `OperatorsByInventoryMode` | `BusOperators`, grouped by `InventoryMode`. Not date-ranged — a platform-shape count, not an activity count. |
| `BookingsByChannelAndStatus` | `Bookings` in range, grouped by `(SaleChannel, Status)`. |
| `OnlineGrossAmount` / `OnlineBookingCount` | `PlatformLedger` rows with `ItemType == OnlineTicketSale`: `Sum(CreditAmount)` / distinct `BookingId` count. Same source as `OperatorSettlement.OnlineGrossAmount`. |
| `OnlineCommissionEarned` | `PlatformLedger` rows with `ItemType == PlatformCommission`: `Sum(DebitAmount)`. |
| `CounterCommissionEarned` | `PlatformLedger` rows with `ItemType == CounterSaleCommission`: `Sum(DebitAmount)`. |
| `CounterTicketCount` | `Tickets` whose `Booking.SaleChannel == Counter`, excluding `Cancelled`/`Refunded` tickets. A real ticket count, not a ledger figure — concept §6.2: counter cash never touches the platform, so there's no ledger "gross" for it. |
| `OnlineRefundAmount` | `PlatformLedger` rows with `ItemType == Refund && SaleChannel == Online`: `Sum(DebitAmount)` — money the platform actually paid back. |
| `CounterCommissionReversedAmount` | `PlatformLedger` rows with `ItemType == Refund && SaleChannel == Counter`: `Sum(CreditAmount)` — the commission reversal `FinanceLedgerService.PostCounterSaleRefundAsync` posts (the platform never held the fare, so there's nothing to "refund"). |
| `RefundCount` | Distinct `RefundId` across `Refund`-type ledger rows in range. |
| `SettlementsByStatus` / `PayoutsByStatus` | `OperatorSettlements` / `OperatorPayouts` in range, grouped by `(Status, Direction)` / `Status`. |
| `PendingCancellationRequests` | `CancellationRequests` with `Status == Requested`. **Current state, not date-ranged.** |
| `PendingRefunds` | `Refunds` with `Status` in `{Requested, Approved, Processing, PendingManualPayout, ReconciliationNeeded}`. **Current state.** |
| `OpenComplaints` | `Complaints` with `Status` in `{Open, InProgress}`. **Current state.** |
| `ActiveSeatHolds` | `SeatHolds` with `Status == Active && HoldExpiresAtUtc > now`. **Current state.** |
| `IntegrationFailuresLast24h` | `IntegrationSyncLogs` with `Status == Failed && StartedAtUtc >= now-24h`. **Fixed rolling window, ignores the from/to filter on purpose** — the chunk's own task wording calls for "last 24h", not "in the selected period". |
| `PaymentsNeedingReconciliation` | Distinct `PaymentId` across `PaymentHistories` with `Status == ReconciliationNeeded`. A payment is flagged once and never un-flagged in this schema (see `PaymentConfirmationService.FlagStuckPaymentsAsync`), so this is a running total, not date-ranged. |
| `BookingsAwaitingExternalConfirmation` | `Bookings` with `RequiresExternalConfirmation && ExternalConfirmedAtUtc == null`, excluding `Cancelled`/`Failed`/`Expired`. **Current state.** |
| `DailySeries` | `PlatformLedger` (`OnlineTicketSale`) + `Tickets` (counter, non-cancelled) pulled once as narrow projections, bucketed by calendar day in memory (not a SQL date-truncation) — see the "why" comment on `AdminDashboardController.BuildDailySeriesAsync`. Capped at 366 days even if `from`/`to` span wider. |

`/reports`'s `SalesByOperator` and `OnlineVsCounter` are the same ledger buckets above, grouped
by `BusOperatorId` instead of (or in addition to) globally. `Settlements` is a flat, unaggregated
read of `OperatorSettlements` in range, newest first.

## Frontend

- `console/pages/admin/Dashboard.tsx` — one call to `/summary` per filter change (date range +
  operator select, both client-validated before the request goes out). KPI cards split into
  "Financial" (date-ranged) and "Operational alerts" (current-state, styled amber when > 0) to
  match the DTO's own split above. Loading skeleton, inline error with retry, and a distinct
  "no activity in this period" empty state (as opposed to a load failure).
- `pages/AnalyticsPage.tsx` — one call to `/reports` per filter change. Same date/operator
  filters as the console dashboard, independently applied (the two pages don't share filter
  state). "Export CSV" on both the sales-by-operator and settlements tables builds the file
  client-side from the already-fetched JSON (no separate CSV endpoint) via a small
  `downloadCsv()` helper local to the page.
- Both pages default to the trailing 30 days, matching `AdminDashboardController.ResolveRange`'s
  own default so the UI's initial view matches what a bare `GET .../summary` (no query params)
  would return.

## Chunk 9 task 6 — Admin-only confirmation

`AdminDashboardController` rejects non-Admin tokens with 403 on every action (see the class
comment for why this is a flat `IsInRole("Admin")` check rather than a `Permissions.*` entry).
The console's own `ProtectedRoute` for `/admin/*` still allows Staff/Operator through at the
route level (unchanged, out of scope for this chunk) — a Staff user can open the console, but
the dashboard's own `/summary` call then 403s and the page shows that as a normal error state,
never a silent blank screen. This is deliberate: gate the data at the API, not the route, so the
error is honest about *why* nothing loaded. Every other admin-surface controller's own
Admin/Staff scoping was addressed by Chunk 2 (RBAC v3), not by this chunk.
