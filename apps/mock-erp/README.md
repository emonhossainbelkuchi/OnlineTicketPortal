# mock-erp

A small standalone server standing in for Hanif's own ERP (the demo `ExternalApiManaged`
operator — see `TicketPortal-Concept.md` §3.2 and `Data/DemoDataSeeder.cs`'s Hanif rows).
Implements the four calls documented in `docs/EXTERNAL_ERP_INTEGRATION_CONTRACT.md`, so
`apps/api/Services/ExternalBookingSyncService.cs` has something real to talk to instead of the
fictional, never-reachable `https://erp.hanifenterprise.example.com` URL that was seeded before
Chunk 8.

Deliberately plain Node + Express, no build step, no TypeScript, no database — this only needs
to exist for local dev/demo. State lives in memory and resets every time the process restarts.

## Run it

```bash
cd apps/mock-erp
npm install
npm start          # or: node src/index.js
```

Listens on `http://localhost:5099` by default (override with `MOCK_ERP_PORT`). The API's own
`appsettings.Development.json` already points `Integrations:HanifErpBaseUrl` at
`http://localhost:5099/api/v1` and sets `HANIF_ERP_API_KEY=demo-hanif-erp-key` — matching this
server's default `X-API-Key`, so a fresh clone works together with zero extra setup as long as
both processes are running. If you change `HANIF_ERP_API_KEY` in the API's config, either set
the same value as this server's `HANIF_ERP_API_KEY` environment variable, or run with
`MOCK_ERP_REQUIRE_AUTH=false` to disable the check entirely for quick local testing.

## Scenario switch

Every meaningful failure mode Chunk 8's rejection/timeout policy needs to handle is one call
away — no restart required:

```bash
curl -X POST http://localhost:5099/__scenario -H "Content-Type: application/json" \
  -d '{"scenario": "seat_unavailable"}'

curl http://localhost:5099/__scenario   # see the current scenario + the full list

curl -X POST http://localhost:5099/__reset   # clear all in-memory bookings/seats, back to "success"
```

| Scenario                 | What it does |
|---------------------------|--------------|
| `success` (default)       | `ConfirmBooking` always returns `200 Confirmed` on the first try. |
| `pending_then_confirmed`  | First `ConfirmBooking` call for a given `bookingId` returns `202 Pending`; the second call returns `200 Confirmed`. Demonstrates the sweep's normal retry-until-confirmed path (`ExternalBookingSyncSweepService` runs every 2 minutes). |
| `seat_unavailable`        | `ConfirmBooking` always returns `409 SEAT_UNAVAILABLE`. `GetSeatAvailability` also always reports seat `A1` sold on every trip, so `SeatHoldsController`'s live-availability check (Chunk 8 task 5) has something to refuse immediately without needing a prior booking. |
| `server_error`            | `ConfirmBooking` always returns `500`. Use this to demonstrate the timeout/max-attempts policy (`Integrations:MaxSyncAttempts`, default 5) — after that many failed sweep attempts on the same booking, `ExternalBookingSyncService` treats it as a rejection: booking → `Failed`, tickets cancelled, seats released, an automatic `Refund` created. |
| `always_pending`          | `ConfirmBooking` always returns `202 Pending`, forever. This is **not** the same as `server_error` — a live "still processing" reply is logged as a *successful* sync call (the operator answered, they just haven't decided yet), so it does **not** count toward `Integrations:MaxSyncAttempts` and will retry indefinitely. This is a deliberate, documented scope boundary — see the contract doc's "Known limitations" section. |
| `slow`                    | `ConfirmBooking` waits 8 seconds before returning `200 Confirmed` — long enough to exceed `CheckSeatAvailabilityAsync`'s 5-second cap, short enough to stay under the integration's own 30-second `ConfirmBooking` timeout. Useful for seeing the two different timeouts in action. |

Seats confirmed through `ConfirmBooking` are remembered per `tripId` and show up as sold the
next time `GetSeatAvailability` is called for that trip — a simple but genuine simulation of
"the operator's own system now considers this seat taken."

## Routes

All `/api/v1/*` routes require an `X-API-Key` header (401 without one). `/health` and
`/__scenario`/`/__reset` do not.

- `GET  /health` — used by the admin integration screen's "Test connection" button.
- `GET  /api/v1/trips/:tripId/seats` — GetSeatAvailability
- `POST /api/v1/bookings/confirm` — ConfirmBooking
- `GET  /api/v1/bookings/:bookingId/status` — GetBookingStatus (not currently called by the .NET
  side — see the contract doc — but implemented here for completeness)
- `POST /api/v1/bookings/:bookingId/cancel` — CancelBooking

See `docs/EXTERNAL_ERP_INTEGRATION_CONTRACT.md` for the full request/response shapes.

## What this is not

Not a template for a real operator integration, not load-tested, not meant to run in any
deployed environment — `MOCK_ERP_REQUIRE_AUTH` and the in-memory-only state are both fine for a
laptop demo and would be the first two things to fix for anything real.
