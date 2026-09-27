# Final Test Matrix — Chunk 10

Status of the "first tests" list from the Chunk 10 plan, plus the RBAC Amendment v3
denied-case matrix, as of this pass. See `apps/api.tests/README.md` for how to run any of
this.

**Disclosure, up front:** every file in `apps/api.tests/` was written against the real
source in this repo (models, services, controllers, DTOs, the permission matrix, and the
actual seeded demo accounts) but **has never been compiled or run** — the environment this
pass was done in had no .NET SDK and no access to nuget.org. Treat this as a carefully
hand-verified first draft that needs a normal build-and-fix pass, not as a green test run.
This version was verified (source-read, not compiled) against the repo with chunks 1-9
applied — see `docs/KNOWN_LIMITATIONS.md` for what changed since the first draft (written
against chunks 1-4) and what got adjusted as a result.

## Covered

| # | Item (Chunk 10 plan) | Test file | How |
|---|---|---|---|
| 1 | Hold race | `Integration/SeatHoldConcurrencyTests.cs` | Two concurrent `POST /api/seatholds` for the same seat; asserts exactly one 201 + one 409, and exactly one Active `SeatHold` row on that seat afterward. Deliberately picks a `PlatformManaged`-operator seat to stay clear of Chunk 8's ERP availability check (see that file's comments). |
| 2 | Hold expiry | `Integration/SeatHoldExpiryTests.cs` | Creates a real hold over HTTP, backdates `HoldExpiresAtUtc` directly (only way to simulate elapsed time without a slow real-time wait), calls `SeatHoldService.ExpireOverdueHoldsAsync()` directly (the same method the background sweep calls), asserts the seat frees up and is immediately holdable again. Also asserts a hold that ISN'T yet due is left untouched. |
| 3 | Trip-state gating | `Unit/TripSellabilityTests.cs` (pure logic, every status + the configurable stop-sales window) and `Integration/SeatHoldConcurrencyTests.cs` (end-to-end: a cancelled trip's seat can't be held over real HTTP, and nothing changes on the refused attempt). |
| 4 | Payment confirm idempotency | **Not automated — see Gaps below.** |
| 5 | Ledger formulas (online, counter, refunds) | `Integration/FinanceLedgerServiceTests.cs` | Calls `FinanceLedgerService` directly against a throwaway operator (see file header for why direct-call is the right choice here); hand-checks the online-sale split (gross → commission + gateway charge → operator remainder, both gateway-fee-bearer directions), counter-sale commission, both refund paths, and the channel-mismatch guard. |
| 6 | Settlement hand-check | `Integration/SettlementGenerationServiceTests.cs` | Posts a hand-calculated set of ledger rows to a throwaway operator, calls `GenerateSettlementAsync`, and asserts every settlement field (`NetAmount`, `Direction`, `OnlineGrossAmount`, `PlatformCharge`, `GatewayCharge`, `RefundAmount`, item count) against the hand-calculated number — not a snapshot. Also covers the operator-owes-platform → invoice path, the "nothing unsettled" guard, and that a second call for the same range finds nothing left. |
| 7 | Trip-cancel cascade | **Not automated yet — see Gaps below.** (Chunk 5 is applied; the feature exists. This is a "not written yet" gap, not a blocker.) |
| 8 | Ticket check-in once | `Integration/TicketCheckInTests.cs` | Real `POST /api/tickets/{ticketNumber}/check-in` twice: first call checks in, second is a 200 idempotent "already checked in", not an error. Plus permission denial (CounterStaff, Customer, unauthenticated) and cross-operator denial (a Supervisor from one operator can't check in another operator's ticket). |
| 9 | Static review gates (RBAC Amendment v3 item 9) | `Architecture/NoBroadRoleChecksTests.cs` | Source-text scan of every controller for `User.IsInRole("Staff")`/`IsInRole("Operator")`, gated against a tracked baseline (see `docs/RBAC_MIGRATION_GAP_REPORT.md`) so it fails on any NEW occurrence and tracks the baseline shrinking as files get migrated. |
| RBAC denied-case matrix (sample) | `Integration/AuthorizationDeniedCaseTests.cs` | `Buses` create: CounterStaff → 403, Customer → 403, unauthenticated → 401, wrong-operator manager → 403. `StaffProfiles`: a Manager cannot change their own Role even though they hold `Staff.Manage` (the amendment's flagship example). |

## Gaps — not automated in this pass, and why

- **Payment confirmation idempotency.** `PaymentConfirmationService.ConfirmOnlinePaymentAsync`
  (and `ConfirmCounterSaleAsync`) are large (768-line file) and sit at the end of a multi-step
  pipeline (`InitiatePaymentAsync` → gateway webhook/confirm → booking finalize → ledger
  post). Given no ability to compile/run in the environment this pass was done in, writing a
  confident test against a pipeline this size without being able to verify it end-to-end
  risked shipping a test that's subtly wrong about the pipeline's actual shape. This needs a
  dedicated pass by whoever owns that service, ideally with a real build available.
- **Trip-cancellation cascade.** Chunk 5 (which added this feature) is applied and committed
  — the earlier draft of this document, written when this pass first looked at the repo (only
  chunks 1-4 committed, with Chunk 5's patches sitting unapplied and untracked), incorrectly
  called this "blocked." It's not blocked anymore; it's simply not written yet. Add
  `Integration/TripCancellationCascadeTests.cs` covering: seat holds/bookings on the cancelled
  trip get released, affected passengers' bookings move to whatever the cascade's terminal
  status is, and a full no-fee refund is posted per `TripCancellationService`'s own doc
  comment — read that file (and `CancellationProcessingService`/`RefundProcessingService`,
  which it orchestrates) before writing the test, the same way this pass read the services
  behind every other test file here.
- **Angular/React guard specs, Playwright e2e.** Out of scope for this pass — this pass only
  covered the ASP.NET Core API test project (`apps/api.tests`). No frontend test tooling was
  touched.
- **Full RBAC denied-case matrix.** `AuthorizationDeniedCaseTests.cs` covers 5 representative
  cases across 2 of the 21 currently-migrated controllers. The amendment's full matrix (every
  business controller × every role × every ownership boundary) is a much larger effort —
  see `docs/RBAC_MIGRATION_GAP_REPORT.md` for the 42 controllers that still need migrating
  before their denied-cases can even be tested meaningfully.
- **Chunk 8's ERP integration (fail-open/fail-closed behavior) has no dedicated test file.**
  The seat-hold tests explicitly avoid triggering it (see `docs/KNOWN_LIMITATIONS.md`) rather
  than testing it — that's a real, separate gap, not a design choice that covers it.

## Test project layout

```
apps/api.tests/
  Unit/                 — no DB, no host. TripSellability's pure logic.
  Architecture/          — no DB, no host. Source-text static checks.
  Integration/           — real WebApplicationFactory<Program> + LocalDB + real HTTP.
  Infrastructure/         — shared factory, demo account constants, login helper.
```
