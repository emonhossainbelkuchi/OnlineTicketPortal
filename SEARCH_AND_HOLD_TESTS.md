# Chunk 3 — Search Correctness & Seat-Hold Integrity: Verification Notes

**Verification note.** This sandbox has no .NET SDK and no SQL Server/LocalDB instance (same
constraint noted in `AUTHORIZATION_DECISIONS.md` for Chunk 2), so none of the requests below were
actually executed against a running API. Everything here was verified by reading the resulting
code paths end-to-end (including `DemoDataSeeder.cs`'s seeded trip statuses/dates, so the account
and trip codes below are real seeded data, not placeholders). Before merging, run every row below
against `npx nx run api:serve` (Swagger at `/swagger`) with a freshly-seeded database, and record
actual responses in place of the "Expected" column. Also run:

```
npx nx run-many -t typecheck,lint,build -p frontend,admin
dotnet build apps/api
```

— neither was run here for the same reason.

All demo credentials are in `DEMO_ACCOUNTS.md` (customer accounts use `Demo@12345`).

---

## What changed

- **`Services/TripSellability.cs`** (new) — the single "is this trip still bookable" rule
  (status + departure time + optional stop-sales window), replacing three previously-independent
  copies of the non-bookable-status list.
- **`Services/DhakaClock.cs`** (new) — converts a search `date` (a Dhaka calendar day) into the
  UTC instant range that day actually covers.
- **`Services/SeatHoldService.HoldSeatsAsync`** — now loads the trip's `Status`/`DepartureTimeUtc`
  and refuses the hold (`TripNotBookableException`) if `TripSellability.IsSellable` says no.
- **`Controllers/SeatHoldsController`** — `HoldDurationMinutes` reads `SeatHold:Minutes` from
  config (clamped 3–5) instead of a hardcoded `5`; catches `TripNotBookableException` → 409.
- **`Controllers/TripsController.Search`** and **`Controllers/BookingBusesController`** (`GetAll`,
  `GetAvailableTerminals`, `GetById`) — all now use `DhakaClock` for date filtering and
  `TripSellability.NonBookableStatuses` for status filtering, and all read the same
  `SeatHold:StopSalesMinutesBeforeDeparture` config key for the departure cutoff, so search
  results and hold refusals can never disagree.
- **`appsettings.json`** — new `SeatHold` section: `Minutes` (default 5) and
  `StopSalesMinutesBeforeDeparture` (default 0 — reproduces the exact previous "closed only once
  departed" behaviour; raise it, e.g. to 15, to also close sales shortly before departure).
- **`Data/DemoDataSeeder.cs`** — updated for `SeatHoldService`'s new constructor parameter; the
  one seeded scenario that intentionally backfills a booking onto an already-`Completed` trip
  (GL-1, "completed trip, tickets used") now passes `skipSellabilityCheck: true` so seeding still
  succeeds.
- **`features/search/home/search-home.component.ts`** — the default search date now computes
  "today" in Dhaka local time instead of UTC, matching the backend's interpretation (this file was
  also renormalized CRLF→LF per the repo's `.gitattributes`; the only line-content change is the
  `todayIso()` function).

No endpoint in this chunk requires a new permission under RBAC Amendment v3 — search
(`TripsController.Search`, `BookingBusesController.*`) stays `[AllowAnonymous]`, and creating a
hold (`SeatHoldsController.Create`) stays a plain authenticated-customer action (`[Authorize]`,
no staff permission involved). No new endpoint or route was added, so there is nothing new to add
to `ROLE_PERMISSION_MATRIX.md`.

---

## 1. Trip-state gating (task 1) — [P0]

Seeded trip `GL-6` (`GL-TRP-1006`) is `TripStatus.Cancelled`; `GL-1` (`GL-TRP-1001`) and `ENA-3`
(`ENA-TRP-2003`) are `TripStatus.Completed` with a past `DepartureTimeUtc`.

