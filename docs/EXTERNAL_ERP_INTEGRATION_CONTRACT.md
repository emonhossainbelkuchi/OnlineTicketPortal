# External ERP Integration Contract (Chunk 8)

What `apps/api/Services/ExternalBookingSyncService.cs` actually sends and expects when talking
to an API-connected operator's own ERP (concept doc §3.2 — an operator with
`BusOperator.InventoryMode = ExternalApiManaged`, e.g. the demo operator Hanif). `apps/mock-erp`
implements this contract exactly, so it's also the reference implementation if the prose below
and the code ever disagree — the code wins, and this doc should be corrected to match it.

## Read this first — verification status

**No `dotnet build`, `dotnet ef`, or `nx typecheck`/`nx build` was run against the .NET, Angular,
or React changes in this chunk.** The environment this was implemented in has no .NET SDK and no
access to NuGet — every `.cs` file was written by hand, checked by re-reading the surrounding
code for the exact method signatures/field names/namespaces it needed to match (not assumed from
memory), but none of it has been compiled. The Angular and React/TypeScript changes were
similarly hand-checked against the real component/model files but not run through `tsc`/the Nx
build. **The one piece that WAS genuinely tested end-to-end is `apps/mock-erp` itself** — every
route and every scenario switch was exercised with real HTTP requests (see its README) — because
that runs on plain Node, which was available.

Before merging:

1. `dotnet build apps/api/TicketPortal.Api.csproj` — fix anything that doesn't compile. The
   highest-risk files are `Services/ExternalBookingSyncService.cs` (full rewrite) and
   `Controllers/SeatHoldsController.cs`/`Controllers/SalesCountersController.cs` (new
   dependencies injected into existing primary constructors).
2. No new EF migration is needed — the unique indexes Chunk 8 task 8 asked for
   (`ExternalBookingMapping` on `(OperatorIntegrationId, BookingId)` and
   `(OperatorIntegrationId, ExternalBookingKey)`) turned out to **already exist**, both in
   `AppDbContext.OnModelCreating` and in the `InitialCreate` migration itself
   (`IX_ExternalBookingMappings_OperatorIntegrationId_BookingId`/`..._ExternalBookingKey`) —
   verified by grepping the migration and snapshot files directly. Nothing to generate here.
