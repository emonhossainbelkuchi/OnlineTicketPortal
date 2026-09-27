# TicketPortal.Api.Tests

Chunk 10's automated test suite for `apps/api`. Every test either:

- is a pure unit test with no DB (`Unit/`),
- is a pure source-text static check with no DB (`Architecture/`), or
- boots the **real** API (via `WebApplicationFactory<Program>`, i.e. your actual
  `Program.cs`) against a throwaway LocalDB database and talks to it over **real HTTP**,
  authenticating as one of the real seeded demo accounts (`Integration/`).

Nothing here invokes a controller method directly, hand-mints a JWT, or bypasses
`[Authorize]` — see `Infrastructure/TicketPortalWebApplicationFactory.cs` for why, and
`Infrastructure/AuthHelper.cs` for how login works.

## Requirements

- The same .NET SDK apps/api itself targets (.NET 10).
- A reachable SQL Server LocalDB instance: `(localdb)\MSSQLLocalDB`. On Windows this ships
  with Visual Studio / the `sqllocaldb` tool; on Linux/macOS/CI you'll need a real SQL Server
  instance instead — edit the connection string in
  `Infrastructure/TicketPortalWebApplicationFactory.cs` to point at it (same requirement
  `nx run api:migrate` already has).
- Internet access is **not** required at test-run time, but `dotnet restore` needs
  nuget.org once to pull down the packages listed in the `.csproj`.

## Running

```bash
cd apps/api.tests
dotnet restore
dotnet test
```

or, from the repo root, via Nx:

```bash
npx nx run api.tests:test
```

## What to expect the first time you run this

**This was written against your real source but has never been compiled or run** — the
environment it was written in had no .NET SDK and no nuget.org access (see
`docs/FINAL_TEST_MATRIX.md` for the full disclosure). Expect to spend a short debugging pass
fixing any build errors before the suite goes green; nothing here has been build-verified.

The first test that touches the shared `TicketPortalWebApplicationFactory` triggers a full
`dotnet` app startup: EF migrations + `DbSeeder` + the **full** `DemoDataSeeder` dataset
(four operators, dozens of trips/bookings/tickets across a full finance cycle) against a
brand-new database. That's a lot of work for a "first test", so don't be surprised if the
very first test in a run takes several seconds longer than the rest — every test class after
it shares the same already-seeded database (see `Infrastructure/SharedApiCollection.cs`).

Each full run creates one `TicketPortalTestDB_<guid>` LocalDB database and drops it again at
the end (best-effort — a crashed run may leave one behind; `sqllocaldb` can list/clean these
up manually if that ever piles up).

## Coverage

See `docs/FINAL_TEST_MATRIX.md` for what's covered here, what's covered elsewhere (e.g.
`TripSellability`'s own unit tests live in `Unit/`, not duplicated as integration tests), and
— just as important — what is **not yet covered** and why (payment-confirmation idempotency,
trip-cancellation cascade, Angular/React specs, Playwright e2e).