| # | Actor | Action | Expected |
| --- | --- | --- | --- |
| 1 | anonymous | `GET /api/trips/search?fromTerminalId=<kalyanpur>&toTerminalId=<sylhet>&date=<GL-6's departure date>` | `GL-6` absent from results (status filter, unchanged behaviour — confirms the refactor didn't change what search already hid) |
| 2 | `rahim.uddin` | `GET /api/trips/{GL-6.id}` to read a `TripSeatId`, then `POST /api/seatholds { tripId: GL-6.id, tripSeatIds: [...] }` | **409 Conflict**, `{"message":"This trip has been cancelled and can no longer be booked."}` — this is the headline case Chunk 3 exists to fix: before this change, the same call succeeded (`HoldSeatsAsync` only checked the trip existed) |
| 3 | `rahim.uddin` | `POST /api/seatholds` against `GL-1.id` (Completed, departed 3 days ago) | **409 Conflict**, `"This trip has already finished."` |
| 4 | `rahim.uddin` | `POST /api/seatholds` against a `Scheduled` trip whose `DepartureTimeUtc` is a few seconds in the past (simulate by picking a trip about to depart and waiting, or by temporarily seeding one) | **409 Conflict**, `"This trip has already departed."` — proves the time check fires independently of `Status` |
| 5 | `rahim.uddin` | `POST /api/seatholds` against `GL-2` (Scheduled, ~1 day out) | 201 Created — control case, confirms gating doesn't over-block a genuinely sellable trip |

Row 2 is the one to run manually and screenshot for the PR — it's the exact "call the API
directly, bypassing the UI" attack the concept's definition-of-done item 3 calls for.

## 2. Dhaka-day search window (task 2) — [P0]

Dhaka is a fixed UTC+6: Dhaka midnight on day D is `18:00 UTC` on day D-1, so Dhaka day D spans
`[(D-1) 18:00 UTC, D 18:00 UTC)`. A late-evening Dhaka departure (e.g. `23:30` on day D = `17:30
UTC` on day D) happens to land inside the *old, buggy* `[D 00:00 UTC, D+1 00:00 UTC)` window too,
so that case doesn't actually distinguish old from new behaviour. The bug only bites — and only
the new code gets right — for an **early-morning** Dhaka departure, which the old UTC-day window
placed a full day too late:

| # | Action | Expected |
| --- | --- | --- |
| 6 | Seed or pick a trip with `DepartureTimeUtc` = `05:30` Dhaka time on day D (`23:30 UTC` on day D-1). `GET /api/trips/search?...&date=D` | Trip appears under day **D** (the Dhaka day the customer actually meant). Under the old code, `dayStartUtc = D 00:00 UTC`, and the trip's real UTC instant (`(D-1) 23:30 UTC`) is *before* that window — the trip was invisible under `date=D` and only showed up (wrongly) under `date=D-1` |
| 7 | Same trip as #6, `GET /api/trips/search?...&date=D-1` | Trip **absent** — confirms it moved to the correct day rather than now matching both |
| 8 | `GET /api/booking-buses?date=D` for the same #6 trip | Same result as #6 (`BookingBusesController.GetAll` uses the identical `DhakaClock.DayRangeUtc` helper) |

Rows 6–7 are the two to actually run and screenshot — a 05:xx Dhaka departure moving from the
wrong day to the right one is the plan's own example case.

## 3. Configurable hold duration (task 3) — [P0]

| # | Action | Expected |
| --- | --- | --- |
| 9 | Default `appsettings.json` (`SeatHold:Minutes` = 5), `rahim.uddin` holds a seat on `GL-2` | `SeatHoldResponseDto.secondsRemaining` ≈ 300 |
| 10 | Set `SeatHold__Minutes=3` env var (or edit config), restart API, repeat #9 | `secondsRemaining` ≈ 180 |
| 11 | Set `SeatHold__Minutes=30` (out of the concept's allowed range), restart, repeat #9 | `secondsRemaining` ≈ 300 (clamped to the max of 5), **not** 1800 — confirms the server-side clamp, not just the config value, is what a client actually gets |
| 12 | Set `SeatHold__Minutes=1`, restart, repeat #9 | `secondsRemaining` ≈ 180 (clamped to the min of 3) |

## 4. Race test (task 4) — [P0]

| # | Action | Expected |
| --- | --- | --- |
| 13 | Two different logged-in customers (e.g. `rahim.uddin` and `karim.sheikh`) both `POST /api/seatholds` for the **same** `tripId`/`tripSeatIds` at effectively the same time (fire both requests back-to-back, or with a small script) | Exactly one gets `201 Created`; the other gets `409 Conflict`, `"One or more selected seats were just taken by another customer. Please reselect."` (`SeatsUnavailableException`, unchanged by this chunk — `SeatHoldService`'s single `ExecuteUpdateAsync ... WHERE Status = Available` still guarantees this) |
| 14 | In the Angular app: open the same trip's seat map in two tabs, select the same seat in both, click "Hold Seats & Continue" in both within a couple of seconds | One tab proceeds to checkout; the other shows a toast with the 409 message and the seat map re-fetches (`TripSeatMapComponent.holdSeats`'s `error:` callback), now showing that seat as Held/Booked |

## 5. Expiry test (task 5) — [P0]

| # | Action | Expected |
| --- | --- | --- |
| 15 | In Development, set `SeatHold:Minutes` to 1 (see §3), hold a seat, then wait 15–30 s past expiry (the sweep runs every 15 s — `SeatHoldExpirySweepService`) without paying | `GET /api/seatholds/by-token/{token}` shows `status: "Expired"`, `secondsRemaining: 0`; the seat's `GET /api/trips/{id}` shows that `TripSeat.Status` back to `Available` — with **no manual DB edit** |
| 16 | Attempt to pay against the now-expired hold (`POST /api/payments` or whatever the checkout flow calls, using the stale `holdToken`) | Rejected — `SeatHoldService.ConvertHoldToBookingAsync` already refuses (`hold.Status != Active \|\| hold.HoldExpiresAtUtc <= now`), unchanged by this chunk; confirms an expired hold cannot be paid |

## 6. Result-card fields / multi-operator route (task 6) — [P1, verification only]

Reviewed `TripSearchResultDto`/`ToSearchResultDto` (unchanged by this chunk) and the seeded data:
Gabtoli → Chattogram (CTG Central) has both `GL-2`/`GL-3` (Green Line) and `ENA-1` (Ena) as
`Scheduled` future trips, so `GET /api/trips/search` for that route/day returns more than one
operator, each with operator name, route, fare, and available-seat count on the DTO already.
Bus/facilities (amenities) are on `BookingBusesController`'s richer `BusListDto`, used by the
Browse Buses page, not the plain search results list — worth confirming in the UI screenshot for
this deliverable, but no code change was needed here.

## 7. Edge cases (task 7) — [P1]

| # | Action | Expected |
| --- | --- | --- |
| 17 | Search a route/date with no trips | Empty array; `SearchResultsComponent` shows its existing "No trips matched..." empty state (unchanged) |
| 18 | Search with `fromTerminalId == toTerminalId` | `400 Bad Request` (unchanged, pre-existing check) |
| 19 | Search a past date | Empty results — every trip on that day now has `DepartureTimeUtc <= now`, filtered out by the same cutoff used everywhere else |
| 20 | Search the day `GL-6` (Cancelled) departs | `GL-6` absent (§1, row 1) |
| 21 | Hold seats while logged out | Angular: `TripSeatMapComponent.holdSeats()` catches this client-side and redirects to `/auth/login?returnUrl=...` without calling the API. Direct API call: `POST /api/seatholds` with no bearer token → `401 Unauthorized` (`[Authorize]` on the controller, unchanged) |

Task 8 (public Routes page, **[P2]**) was left out of this chunk — it's explicitly optional
("only if needed") and would need a new anonymous read projection on `BusRoutesController` plus
porting two unported Angular components; flagging it here as deferred rather than doing it
partially.

---

## Config reference

```jsonc
// apps/api/appsettings.json
"SeatHold": {
  "Minutes": 5,                          // clamped to 3–5 server-side regardless of this value
  "StopSalesMinutesBeforeDeparture": 0   // 0 = only closed once actually departed (old behaviour)
}
```

Both keys are also settable as environment variables (`SeatHold__Minutes`,
`SeatHold__StopSalesMinutesBeforeDeparture`) per standard ASP.NET Core config binding, for the
`SeatHold:Minutes` A/B test in §3 above without editing a committed file.
