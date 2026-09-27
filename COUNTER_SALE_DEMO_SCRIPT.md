# Counter Desk (Chunk 6) — Manual Verification Script

Chunk 6's own task list calls for proving two things: "a counter agent sells a seat that no
online customer can then select" and "the sale reaches finance as software-commission revenue."
Neither is covered by an automated test here — **no test project exists yet** in this repo
(`WebApplicationFactory`, `public partial class Program`, etc. are Chunk 10's job — see its
Owner scope in `TicketPortal_Final_Exam_Completion_Plan_v2.md`). Writing one now, in a sandbox
with no `dotnet` SDK to compile or run it, would mean handing over an unverified test project
instead of unverified prose — no real improvement. This script is the substitute: exact steps,
against the real seeded demo accounts in `DEMO_ACCOUNTS.md`, that a reviewer with the API and
Angular app actually running can walk through and get a pass/fail answer from.

Everything below assumes the two servers from `SETUP_AND_DEMO_GUIDE.md`:

| API | `npx nx run api:serve` | `https://localhost:54221` |
| Counter portal (Angular) | `npx nx serve frontend` | `http://localhost:4200/counter` |

and the demo accounts already seeded by `DbSeeder`/`DemoDataSeeder` (see `DEMO_ACCOUNTS.md`):

- `selina.counter.gl` / `Demo@12345` — CounterStaff, Green Line Paribahan, assigned to **Gabtoli only**.
- `farida.counter.gl` / `Demo@12345` — CounterStaff, Green Line Paribahan, assigned to **Kalyanpur only**.
- `abdul.karim.gl` / `Demo@12345` — Manager, Green Line Paribahan (can use either counter).
- `rahim.uddin` / `Demo@12345` — a Customer account, for the "no online customer can then select it" half of Part B.

## Part A — Dashboard is the default landing screen and shows the right numbers

1. Log in as `selina.counter.gl`, open `http://localhost:4200/counter`.
2. **Pass**: the browser lands on `/counter/dashboard` (not `/counter/walk-in`) with no manual
   navigation, and the header under "Counter & Agent Operations" reads something like
   `Green Line Paribahan — Gabtoli` (from `GET account/me`'s `busOperatorName` +
   `assignedCounters`).
