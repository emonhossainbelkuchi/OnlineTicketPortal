# Final Demo Script — Chunk 10

A run-of-show for demonstrating the platform, built around the same real seeded demo
accounts the test suite uses (`DemoDataSeeder.cs` — Development-only, non-secret; see
`apps/api.tests/Infrastructure/DemoAccounts.cs`). Written at the API level (curl/Postman
style) since this pass audited the backend, not the Angular/React screens — swap in the
equivalent UI action wherever you're demoing through the actual apps instead of raw HTTP.

**Prerequisite:** run against a freshly migrated, freshly seeded database (Development
environment) so the account balances/statuses below match what's described. `scripts/
reset-demo-db.sh` (already in this repo) is the fastest way to get there.

## Part 1 — Multi-tenant search (2 min)

1. Anonymous request: `GET /api/trips/search?from=Dhaka&to=Chittagong&date=<a seeded date>`.
   Point out results span multiple operators (Green Line, Ena, Shohagh, Hanif) from one
   unified search — the core pitch from `TicketPortal-Concept.md` section 4.

## Part 2 — Booking + the seat-hold race (3 min)

1. Log in as `rahim.uddin` / `Demo@12345` (a customer).
2. `POST /api/seatholds` with a `TripId` + one `TripSeatId` from the search results above.
   Show the 201 and that the seat is now `Held`.
3. **The race, live:** open two terminals/tabs, both logged in as customers, both hold the
   SAME seat at the same time. One gets 201, the other gets 409 — this is exactly what
   `Integration/SeatHoldConcurrencyTests.cs` automates. Narrate: this is enforced by one
   atomic `UPDATE ... WHERE Status = Available` in `SeatHoldService`, not an
   application-level check-then-act.
4. Mention (don't need to wait live): an abandoned hold expires on its own after 3–5 minutes
   via a background sweep, and the seat becomes bookable again automatically — see
   `Integration/SeatHoldExpiryTests.cs`.

## Part 3 — Money flow: online vs. counter (4 min)

1. Explain the asymmetry from the concept doc: online money lands with the platform first
   (commission deducted before the operator's payout); counter cash goes straight to the
   operator (platform only bills a software commission afterward).
2. Log in as `selina.counter.gl` / `Demo@12345` (Green Line counter staff) and walk through a
   counter sale — show that the endpoint requires `Permissions.CounterSell`, not just "any
   staff member".
3. Show the resulting `PlatformLedger` rows for that sale (via an operator-finance read
   endpoint, staff account permitting) — tie back to
   `Integration/FinanceLedgerServiceTests.cs`'s hand-checked formulas: gross fare, commission
   split, gateway charge (online only), and how a refund reverses exactly the right amount.

## Part 4 — Settlement (2 min)

1. As platform finance staff, trigger (or show a previously generated) settlement for one
   operator over a date range.
2. Point out the two possible outcomes live in the data: a `PlatformPaysOperator` settlement
   feeding `AvailablePayoutBalance`, versus an `OperatorPaysPlatform` settlement that instead
   raises an `OperatorInvoice` — both covered by
   `Integration/SettlementGenerationServiceTests.cs`.

## Part 5 — Ticket check-in at boarding (2 min)

1. Log in as `delwar.supervisor.sho` / `Demo@12345` (a Supervisor — the only role with
   `Ticket.CheckIn`).
2. `POST /api/tickets/{ticketNumber}/check-in` on a valid Issued ticket for a Shohagh trip —
   200, checked in.
3. Scan it again — still 200, but the response says already checked in. Narrate: a boarding
   desk scanning twice by accident is normal, not an error.
4. Try the same call logged in as `selina.counter.gl` (Green Line counter staff, wrong role
   AND wrong operator) — 403. Try it as `rahim.uddin` (a customer) — 403. Try it with no
   token at all — 401.

## Part 6 — Authorization boundaries (3 min)

1. As `abdul.karim.gl` (Green Line's own Manager, who genuinely holds `Fleet.Manage` and
   `Staff.Manage`), attempt to:
   - Create a bus for a **different** operator (Shohagh's ID) — 403, even though the
     permission name matches; `CanManageOperator` still scopes it to their own operator.
   - Edit their **own** `StaffProfile` and change their own `Role` — 403, the amendment's
     flagship self-promotion guard, even though `Staff.Manage` would otherwise let them edit
     any profile in their operator.
2. **Be candid about the gap, if asked, rather than implying full coverage:** this
   demonstrates the pattern on the controllers that HAVE been migrated
   (Buses/StaffProfiles/SalesCounters/parts of Bookings+Tickets, plus Chunk 7's finance
   controllers). 42 other controllers still
   use the old broad-role-check pattern — see `docs/RBAC_MIGRATION_GAP_REPORT.md`. If a
   grader/reviewer picks a controller off that list and tries the same kind of attack against
   it, it may well succeed. That's real, tracked, outstanding work, not a hidden problem.

## Closing notes for whoever is presenting

- Every claim above traces to a specific test file in `apps/api.tests/` — if a demo step
  doesn't behave as scripted, that test file is the first place to look, and
  `docs/KNOWN_LIMITATIONS.md` lists what's known to be incomplete going in.
- Trip-cancellation cascade (Chunk 5) is applied in the codebase but wasn't traced in
  enough detail during this pass to script confidently — see `docs/KNOWN_LIMITATIONS.md`. If
  you want to demo it, walk through it once yourself beforehand rather than reading this
  script live.
