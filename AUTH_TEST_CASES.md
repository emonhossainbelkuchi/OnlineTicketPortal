# RBAC Amendment v3 — Manual Test Matrix

No automated test project was run against this change (no .NET SDK in the environment it was
written in — see `AUTHORIZATION_DECISIONS.md`'s verification-status note). These are the
concrete, credential-level scenarios to run by hand (Swagger, Postman, or the Angular UI)
against a freshly-seeded database before merging, or to turn into real
`[Fact]`/`[Theory]` tests in the API test project if one exists.

All demo credentials are in `DEMO_ACCOUNTS.md`.

## Counter-assignment scoping (RBAC Amendment v3 task 4)

| # | Actor | Action | Expected |
| --- | --- | --- | --- |
| 1 | `selina.counter.gl` | `POST /api/bookings` with `salesCounterId` = **Gabtoli** (her own assignment) | 201 Created |
| 2 | `selina.counter.gl` | `POST /api/bookings` with `salesCounterId` = **Kalyanpur** (Farida's counter, same operator) | **403 Forbidden** — this is the headline scenario the amendment exists to fix |
| 3 | `farida.counter.gl` | `POST /api/bookings` with `salesCounterId` = Gabtoli | **403 Forbidden** (converse of #2) |
| 4 | `abdul.karim.gl` (Operator Manager, Green Line) | `POST /api/bookings` with `salesCounterId` = either Green Line counter | 201 Created — Operator Manager is not counter-restricted |
| 5 | `selina.counter.gl` | `POST /api/bookings` with `salesCounterId` belonging to **Ena** (a different operator) | 400/403 — blocked by the pre-existing "SalesCounter belongs to a different operator than the Trip" check before assignment is even considered |
| 6 | `delwar.supervisor.sho` (Supervisor, no `Counter.Sell`) | `POST /api/bookings` with any `salesCounterId` | **403 Forbidden** — Supervisor has no `Counter.Sell` at all, never reaches the assignment check |

## Self-promotion (RBAC Amendment v3 task 5)

| # | Actor | Action | Expected |
| --- | --- | --- | --- |
| 7 | `selina.counter.gl` | `PUT /api/staffprofiles/{herOwnId}` with `role: Manager` | **403 Forbidden** — even though she can normally reach her own profile |
| 8 | `selina.counter.gl` | `PUT /api/staffprofiles/{herOwnId}/my-profile` with a new `address` | 200 OK — contact-field self-service still works |
| 9 | `selina.counter.gl` | `PUT /api/staffprofiles/{herOwnId}` with `role: CounterStaff` unchanged, only `employeeCode` edited | **403 Forbidden anyway** — she has no `Staff.Manage` permission at all, so the general Update endpoint is closed to her regardless of what she's changing (this is correct: use `/my-profile` for self-service) |
| 10 | `abdul.karim.gl` (Operator Manager) | `PUT /api/staffprofiles/{selinaId}` setting `role: Manager` | **403 Forbidden** — an Operator Manager cannot promote a CounterStaff member into Manager tier |
| 11 | `abdul.karim.gl` | `PUT /api/staffprofiles/{selinaId}` setting `role: Supervisor`, other fields unchanged | 200 OK — both current and new role are in the "lower-ranked" set |
| 12 | `abdul.karim.gl` | `PUT /api/staffprofiles/{ownStaffProfileId}` (his own, if he has one) changing his own `role` | **403 Forbidden** — self-promotion guard applies regardless of who the actor is |
| 13 | `admin` | `PUT /api/staffprofiles/{selinaId}` setting `role: Manager` | 200 OK — Admin is exempt from the operator-manager tier restriction (still blocked from touching Selina's OWN profile's role only if Selina herself is the caller, which isn't this case) |

## Fleet / counter configuration (the "reference controller" fix)

| # | Actor | Action | Expected |
| --- | --- | --- | --- |
| 14 | `selina.counter.gl` (CounterStaff) | `POST /api/buses` for Green Line | **403 Forbidden** — no `Fleet.Manage` |
| 15 | `abdul.karim.gl` (Operator Manager) | `POST /api/buses` for Green Line | 201 Created |
| 16 | `abdul.karim.gl` | `POST /api/buses` for **Ena** (a different operator) | 403 — blocked by `CanManageOperator`, unchanged from before |
| 17 | `selina.counter.gl` | `POST /api/salescounters` for Green Line | **403 Forbidden** — no `Counter.Configure` |
| 18 | `abdul.karim.gl` | `POST /api/salescounters` for Green Line | 201 Created |

## Atomicity (AdminController.CreateStaff)

| # | Actor | Action | Expected |
| --- | --- | --- | --- |
| 19 | `admin` | `POST /api/admin/staff` with an `employeeCode` that's a duplicate (forces the `StaffProfile` save to fail) | 409 Conflict, AND the login account created earlier in the same request no longer exists (`GET /api/admin/users` does not list it) — confirms the transaction rolled back, not just the response message |

## Retired roles

| # | Actor | Action | Expected |
| --- | --- | --- | --- |
| 20 | `admin` | `POST /api/admin/users/{id}/roles` with `role: Operator` | 400 Bad Request, "Operator identity role is retired" |
| 21 | `admin` | `POST /api/admin/staff` with `role: Staff`, `jobRole: Admin` | 400 Bad Request, "JobRole 'Admin' is retired" |

## Session capability endpoint

| # | Actor | Action | Expected |
| --- | --- | --- | --- |
| 22 | `selina.counter.gl` | `GET /api/account/me` | `actorType: "Staff"`, `jobRole: "CounterStaff"`, `busOperatorId` = Green Line's id, `assignedCounters` = [Gabtoli], `permissions` includes `Counter.Sell`/`Counter.Cancel`/`Counter.Read`/`Booking.Read` and nothing else |
| 23 | A `Staff` login with no `StaffProfile` at all (if one can be constructed) | `GET /api/account/me` | `actorType: "UnprovisionedStaff"`, `permissions: []` — and every permission-gated endpoint returns 403 for this session, never falls through to platform-wide access |
