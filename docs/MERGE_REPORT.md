# Merge report — your TicketPortal + teammate's OnlineTicketPortal

Base = your GitHub main (`150ae5a`). Commits on top, in order:
1. **Codex merge as received** — API additions from the teammate (booking-buses, richer trip/booking DTOs), password reset,
   ticket verify, payment-method validation. *No teammate UI was included in this commit.*
2. **Admin login fixes** — self-healing bootstrap admin (Development), visible login errors.
3. **Admin: management console** — the teammate's react-app mounted at `/admin` (see below).
4. **Angular: missing customer features + UTC fix.**

## What the teammate built, and where it went
| Teammate | Now |
|---|---|
| `api/` changes | Already in the merged API (verified by diff). Empty migration `..._e` and `SQLQuery1.sql` intentionally left out. His `StaffSalariesController` rewrite replaced yours in the Codex merge; behaviour is equivalent but review it once. |
| `react-app` (admin CRUD, ~280 files) | `apps/admin/src/console/*`, served at `/admin`, one shared login. |
| `angular-app` bus discovery | `features/browse` (`/buses`, `/buses/:id`) |
| `angular-app` my-tickets / ticket-details | `my-bookings/tickets` (+ QR, PDF) |
| `angular-app` complaints | `my-bookings/complaints`, `.../new` |
| `angular-app` routes-list / route-details | **Not ported** — `GET /api/busroutes` requires login and the unified search already covers route discovery. |
| `angular-app` search / seat / booking / payment pages | **Not ported** — your Angular 22 versions are more complete (hold timer, guards, wallet, cancellations). |

## Changes to his react-app you should know about
- **Fake-data fallbacks removed.** His API client answered network failures with invented data and reported bus-operator
  create/update/delete as successful while writing only to localStorage. Failures now fail.
- **localStorage-only screens replaced by the generic API-backed page.** Bus routes, fare-rule helpers, operator
  contracts, operator integrations + endpoints, operator settings, bus maintenance logs, bus images, bus amenity
  mappings and external-trip-mapping create/edit never called the API and used made-up ids. Their routes now open the
  generic CRUD page for the same resource (`/admin/resource/<Key>`), which talks to the real endpoints. The original
  page files are still in `src/console/pages/admin/` (unrouted) if you want to rebuild them properly on the API.
- Seed arrays of made-up operators/buses/routes were emptied; the operator/route lookup caches are filled from the API.
- Sign-in moved to your admin login page (`tp_admin_auth`); the console reads that session.
- **Dead code removed:** 68 console files that nothing reachable imports (localStorage prototypes, duplicate pages, unused
  hooks/types) were deleted; the exact list is in `docs/REMOVED_CONSOLE_FILES.txt`. 24 more unreachable files stay because
  the type checker still needs their type definitions.
- **Generic CRUD page made usable:** Edit forms now prefill (field names were PascalCase, API rows camelCase, so every
  Edit opened blank and saving would have blanked the record); foreign-key fields (`BusOperatorId`, `OriginTerminalId`, ...)
  are dropdowns of real records instead of GUID text boxes; blank optional Guid/date/number fields are sent as `null`
  (they were sent as `""`, which the API rejects); new records start Active; unknown `/admin/...` URLs show a 404.

## Later fixes (found by testing in a real browser)
- Seat hold failing with a stale login: the API now rejects tokens whose user no longer exists or is disabled (401 -> the app
  logs out and returns you to the same seat map after login); `SeatHoldService` gives a clear message; disabled accounts can no
  longer log in.
- Trip seat map redrawn as a vertical coach (`shared/bus-seat-layout`), also used on the Browse Buses detail page.
- Angular: a wrong password used to show "Your session has expired" and redirect; it now shows the server's message.
- Console: nine redirected pages (bus routes, operator integrations/contracts/settings, ...) rendered blank because a
  `resource/<Key>/*` redirect matched its own target URL; fixed.

## Verified vs not verified
Verified in a sandbox, in headless Chromium against a **mocked** API: seat map (select, hold, hold failure, stale-token
redirect, phone width), Browse Buses list/detail, My Tickets, ticket QR + PDF download, complaint create/list, Angular login
failure message, admin login (wrong password / API down / non-admin / success), console navigation, generic CRUD create + edit
payloads, and a crawl of 205 console URLs (no blank pages or runtime errors except timing artefacts on redirects) plus a
50-URL re-crawl after the cleanup. Also: `nx build frontend`, `vite build` (both entries), TypeScript clean for admin and console,
UTC helper checks, C# files parse cleanly with a C# parser.
**Not verified:** anything that needs the real API/database. The C# changes were syntax-checked but never compiled (no .NET SDK in
the sandbox); console list pages were only crawled with empty data. Run the smoke test in RUN_AND_LOGIN_GUIDE.md.

## Known gaps against the concept (TicketPortal-Concept.md)
- §6.3 net settlement: engine + finance panel exist; run an end-to-end month (online sales + counter sales → invoice → payout)
  on demo data and check the net figure by hand.
- §3.2 API-connected operators: integration records and monitoring screens exist; there is no live call to a real operator
  ERP — demo it with a stub endpoint.
- The console's dashboard swallows API errors and shows zeros; a failing API looks like an empty platform.
- Automated tests: none in the repo. Add at least tests for hold expiry and commission/settlement maths.
