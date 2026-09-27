# RBAC Amendment v3 — Implementation Decisions & Known Gaps

Written while implementing Chunk 1 + Chunk 2 against the actual codebase (not just the plan
documents). Where the amendment's prose left something ambiguous, or the fixed permission
catalogue didn't have an exact match for something the matrix described, the decision made is
recorded here rather than silently guessed at in code with no trail.

## Verification status — read this first

**No `dotnet build`, `dotnet ef`, or `nx typecheck` was run against this change.** The
environment this was implemented in has no .NET SDK. Every file was written by hand, checked
by re-reading the surrounding code for the exact method signatures/field names/namespaces it
needed to match, and cross-checked against the real `apps/api` source (not assumed from
memory) — but none of it has been compiled. Before merging:

1. `dotnet build apps/api/TicketPortal.Api.csproj` — fix anything that doesn't compile.
2. `dotnet ef migrations add AddStaffSalesCounterAssignments --project apps/api --startup-project apps/api`
   — no migration is included in this change. `Models/People/StaffSalesCounterAssignment.cs`,
   the `AppDbContext` DbSet/indexes, and the navigation properties on `StaffProfile`/
   `SalesCounter` are all in place; EF just needs to generate the actual migration + model
   snapshot from them, which requires the real tool. Run it, review the generated `Up()`,
   then apply it (`dotnet ef database update` or `scripts/reset-demo-db`).
3. `npx nx run frontend:typecheck` and a manual click-through of the counter/finance/operator
   panels — the Angular changes were written against the real component/route files but not
   run through the Angular compiler here either.

## Job-role → permission matrix decisions

See `PermissionMatrix.cs` for the actual table; this is why each row looks the way it does.

- **`StaffRole.Support` is new.** The matrix names a distinct "Platform Support" persona, but
  the enum had no value for it and demo data (`rezaul.support`) was seeded as `Manager` —
  which silently gave it Manager's fleet/trip/cancellation-approval permissions. Added
  `Support = 11` to the enum (int-backed, no migration needed — verified no `HasConversion`
  is used anywhere in `AppDbContext`, so every enum is a plain int column) and fixed the seed.
- **`StaffRole.BusOwner` maps to the same permission set as `StaffRole.Operator`/`Manager`**
  (the "Operator Manager or Operator back-office" row). The matrix doesn't call `BusOwner` out
  separately, and no demo account uses it — this is a reasonable default, not a verified
  business decision. Revisit if `BusOwner` turns out to need a narrower set.
- **`StaffRole.Driver`/`StaffRole.Helper` get an empty permission set.** The matrix says
  "minimal assigned-trip manifest only, if the product needs crew login" — no crew-login
  screens exist in this codebase (`TripCrew` is HR/assignment data only), so granting nothing
  is honest rather than inventing a permission for a feature that isn't there.
- **`StaffRole.Admin`/`StaffRole.SuperAdmin` are excluded from the matrix entirely** (not
  mapped to anything — resolve to an empty permission set via `PermissionMatrix.Resolve`'s
  default). `AdminController.CreateStaff` and `StaffProfilesController` (Create/Update) both
  reject these two values outright for new/edited data, per the amendment's "must never imply
  the Identity Admin role... reject for new data" instruction.