3. `npx nx run admin:typecheck` (or the app's real typecheck target) for
   `apps/admin/src/pages/IntegrationsPage.tsx` and `libs/shared/models/src/lib/integration.model.ts`.
4. `npx nx run frontend:typecheck` for `apps/frontend/.../counter-setup.component.ts`'s new
   `eligibleBusOperators` computed signal and the template's `<select>` change.
5. Run `apps/mock-erp` (`cd apps/mock-erp && npm install && npm start`) alongside the API with
   `Integrations:HanifErpBaseUrl=http://localhost:5099/api/v1` (already the Development default)
   and click through: hold a seat on a Hanif trip, pay, watch
   `ExternalBookingSyncSweepService` pick it up within 2 minutes and confirm it; then try the
   `seat_unavailable` and `server_error` scenarios and confirm the booking ends up refunded
   rather than stuck.

## Auth

Every `/api/v1/*` call carries one header, built by `ExternalBookingSyncService.ApplyAuth`:

- `AuthType = ApiKey` (what Hanif's demo integration uses): header named
  `OperatorIntegration.ApiKeyHeaderName` (`X-API-Key` for Hanif), value = the resolved secret.
- `AuthType = BearerToken`: `Authorization: Bearer <secret>`.
- `AuthType = Basic`: `Authorization: Basic <base64(secret)>`.
- `AuthType = OAuth2` or `None`: no auth header sent (OAuth2's token-fetch flow isn't
  implemented — same "not built yet" status as gateway-specific payment logic elsewhere in this
  project).

**The secret itself is never stored as a literal.** `OperatorIntegration.SecretReference` is a
pointer: `"env:HANIF_ERP_API_KEY"` resolves `HANIF_ERP_API_KEY` from `IConfiguration`
(environment variables, or a matching key in `appsettings.{Environment}.json`) at call time —
see `ExternalBookingSyncService.ResolveSecret`. A bare value with no `env:` prefix is still
honored for anything seeded before this convention existed, but every integration from here on
should use `env:...`. The API never returns the raw secret in any response —
`OperatorIntegrationResponseDto` exposes only `hasSecret` (bool) and `secretReferenceMasked`
(e.g. `"env:••••_KEY"`).

`BaseUrl` is the operator's host/origin only (e.g. `http://localhost:5099/api/v1`) —
`OperatorIntegrationEndpoint.PathTemplate` supplies the rest of each path, always starting with
`/`. The two are joined with plain string concatenation, not `Uri`'s own combine logic, because
`Uri(baseUri, relativeUri)` silently drops `BaseUrl`'s own path segment whenever the relative
part starts with `/` — see `SyncOneAsync`'s comment.

## The four calls

Each is keyed off `OperatorIntegrationEndpoint.Purpose` (case-insensitive) — an integration can
have zero, some, or all four active at once. Missing an endpoint for a given purpose is not an
error: the caller either logs it as `Skipped` and moves on (`ConfirmBooking`,
`CancelBooking`) or treats it as "nothing to check" (`GetSeatAvailability`, which fails open —
see below).

### 1. ConfirmBooking

Driven by `ExternalBookingSyncSweepService` (every 2 minutes) via
`ExternalBookingSyncService.SyncOneAsync`, for every `Booking` where
`RequiresExternalConfirmation = true` and `ExternalConfirmedAtUtc` is still null.

**Request** — `PathTemplate` typically `/bookings/confirm`:

```json
POST {BaseUrl}{PathTemplate}
{
  "bookingId": "guid",
  "pnr": "string",
  "tripId": "guid",
  "seatCount": 2,
  "seatNumbers": ["A1", "A2"],
  "grandTotal": 1500.00,
  "currency": "BDT"
}
```

**Response** — `200`/`202` body:

```json
{
  "status": "Confirmed",           // or "Pending", "Failed", "Rejected", "Cancelled", ...
  "externalBookingKey": "string",  // the operator's own booking id — always recorded if present, even on a non-Confirmed status
  "externalPnr": "string"
}
```

**What each outcome does** (see `SyncOneAsync` and `RejectConfirmedBookingAsync`):

| Response | Meaning | Effect |
|---|---|---|
| `2xx`, `status: "Confirmed"` | Operator has secured the seat. | `Booking.RequiresExternalConfirmation = false`, `ExternalConfirmedAtUtc` set. Mapping row (`ExternalBookingMapping`) recorded/updated regardless of status. |
| `2xx`, `status: "Pending"` (or anything unrecognized) | Operator is still deciding. | Nothing changes — the flag stays `true`, the sweep tries again next tick. |
| `2xx`, `status` is `"Failed"`, `"Rejected"`, `"Declined"`, `"Cancelled"`/`"Canceled"`, or `"SeatUnavailable"` | Operator explicitly said no. | **Immediate rejection** — see below. |
| `409 Conflict` (any body) | Operator's shorthand for "seat no longer available on our side." | **Immediate rejection**, same as above. |
| Any other non-2xx, a timeout, or a network/parse error | Transient failure. | Counted toward `Integrations:MaxSyncAttempts` (default 5, config-only, no migration). Once a booking has that many *failed* `ConfirmBooking` sync-log rows (this attempt included), it's escalated to the same rejection path. |

**Rejection** (`RejectConfirmedBookingAsync`) — reuses the same shape as
`PaymentConfirmationService`'s paid-but-seats-lost path and
`CancellationProcessingService.ApproveAsync`: every non-cancelled/non-refunded `Ticket` on the
booking is marked `Cancelled`, the seats are handed back to `SeatHoldService.
ReleaseCancelledSeatsAsync` (still the only code path allowed to touch `TripSeat.Status`), the
`Booking` itself moves to `Failed` with a `CancellationReason`, and an automatic `Refund` is
created at `Requested` against the booking's most recent successful `Payment` — from there
`RefundProcessingService` handles it exactly like any other refund. **A booking never sits
"Confirmed" on the strength of a reply we never actually got, and never stays Confirmed once the
operator has explicitly said no or gone unreachable for `MaxSyncAttempts` tries.**

### 2. GetSeatAvailability

Called synchronously from `SeatHoldsController.Create`, before every hold attempt on a trip
whose `InventoryMode = ExternalApiManaged` — `ExternalBookingSyncService.CheckSeatAvailabilityAsync`.

**Request** — `PathTemplate` typically `/trips/{tripId}/seats`:

```
GET {BaseUrl}{PathTemplate with {tripId} substituted}
```

**Response:**

```json
{
  "tripId": "guid-or-string",
  "soldSeatNumbers": ["A1", "B3"]
}
```

Any seat in `soldSeatNumbers` that the customer is trying to hold gets refused with `409` from
`SeatHoldsController` itself, before `SeatHoldService.HoldSeatsAsync` is ever called.

**This fails OPEN.** A timeout (capped at 5 seconds or the integration's own `TimeoutSeconds`,
whichever is smaller — deliberately short, since this sits in a synchronous request path), a
non-2xx response, or any exception is logged (`Failed`) and treated as "nothing to check" — the
hold proceeds and falls back to `TripSeat.Status` in our own database, which remains the
authoritative source of truth either way. An unreachable operator ERP must not block every sale
on that trip; this is an *extra* check on top of `SeatHoldService`'s own race-safe locking, never
a replacement for it. A persistently failing integration is visible on the admin integration
screen (recent-failures count), not silently and permanently degraded to "no check at all"
without a trace.

Results are cached in-process per `tripId` for 30 seconds, to keep a busy search/checkout page
from hammering the operator's ERP on every click.

### 3. CancelBooking

Best-effort, fire-after-commit propagation from `CancellationProcessingService.ApproveAsync`,
via `ExternalBookingSyncService.TryCancelExternalBookingAsync` — called only for a booking that
actually has an `ExternalBookingKey` (i.e. was confirmed through this contract in the first
place). **Never throws** and is called *after* the refund/seat-release transaction has already
committed, so a failure here can never undo or block the cancellation the customer is waiting on
— it just becomes a `Failed` sync-log row, same as any other failure this engine logs.

**Request** — `PathTemplate` typically `/bookings/{bookingId}/cancel`:

```
POST {BaseUrl}{PathTemplate with {bookingId}/{externalBookingKey} substituted}
{ "bookingId": "guid", "externalBookingKey": "string" }
```

**Response:** any 2xx body is treated as success; anything else is logged `Failed`. No retry —
this is fire-and-forget by design (P1, "best-effort" in the plan's own wording), not a
sweep-driven at-least-once delivery like `ConfirmBooking`.

### 4. GetBookingStatus

Documented and implemented in `apps/mock-erp` for contract completeness, and seeded as an
endpoint for Hanif — **but nothing in this codebase calls it yet.** A natural fit for a future
"check status now" admin action (e.g. a button next to a `Pending` booking on the integration
screen), but that UI wasn't part of Chunk 8's task list and wasn't built here.

```
GET {BaseUrl}{PathTemplate with {bookingId} substituted}
→ { "bookingId": "...", "status": "...", "externalBookingKey": "...", "externalPnr": "..." }
```

## Test connection

The admin integration screen's "Test connection" button
(`OperatorIntegrationsController.TestConnection`, `Permissions.IntegrationsManage`/Admin-only)
calls `ExternalBookingSyncService.TestConnectionAsync`, which is **not** one of the four calls
above — it's a generic `GET {BaseUrl}/health`, independent of which endpoints happen to be
configured yet, so it works before any real `OperatorIntegrationEndpoint` rows exist. `apps/mock-erp`
implements `/health`; a real operator ERP would need an equivalent route (or `TestConnectionAsync`
would need updating to hit something else instead — this generic-health-check design is a Chunk 8
scoping decision, not something the operator's ERP is contractually required to support beyond
the mock).

## Known limitations (explicit scope boundaries, not oversights)

- **A booking stuck at a live `202 Pending` forever never gets escalated.** Every 2xx reply —
  `Pending` included — is logged `Succeeded` (the operator *did* answer, they just haven't
  decided), so it never counts toward `Integrations:MaxSyncAttempts`, which only counts actual
  failures (timeouts, 5xx, network errors). The plan's task 4 wording is specifically
  "timeout/5xx → retry up to N attempts" — an operator that keeps saying "still processing"
  indefinitely is a different failure mode, deliberately left unhandled here. `apps/mock-erp`'s
  `always_pending` scenario demonstrates this exact case; see its README.
- **One active `OperatorIntegration` per `BusOperator` is assumed** by every lookup in
  `ExternalBookingSyncService` (`.Where(i => i.BusOperatorId == ... && i.IsActive).FirstOrDefaultAsync()`).
  Nothing stops the database from holding more than one active row per operator; if that ever
  happens, whichever one EF returns first wins, silently.
- **`GetSeatAvailability`'s seat matching is by `TripSeat.SeatNumber` string, not
  `ExternalSeatMapping`.** The `ExternalSeatMapping`/`ExternalTripMapping`/`ExternalRouteMapping`
  tables already exist in the schema but nothing in this codebase populates or reads them yet —
  wiring seat-number matching through them instead (for operators whose own seat-numbering
  scheme differs from ours) is future work, not attempted here.
- **`OperatorIntegrationsController`'s existing CRUD (`GetAll`/`GetById`/Create/Update/Delete)
  was left on plain `User.IsInRole("Admin")` checks**, exactly as Chunk 2 left it — not migrated
  to the `Permissions`/`ICurrentActorService` system in this patch, to keep this chunk's
  footprint on Chunk 2's own files minimal. It's still correctly Admin-only either way. Only the
  two new endpoints (`GetStatus`, `TestConnection`) use the new permission system.
- **The admin integration screen (`IntegrationsPage.tsx`) is a monitoring/health dashboard, not
  full record editing.** Mode badge, last-sync, recent-failure count, a log table, and "Test
  connection" — matching the plan's literal task list. Adding/editing a `BaseUrl`, auth type, or
  rotating a secret is left to the console's existing generic CRUD (linked from the bottom of the
  page), not rebuilt a second time here.
- **No operator-manager-facing screen consumes `OperatorIntegrationsController.GetStatus`
  yet.** The endpoint and its `Permissions.IntegrationsRead` grant exist (RBAC Amendment v3 §8),
  but no operator-facing app/page in this codebase currently calls it — it's there for whichever
  screen picks it up next.
