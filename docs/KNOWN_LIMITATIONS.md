# Known Limitations — as of the Chunk 10 pass (against chunks 1-9)

Honest, current state. Update this file as items get resolved rather than deleting the
history of what was known and when.

## Scope / process

- **Chunk 2 (RBAC migration) is significantly incomplete** — see
  `docs/RBAC_MIGRATION_GAP_REPORT.md`. 42 controllers still use the pre-amendment broad
  role-check pattern (down from 47 after Chunk 4 — Chunk 7's finance-permissions work fixed
  5, with zero regressions). 21 controllers are now properly migrated.
- Chunk 5's trip-cancellation cascade patches, which were sitting unapplied and untracked
  when this pass first looked at the repo (after Chunk 4), are confirmed **applied and
  committed** in the chunks-1-9 state this version of the Chunk 10 patch was verified
  against. `Integration/TripCancellationCascadeTests.cs` is still not written (see Gaps in
  `docs/FINAL_TEST_MATRIX.md`) — the feature exists now, so that's purely a "hasn't been
  written yet" gap, not a "feature doesn't exist" blocker.

## This Chunk 10 pass specifically

- **Nothing in `apps/api.tests/` has been compiled or run.** The environment this pass was
  done in had no .NET SDK installed and no network access to nuget.org — every test file was
  written by reading the real model/service/controller/DTO source directly and matching
  signatures exactly, but there is no substitute for an actual `dotnet build` /
  `dotnet test` pass. Budget time for a normal fix-the-build-errors cycle before trusting any
  green (or red) result from this suite.
- **Payment confirmation idempotency has no automated test.** See the Gaps section of
  `docs/FINAL_TEST_MATRIX.md`.
- **No trip-cancellation-cascade test yet**, even though Chunk 5 is done — see above.
- **No Angular/React authorization guard tests, no Playwright e2e tests** were added — this
  pass was scoped to the ASP.NET Core API test project only.
- **The RBAC denied-case test matrix covers 5 cases across 2 controllers**, not the full
  matrix the amendment describes. It's a real, working example to extend, not a finished
  matrix.
- **CI is not wired to run the new test suite yet** — see item 7 in
  `docs/SECURITY_CHECKLIST.md`.
- **`GET /api/Trips`'s new cap (`Trips:MaxAnonymousListSize`, default 500) has no
  accompanying pagination UI change.** Checked both `apps/frontend` and `apps/admin` for
  callers of the plain `GET /api/trips` endpoint (as opposed to `/api/trips/search` or
  `/api/trips/{id}`) and found none, so this pass didn't find a live consumer that would
  break — but re-check if a new screen starts calling it directly.
- **The seat-hold integration tests deliberately avoid Chunk 8's ExternalApiManaged
  (Hanif/mock-ERP) demo operator**, filtering to `PlatformManaged` operators only (see the
  comments in `Integration/SeatHoldConcurrencyTests.cs` / `SeatHoldExpiryTests.cs`). Chunk 8's
  own `ExternalBookingSyncService.CheckSeatAvailabilityAsync` fails open safely when
  `apps/mock-erp` isn't reachable, so this wasn't strictly necessary for correctness — it's a
  deliberate choice to keep these two test files' scope to the internal race/expiry logic and
  avoid any network-dependent flakiness. **A dedicated test file for Chunk 8's
  fail-open/fail-closed behavior itself does not exist yet** and would be a good follow-up
  (see `docs/EXTERNAL_ERP_INTEGRATION_CONTRACT.md` for the contract to test against).

## Carried over from earlier chunks (still true, not re-verified this pass)

- Refer to prior chunks' own documentation/gap registers (`docs/ADMIN_DASHBOARD_DATA_MAP.md`,
  `docs/EXTERNAL_ERP_INTEGRATION_CONTRACT.md`, `docs/MERGE_REPORT.md`) for anything not
  mentioned above — this file only covers what changed or was newly discovered while
  verifying the Chunk 10 patch against the chunks-1-9 codebase.