- **Platform Finance was granted `Payout.Process`** ("...and payout processing if the team
  designates it" in the matrix). This deployment grants it — Operator Finance does not get it
  (read-only per the matrix's explicit "approving/processing payouts" forbidden-list entry).
- **Platform Support was NOT granted anything cancellation-related**, despite the matrix's
  "support-side cancellation workflow" phrase. The fixed permission catalogue only has
  `Cancellation.Approve` (no separate "create/initiate a cancellation request" permission),
  and `Cancellation.Approve` is explicitly Platform Manager's per the matrix's own "cancellation
  approval" line for that row — granting it to Support too would blur a line the matrix itself
  draws. Support got `Booking.Read` + `Complaints.Read`/`Complaints.Manage` only. If Support
  genuinely needs to touch cancellations, that needs a new, narrower permission
  (e.g. `Cancellation.Initiate`), not reuse of `Approve`.
- **The operator-onboarding activity named in the Platform Manager row has no home.** The
  fixed P0 catalogue has no `BusOperators.*` permission, and `BusOperatorsController` was
  never in Chunk 2's Owner scope or the "apply the policy map" starter list either — it's
  untouched by this change and still uses its pre-existing role check. Flagging this rather
  than inventing a permission the rest of the system doesn't expect.
- **"Operator Manager may create/deactivate only lower-ranked staff of their own operator"**
  has no rank field to check against, so `PermissionMatrix.OperatorManagerAssignableJobRoles`
  (CounterStaff, Supervisor, Driver, Helper, Finance) is the concrete stand-in for
  "lower-ranked": a non-Admin, operator-scoped caller can only create/edit a `StaffProfile`
  whose job role is in that set, on both the current AND the new value — never Manager/
  Operator/BusOwner/Admin/SuperAdmin. This is what stops an Operator Manager from touching a
  peer Manager's profile at all, which is the concrete form the amendment's "must not promote
  a peer" ended up taking here.

## Scope of the Chunk 2 controller sweep

52 controllers in `apps/api/Controllers` use the broad `CanManageOperatorAsync`/
`IsInRole("Staff")` pattern the amendment wants replaced with a permission check. This change
converts the controllers Chunk 2's own "Owner scope" line names explicitly:

- `AdminController` (atomicity fix + retiring the Operator identity role + rejecting
  Admin/SuperAdmin job roles)
- `StaffProfilesController` (the self-promotion fix, the my-profile split, the
  operator-manager-tier restriction)
- `SalesCountersController` (Counter.Read / Counter.Configure)
- `BusesController` (Fleet.Manage — the "reference controller" every other controller's
  Create/Update/Delete shape imitates)
- `BookingsController`'s counter-sale block (Counter.Sell + the assigned-counter check)
- `StaffCounterAssignmentsController` (new — grants/revokes the assignments above)
- `AccountController` (new `GET /me` capability endpoint)

It does **not** touch the other ~45. `TicketsController`'s check-in endpoints are named in the
amendment's Owner scope too, but check-in itself doesn't exist yet in this codebase (Appendix
A / Chunk 4 territory) — there's nothing to gate yet; `Permissions.TicketCheckIn` exists in the
catalogue and `PermissionMatrix` already grants it to Supervisor, ready for whoever adds the
endpoint. Everything else — Trips, Schedules, FareRules, StaffAttendances, StaffSalaries,
cancellation/refund, commission/settlement/invoice/payout/wallet, operator integrations — is
exactly the "Owners of Chunks 3–10 must apply the permission map to every endpoint they add or
modify" language in the amendment: still running on the old broad check until whoever owns
that chunk touches it. This was a deliberate scope decision (get the foundation and the
highest-value, most-cited controllers right and verifiable, rather than mechanically edit 45
more controllers with no compiler in this environment to catch a mistake) — not an oversight.

### Chunk 6 follow-up: `PaymentsController.ConfirmCounterSale`

One gap in the list above turned out to matter for Chunk 6 specifically. The walk-in workflow
is really two steps against two different controllers — `BookingsController.Create` (which
the Chunk 2 sweep did cover: `Counter.Sell` + `CanUseCounter` against `dto.SalesCounterId`) and
`PaymentsController.ConfirmCounterSale` (the "cash collected, issue the tickets" step, which it
did not — still `CanManageOperatorAsync` only). A CounterStaff member assigned to only one of
an operator's counters could create a booking at their own counter but, because the confirm
step never checked which counter the booking belonged to, could also confirm — and so
attribute a cash sale to — any *other* booking already sitting at a different counter of the
same operator. Chunk 6 closes this the same way the create step already does: resolve the
actor, require `Counter.Sell`, then `actor.CanUseCounter(booking.SalesCounterId, ...)` against
the specific counter the booking was actually made at. See `PaymentsController.cs`'s own
comment on `ConfirmCounterSale` for the exact reasoning.

## Angular route-guard gaps

`role.guard.ts`'s `data.permissions` check is AND-only ("must hold every listed permission").
A few screens need OR semantics the current guard can't express (e.g. "can view finance data"
is `Finance.ReadPlatform` OR `Finance.ReadOwnOperator` depending on whether the session is
platform- or operator-scoped) — those screens (`wallets`, `settlements`, `invoices`, `payouts`
under Finance) were deliberately left without an added permission rather than gated on the
wrong thing. The route guard is a UX layer, not the security boundary; the real enforcement
for those screens is whatever finance controller backs them server-side (Chunk 7's job).
Similarly, Counter's `agents` and `complaints` children have no matching permission in the
fixed catalogue for any operator-scoped job role, so they're left ungated rather than locking
every operator's staff out of screens they currently use.

## Repo-hygiene note found along the way

`apps/api/.gitignore` (a nested file, separate from the root `.gitignore`) already ignored
`wwwroot/images/uploads/` — but the actual runtime upload path used by
`BusesController.UploadImage`/the operator logo upload is `wwwroot/images/` directly, not
`wwwroot/images/uploads/`. That path mismatch is almost certainly why the two bus/operator
photos ended up committed in the first place despite someone clearly having tried to prevent
it. Fixed via the root `.gitignore`'s new `apps/api/wwwroot/images/*` rule (with a `.gitkeep`
exception) rather than editing the nested file, to keep this change's diff to that file
minimal. The nested file's `wwwroot/images/uploads/` line is now redundant but harmless.
