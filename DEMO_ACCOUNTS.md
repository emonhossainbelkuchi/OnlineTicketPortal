# TicketPortal — Demo Accounts

Every account below is seeded automatically by `DbSeeder`/`DemoDataSeeder` when the API starts
against an empty database (see `SETUP_AND_DEMO_GUIDE.md`). **All credentials on this page are
demo-only** — they exist purely so a reviewer/teammate can log in and see every role's view of
the product without being handed a real password out of band. Never reuse them outside a local
demo database, and never seed this data against anything internet-reachable.

Since RBAC Amendment v3, "Role (Identity)" (Admin/Staff/Customer — what's in the JWT) and "Job
role" (the `StaffRole` on a Staff account's `StaffProfile` — Manager, CounterStaff, Supervisor,
etc.) are two different things. The Identity role decides which *areas* of the API a login can
reach at all; the job role decides *what it can actually do inside them*, resolved fresh on
every request by `CurrentActorService` — see `ROLE_PERMISSION_MATRIX.md` for the full mapping.

## Platform (Admin / Staff, no operator)

| Username | Password | Identity role | Job role | Demonstrates |
| --- | --- | --- | --- | --- |
| `admin` | `Admin@12345` | Admin | — (Identity Admin, not a StaffProfile) | Full platform access — React admin console + every API endpoint. The only "Admin" login; never a StaffProfile.Role value (see `PermissionMatrix.RetiredJobRoles`). |
| `nusrat.finance` | `Demo@12345` | Staff | Finance (platform) | Finance panel — reconciliation, settlement approval, payout processing. **Cannot** change commission/tax rules (`Finance.Configure` is Admin-only). |
| `tanvir.ops` | `Demo@12345` | Staff | Manager (platform) | Cross-operator approvals — fleet/trip oversight, cancellation approval, complaints, reports. **Cannot** assign Identity roles or touch finance configuration/payouts. |
| `rezaul.support` | `Demo@12345` | Staff | **Support** (platform) | Customer/booking lookup and complaints only — deliberately narrower than `tanvir.ops`. Corrected by RBAC Amendment v3: previously mis-seeded as `Manager`, which silently granted it fleet/trip/cancellation-approval permissions it was never meant to have. |

## Green Line Paribahan (`PlatformManaged` — full-platform operator)

| Username | Password | Job role | Demonstrates |
| --- | --- | --- | --- |
| `abdul.karim.gl` | `Demo@12345` | Manager (operator) | Operator panel — own fleet/network/fares/trips/crew/counters/staff, read-only earnings. **Cannot** touch another operator, or approve/process a payout. |
| `selina.counter.gl` | `Demo@12345` | CounterStaff | Walk-in cash sale at **Gabtoli counter only** — has an active `StaffSalesCounterAssignment` to Gabtoli and no other counter. Use this account (against Kalyanpur) to demonstrate the RBAC Amendment v3 fix: a sale attempt against `farida.counter.gl`'s counter is refused (403). |
| `farida.counter.gl` | `Demo@12345` | CounterStaff | Walk-in cash sale at **Kalyanpur counter only** (the counterpart to `selina.counter.gl` above). |

## Ena Transport (`PlatformManaged`)

| Username | Password | Job role | Demonstrates |
| --- | --- | --- | --- |
| `nasima.counter.ena` | `Demo@12345` | CounterStaff | Assigned to Ena's Gabtoli counter. Counter-heavy settlement scenario (this operator owes the platform, not the other way round). |

## Shohagh Paribahan (`Hybrid` inventory mode)

| Username | Password | Job role | Demonstrates |
| --- | --- | --- | --- |
| `rina.counter.sho` | `Demo@12345` | CounterStaff | Assigned to Shohagh's Kalyanpur counter. |
| `delwar.supervisor.sho` | `Demo@12345` | Supervisor | Manifest/check-in view only — **cannot** create a walk-in sale, edit fleet, or view a settlement (has none of `Counter.Sell`, `Fleet.Manage`, or `Finance.*`). |

## Hanif Enterprise (`ExternalApiManaged` — API-connected operator)

| Username | Password | Job role | Demonstrates |
| --- | --- | --- | --- |
| `iqbal.manager.han` | `Demo@12345` | Manager (operator) | Back-office only — this operator's own ERP is the source of truth for counter/cash sales, so there's no counter-clerk login here at all (mock-ERP integration flow instead). |

## Customers

`rahim.uddin`, `karim.sheikh`, `fatema.begum`, `nasrin.sultana`, `jashim.uddin`, `shirin.akter`,
`mitu.rahman` — all `Customer` role, password `Demo@12345`. Cover booking, tickets, wallet, and
cancellation flows from the buyer's side.

## Driver/Helper accounts

Drivers and helpers (e.g. `hasan.driver.gl`, `jamal.helper.gl`) exist as `StaffProfile` records
for scheduling/HR data (licenses, attendance, salary), but have no crew-facing login screens in
this codebase yet — `PermissionMatrix.OperatorScope[StaffRole.Driver/Helper]` deliberately grants
them nothing until that's a real feature.
