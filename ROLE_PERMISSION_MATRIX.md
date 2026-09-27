# Role → Permission Matrix

The authoritative version is `apps/api/Authorization/PermissionMatrix.cs` — this is that table
in prose form, for anyone reviewing without reading C#. See `AUTHORIZATION_DECISIONS.md` for
why a few rows don't match the RBAC Amendment v3 prose word-for-word.

`Identity Admin` (the `admin` login) is not a row below — it implicitly holds every permission
in every scope. Everyone else's permissions come entirely from their `StaffProfile.Role`
(job role) plus whether `StaffProfile.BusOperatorId` is null (platform-wide) or set
(scoped to exactly that operator).

## Platform-scoped (`BusOperatorId == null`)

| Job role | Permissions | Notably NOT granted |
| --- | --- | --- |
| **Manager** | `Fleet.Read`, `Network.Read`, `Trips.Read`, `Trips.Manage`, `Trips.Cancel`, `Crew.Manage`, `Cancellation.Approve`, `Complaints.Read`, `Complaints.Manage`, `Reports.Read`, `Booking.Read`, `Staff.Read` | `PlatformUsers.Manage`, `PlatformConfiguration.Manage`, `Finance.Configure`, `Payout.Process`, `Settlement.Approve` |
| **Finance** | `Finance.ReadPlatform`, `Finance.Reconcile`, `Settlement.Approve`, `Payout.Process` | `Finance.Configure`, anything fleet/trip/counter/HR |
| **Support** | `Booking.Read`, `Complaints.Read`, `Complaints.Manage` | `Cancellation.Approve`, finance, fleet/trip/counter/HR |

## Operator-scoped (`BusOperatorId == <that operator>`)

| Job role | Permissions | Notably NOT granted |
| --- | --- | --- |
| **Manager / Operator / BusOwner** ("Operator Manager or back-office") | `Fleet.Read`, `Fleet.Manage`, `Network.Read`, `Network.Manage`, `FarePolicy.Manage`, `Trips.Read`, `Trips.Manage`, `Trips.Cancel`, `Crew.Manage`, `Counter.Read`, `Counter.Configure`, `Counter.Sell`, `Counter.Cancel`, `Staff.Read`, `Staff.Manage`, `Booking.Read`, `Reports.Read`, `Finance.ReadOwnOperator` | Another operator's data, `PlatformConfiguration.Manage`, `Finance.Configure`, `Settlement.Approve`, `Payout.Process`, `Integrations.Manage` |
| **CounterStaff** | `Counter.Read`, `Counter.Sell`, `Counter.Cancel`, `Booking.Read` — and `Counter.Sell`/`Counter.Cancel` only actually work at a counter they hold an **active `StaffSalesCounterAssignment`** for (see below) | `Counter.Configure`, `Staff.*`, `Fleet.*`, `Finance.*`, any counter they aren't assigned to |
| **Supervisor** | `Manifest.Read`, `Ticket.CheckIn`, `Trips.Read` | `Counter.Sell`, `Counter.Configure`, `Fleet.*`, `Staff.*`, `Finance.*` |
| **Finance** | `Finance.ReadOwnOperator` | `Finance.Configure`, `Settlement.Approve`, `Payout.Process`, another operator's data |
| **Driver / Helper** | *(nothing yet — no crew-login feature exists)* | everything |

## Counter assignment scoping (on top of the table above)

`Counter.Sell` and `Counter.Cancel` in the CounterStaff row are necessary but not sufficient.
`CurrentActor.CanUseCounter` additionally requires an **active `StaffSalesCounterAssignment`**
row for that exact `SalesCounter` — a CounterStaff member of Green Line assigned only to the
Gabtoli counter cannot sell from the Kalyanpur counter even though both belong to the same
operator they work for. An Operator Manager/BusOwner/BusOwner-tier account is **not** subject
to this extra check — they may use any counter belonging to their own operator.

## Retired / rejected values

- **`StaffProfile.Role` (job role) `Admin` and `SuperAdmin`** are rejected outright by
  `AdminController.CreateStaff` and `StaffProfilesController` (Create/Update) for new/edited
  data, and resolve to zero permissions if they somehow exist on old data. They must never be
  read as implying the Identity `Admin` login role.
- **Identity login role `Operator`** is rejected by `AdminController` (`AssignRole` and
  `CreateStaff`) going forward. No demo account currently uses it. An operator's own employee
  is always a `Staff` login + the correct `StaffProfile.Role` job title — never a separate
  `Operator` Identity role.
