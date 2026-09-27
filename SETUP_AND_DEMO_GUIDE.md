# TicketPortal — Setup & Demo Guide

Replaces `RUN_AND_LOGIN_GUIDE.md` (merged into this file). See `DEMO_ACCOUNTS.md` for the full,
role-by-role account list — this guide only repeats the handful needed to get running.

## Prerequisites
- .NET 10 SDK, SQL Server LocalDB (installed with Visual Studio), Node 22+, `npm ci` once in this folder.
- Trust the HTTPS dev certificate once: `dotnet dev-certs https --trust`

## First-time secrets setup (RBAC Amendment v3 / Chunk 1)

`apps/api/appsettings.json` no longer carries a working JWT signing key — that was a committed
placeholder, which is exactly the kind of secret a public repo should never contain. Development
still works out of the box: `apps/api/appsettings.Development.json` (committed — its key is a
clearly-labeled, non-secret **development-only** value, never used outside a local machine)
supplies a working key so a fresh clone runs with zero extra setup.

For anything other than Development — a shared staging environment, Production, or a grader
running the API with `ASPNETCORE_ENVIRONMENT` set to something else — `Program.cs` now fails
fast at startup if `JWT:SigningKey` is missing, still says `REPLACE_ME`, or is shorter than 32
characters, rather than silently issuing tokens signed with a key everyone can read on GitHub.
Supply a real one via either:

```bash
# .NET user-secrets (recommended for a real local non-Development run)
dotnet user-secrets set "JWT:SigningKey" "<a real, random, 32+ character string>" --project apps/api

# or an environment variable (what a real deployment should use)
export JWT__SigningKey="<a real, random, 32+ character string>"
```

The same applies to any SMTP password or payment/ERP integration key you configure — set them
via user-secrets/environment, never by editing `appsettings.json` directly.

## Start (three terminals)
| App | Command | URL |
|---|---|---|
| API | `npx nx run api:serve` | https://localhost:54221/swagger |
| Customer / staff portal (Angular) | `npx nx serve frontend` | http://localhost:4200 |
| Admin (React) | `npx nx serve admin` | http://localhost:4300 (management console at http://localhost:4300/admin) |

On first start the API creates the `TicketPortalDB` LocalDB database, applies the migrations, and
seeds demo data (operators, buses, trips, terminals, payment providers, staff, counter
assignments) plus the accounts in `DEMO_ACCOUNTS.md`.

**Gotcha:** double check `Initial Catalog` in your `appsettings.Development.json` says
`TicketPortalDB`, not `TicketPortalDB1` or another stale name from an earlier local copy — a
mismatched name means you're pointed at an empty/different database and nothing above will look
seeded.

The API repairs the `admin` account **every time it starts in Development** (unlocks it, restores
the role, resets the password to `Admin@12345`) and prints one line saying what it did, e.g.
`Bootstrap admin 'admin' was repaired (cleared login lockout, reset password ...)`.
In Production it never touches an existing admin — change the password after first login.

## Resetting the demo database

`scripts/reset-demo-db.ps1` (Windows) / `scripts/reset-demo-db.sh` (macOS/Linux) drop and
recreate the LocalDB database so you get back to a clean, freshly-seeded state. Both scripts:
- only run against a **LocalDB** connection string (refuse anything else, so this can never be
  pointed at a shared/real database by mistake), and
- refuse to run when `ASPNETCORE_ENVIRONMENT` resolves to anything other than `Development`.

```bash
# Windows (PowerShell)
./scripts/reset-demo-db.ps1

# macOS/Linux
./scripts/reset-demo-db.sh
```

Then start the API again — it recreates and reseeds automatically.

## "I can't log in to the admin panel"
The admin login now says why. Match the message:

| You see | Cause | Fix |
|---|---|---|
| `Cannot reach the API at https://localhost:54221/api ...` | API not running, wrong port, or untrusted dev certificate | Start the API; open the Swagger URL once and accept/trust the cert (`dotnet dev-certs https --trust`); check `VITE_API_BASE_URL` in `apps/admin/.env.development` |
| `Invalid username or password` | Stale/changed admin row in an old database | Restart the API (it repairs the row). Still failing? Read the API console for a line beginning `Bootstrap admin` |
| `...temporarily locked...` | 5 wrong attempts | Restart the API (clears the lockout) or wait 15 min |
| `...not a platform Admin` | Signed in with a customer/staff account | Use `admin`, or the Angular portal for other roles |
| Console shows `Bootstrap admin ... could NOT be created ... e-mail already belongs to 'xyz'` | Another user already owns `admin@ticketportal.local` | Log in as `xyz`, or use a fresh database |
| Startup throws about `JWT:SigningKey` | Running with `ASPNETCORE_ENVIRONMENT` other than `Development` and no real signing key configured | See "First-time secrets setup" above |

## "Hold Seats & Continue" fails
If it says *"Could not create the seat hold — one of the referenced records may no longer exist"*
or *"Your login belongs to an account that no longer exists"*: your browser still holds a login
from **before the database was re-created** (a new database = new user ids). Log out and log in
again. The current API returns 401 for such tokens, so the app sends you to the login page and
back to the same seat map by itself.

## What is where
- **Angular portal (4200):** search trips, seat map + 3–5 min seat hold, checkout/payment, My
  Bookings, My Tickets (QR + PDF), Complaints, wallet/cancellations, Browse Buses (`/buses`),
  Verify Ticket, plus Operator / Counter / Finance panels — now gated by job-role permission, not
  just "logged in as Staff" (see `ROLE_PERMISSION_MATRIX.md`).
- **Admin (4300):** users & roles, operators, and section pages that lead into the Management
  Console (`/admin`): dashboard and CRUD for the API's resources (audit/activity logs,
  integrations & mappings, coupons/offers/banners, commission rules, settlements/payouts/ledgers,
  payment providers/methods, terminals, routes, trips, schedules ...).
- Seat map: the coach is drawn from above (door/driver at the top, rows down, aisle in the
  middle, window seats marked, Lower/Upper deck tabs for double-deckers) using each seat's
  row/column from the API.
- Times: the API sends UTC timestamps without a `Z`; the Angular app adds it
  (`utc-dates.interceptor.ts`), so trip times display in the viewer's timezone (Dhaka = UTC+6).

## Smoke test (10 minutes)
1. Admin login → the landing page shows shortcut cards; click Management Console → the dashboard
   loads and the Buses / Trips / Terminals lists load.
2. Angular: log in as `rahim.uddin` → search Dhaka → Chattogram → pick a trip → select seats
   (hold timer starts) → pay. My Bookings → Tickets: the new ticket appears with a QR and a
   working PDF download.
3. Log in as `selina.counter.gl` (Green Line, Gabtoli counter) → Counter Desk → Walk-in Booking
   works. Try the same booking through `farida.counter.gl`'s login but targeting Selina's
   counter — it's refused (RBAC Amendment v3's assigned-counter check).
4. Log in as `delwar.supervisor.sho` → Counter Desk → Setup and Staff HR are unreachable
   (redirected to Not Authorized) — Supervisor has neither `Counter.Configure` nor `Staff.Read`.
5. Let a seat hold expire (5 min) and confirm the seats free up again.

## Deploying
- Serve `apps/admin` build output with rewrites `/admin/*` → `/console/index.html` and everything
  else → `/index.html`.
- Set real `apiBaseUrl` (Angular `environment.prod.ts`), `VITE_API_BASE_URL` (admin
  `.env.production`), the API's CORS origins, and `JWT:SigningKey` (see "First-time secrets
  setup" — Production will refuse to start without it).
