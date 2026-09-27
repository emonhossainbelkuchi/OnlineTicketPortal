# TicketPortal — Nx Monorepo

One repo, three deployable apps, managed by [Nx](https://nx.dev). This
replaces the earlier plan of separate `ticketportal-frontend` /
`ticketportal-admin` repos — if you already pushed those, this supersedes
them.

## Layout

```
apps/
  frontend/   Angular 19 — Pieces 1-6 (customer portal, operator/counter/
              finance staff panels). Dev server: http://localhost:4200
  admin/      React 19 + Vite — Piece 7, Platform Admin Dashboard.
              Dev server: http://localhost:4300
  api/        ASP.NET Core Web API — the backend (imported via
              `git subtree`, squashed — see "Backend history" below).
libs/
  shared/
    models/          TypeScript interfaces/enums matching the real backend
                      DTOs. Both apps import from "@ticketportal-mono/models".
    design-tokens/    tokens.css (the whitish/banana-yellow palette) +
                      components.css (.tp-btn/.tp-card/.tp-pill classes).
                      Both apps import from
                      "@ticketportal-mono/design-tokens/...". Single source
                      of truth — change a color here once, both apps update.
```

## Running things

Everything goes through `nx`, regardless of which language/framework a
project uses:

```bash
npm install

npx nx serve frontend     # Angular dev server, :4200
npx nx serve admin        # React dev server, :4300
npx nx run api:restore    # dotnet restore (first time only)
npx nx run api:serve      # dotnet run
```

`npx nx run-many -t build` builds all three at once; `npx nx graph` shows
the dependency graph (both frontend apps depend on `shared-models` and
`design-tokens`).

### Backend: dotnet CLI required

`apps/api`'s Nx targets (`build`/`serve`/`test`/`restore`/`migrate`) are
thin wrappers (`nx:run-commands`) around the real `dotnet` CLI — Nx has no
native .NET builder, this just gives you one consistent command surface
across all three apps. **You need the .NET SDK installed locally** for
these to do anything; Nx itself doesn't provide it.

⚠️ I was not able to verify `apps/api` actually builds inside the sandbox
this monorepo was assembled in — there's no internet access to NuGet
there, so `dotnet restore` can't run. It's the same code your existing
backend repo already had (imported byte-for-byte via `git subtree`), so it
should build exactly as it did before — but run `npx nx run api:restore &&
npx nx run api:build` yourself as a first sanity check after pulling this.

### CORS — already fixed for both dev servers

The backend's `Cors:AllowedOrigins` (in `apps/api/appsettings.json`) now
allows both `localhost:4200` (Angular) and `localhost:4300` (React) — the
original backend only whitelisted 4200, which would have silently broken
every request from the admin app with a CORS error. If you change either
app's dev port, update this list too.

## Backend automated tests (Chunk 10)

`apps/api.tests` is a new sibling Nx app (`TicketPortal.Api.Tests.csproj`) with an
xUnit suite covering seat-hold concurrency/expiry, trip-state gating, ticket check-in
idempotency, finance-ledger and settlement formulas, and a sample of the RBAC
denied-case matrix -- all as real HTTP calls against the real app (`WebApplicationFactory
<Program>`) plus a fresh LocalDB database per test run.

```bash
npx nx run api.tests:restore   # first time only
npx nx run api.tests:test
```

Needs a reachable SQL Server LocalDB instance -- see `apps/api.tests/README.md` for
details, and `docs/FINAL_TEST_MATRIX.md` for exactly what is and isn't covered yet
(including an upfront disclosure that this suite has not been build-verified).
`docs/RBAC_MIGRATION_GAP_REPORT.md` and `docs/SECURITY_CHECKLIST.md` cover a significant
authorization gap this pass found across ~42 controllers -- read that before assuming
the RBAC work from earlier chunks is finished.

## Backend history

The backend was pulled in with `git subtree add --squash`, not a plain
copy — so `apps/api` carries one commit that represents the entire prior
`TicketPortal` backend history, rather than losing it outright, while
keeping this repo's own commit log manageable. If you need the backend's
full original commit-by-commit history, it's still intact in the original
`TicketPortal` repo — this doesn't delete or replace that.

## Git workflow (updated)

Same idea as before — `main` protected, work happens on `dev`, PRs before
merging — just one repo now instead of three:

- Branch names stay the same: `feature/p2-search`, `feature/p3-booking`,
  `feature/p4-operator`, `feature/p5-counter`, `feature/p6-finance`,
  `feature/p7-admin`, plus e.g. `feature/api-<whatever>` for backend work.
- Your changes are scoped by folder now, not by repo: Piece 2's PR touches
  `apps/frontend/src/app/features/search/**` and nothing else. Backend
  changes touch `apps/api/**` and nothing else. If a PR touches `libs/`,
  flag it — that's shared surface area across multiple pieces.
- `npx nx affected -t build` (or `-t test`) only rebuilds/retests projects
  actually touched by a given change — useful once you wire up CI, since a
  frontend-only PR won't waste time rebuilding the backend and vice versa.

## Editing shared code

- Need a new shared TypeScript type? Add it under
  `libs/shared/models/src/lib/`, export it from `index.ts`, both apps pick
  it up immediately via the `@ticketportal-mono/models` alias — no publish
  step, Nx resolves it straight from source.
- Need a new shared color/spacing value? Add it to
  `libs/shared/design-tokens/tokens.css`. Need a new shared component class
  (beyond button/card/pill)? Add it to `components.css` and use the same
  class name in both `apps/frontend` (an Angular component/directive
  applying that class) and `apps/admin` (a React component applying that
  class) — see `TpButtonDirective` / `<Button>` for the existing pattern.

See `apps/frontend`'s own `README-PIECE1.md` for everything specific to
the Angular app (AuthService, ApiService, guards, shared UI kit usage).