3. Note the "Tickets sold today" and "Cash sales total" figures, then complete one walk-in sale
   (Part B, step 2 below) and reload `/counter/dashboard`.
   **Pass**: both figures increased by exactly the ticket count / `GrandTotal` of the sale just
   made; "By counter" (visible once there's more than one counter in scope) attributes it to
   Gabtoli specifically, not Kalyanpur.
4. Log in as `abdul.karim.gl` (the operator Manager, who can see every one of the operator's
   counters, not just one). **Pass**: the dashboard's totals equal the sum of every counter's
   row in the "By counter" table — this is the same aggregate the endpoint returns, just
   requested by an actor with a wider scope.

## Part B — Cash classification: a counter sale is a counter sale, end to end

1. As `selina.counter.gl`, go to `/counter/walk-in`, pick **Gabtoli** at the counter step, search
   a trip, hold a seat, fill in passenger details, and confirm & collect payment (method: Cash).
2. On the "Sale complete" screen, note the PNR and the seat number.
3. **Pass — booking classification**: query `GET /api/bookings/{id}` (or check via Swagger as
   `abdul.karim.gl`/`admin`) for that PNR's booking. `saleChannel` is `Counter`,
   `moneyCollectedBy` is `Operator`, `status` is `Confirmed`. This is what
   `BookingsController.Create` sets at creation time (unchanged by this chunk) and what the
   dashboard's own query (`SalesCountersController.GetDashboard`) filters on.
4. **Pass — payment classification**: the `Payment` row created by
   `PaymentConfirmationService.ConfirmCounterSaleAsync` has `Gateway = None` and
   `CollectedBy = Operator` (no online gateway ever touched this money — see that method's own
   comment). This is the concrete data the finance/settlement side (Chunk 7) keys its
   "operator owes the platform a software commission" calculation off; Chunk 6 does not add a
   finance screen of its own, but this is the fact that screen will read.
5. **Pass — the seat really is gone**: log out, log in as `rahim.uddin` (or stay anonymous) and
   search the same route/trip/date. **The seat sold in step 1 does not appear as available.**
   This is enforced by `SeatHoldService.ConvertHoldToBookingAsync` (existing, unchanged) — the
   walk-in flow converts the same hold record the online flow would have used, so there is only
   ever one path to "this seat is taken," not two competing ones.

## Part C — Assigned-counter enforcement (RBAC Amendment v3, Chunk 6 note)

This is the fix this chunk actually made. There are two separate places a counter sale can be
scoped to the wrong counter, and only the first one was closed before this chunk:

**C1 — creating the booking (already fixed in Chunk 1/2, re-verify it still holds):**

1. Log in as `selina.counter.gl` (Gabtoli only).
2. At the counter step of `/counter/walk-in`, the dropdown lists **both** Gabtoli and Kalyanpur
   — `SalesCountersController.GetAll` returns every counter of the operator, not just the
   caller's assigned one, so nothing in the UI stops her from picking Kalyanpur here.
3. Pick **Kalyanpur**, search, hold a seat, fill in details, and submit.
   **Pass**: the request fails (the ErrorInterceptor surfaces a 403 as a toast) — booking
   creation itself is blocked by `BookingsController.Create`'s existing `Counter.Sell` +
   `CanUseCounter` check.

**C2 — confirming payment on an already-created booking (the gap this chunk closed):**

C1 already stops the wizard from reaching a payment-confirm call against the wrong counter, so
proving C2 needs a booking that reached `PendingPayment` at Kalyanpur through a path C1 doesn't
block — an Operator Manager can legitimately use *either* counter, so this is a realistic way
one gets created:

1. Log in as `abdul.karim.gl` (Manager — can use both counters) and run the walk-in flow up to
   and including "Hold Seats" and "Continue" through to the passenger-details step, with
   **Kalyanpur** selected as the counter — but stop *before* pressing "Confirm & Collect
   Payment." Note the booking id from the network tab (`POST /api/bookings` response) and the
   hold token.
2. Log out, log in as `selina.counter.gl` (Gabtoli only). Using Swagger (or curl) with her
   bearer token, call:
   ```
   POST /api/payments/counter-sale/confirm
   { "bookingId": "<id from step 1>", "holdToken": "<hold token from step 1>", "method": "Cash" }
   ```
   **Pass**: `403 Forbidden`. Before this chunk, this call succeeded — `ConfirmCounterSale` only
   checked `CanManageOperatorAsync(booking.BusOperatorId)`, which is true for any Green Line
   staff account regardless of which counter they're assigned to; it never looked at
   `booking.SalesCounterId` at all. See `PaymentsController.cs`'s comment on
   `ConfirmCounterSale` and `AUTHORIZATION_DECISIONS.md`'s "Chunk 6 follow-up" note for the
   full explanation.
3. Repeat step 2 as `farida.counter.gl` (Kalyanpur — the booking's actual counter).
   **Pass**: `200 OK`, payment confirmed, tickets issued.

## Part D — Printable receipt

1. Complete a walk-in sale as in Part B (2+ seats on one booking makes this a more useful check).
2. On "Sale complete," click **Print Tickets**. **Pass**: lands on `/counter/receipt?ids=...`
   with one card per seat, each showing its own ticket number, PNR, passenger, seat, trip
   times, and a QR code — the same layout as a customer's own ticket detail page
   (`/my-bookings/tickets/{id}`), because both now render `<tp-ticket-qr-card>`.
3. Click **Print receipt** (`window.print()`) and check the print preview.
   **Pass**: the "← Dashboard" / "Print receipt" buttons are hidden (`@media print` rule), and
   each ticket starts on its own page (`break-after: page`).
4. Navigate to `/counter/receipt` directly with no `ids` query param.
   **Pass**: an empty state ("No tickets to print"), not an error or a blank screen.

## What this script does NOT cover (be upfront about it)

- **No compiler in this sandbox verified the C# side.** No `dotnet` SDK was available while this
  chunk was written — every backend change was checked by hand against the existing model/DTO/
  permission code it calls, not by an actual `dotnet build`. Run one before trusting this in CI.
- **Angular template type-checking wasn't verified either.** Plain `tsc --noEmit` against
  `apps/frontend/tsconfig.app.json` passes with zero errors (catches import/type mistakes across
  all ~122 frontend `.ts` files), but that does not deeply check bindings *inside* `template:`
  strings — that needs the real Angular compiler, which this sandbox's `nx` install could not
  run (`WorkspaceContext is not a constructor` — looks like a native-binary/architecture mismatch
  in this container, unrelated to this chunk's changes). Run `npx nx run frontend:build` before
  trusting this in CI.
- **Complaint-count scoping is only as good as the data model allows.** `Complaint` has no
  `BusOperatorId`/`SalesCounterId` of its own — only a nullable `BookingId` — so the dashboard's
  "open complaints" count for an operator-scoped caller only counts complaints that are actually
  tied to one of that operator's bookings; a complaint filed with no `BookingId` at all is
  invisible to every operator-scoped dashboard (never double-counted, but not visible either).
  See `SalesCountersController.GetDashboard`'s own comment.
