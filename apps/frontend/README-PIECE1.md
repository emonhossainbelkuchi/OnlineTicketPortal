# TicketPortal Frontend — Piece 1: Core & Shared Foundation

This is the shared foundation the other 6 pieces build on top of. Read this
before you write your first line of feature code.

## Running it

This app now lives inside the TicketPortal Nx monorepo — `npm install` and
`ng`/`npm start` are run once from the **repo root**, not from inside
`apps/frontend`:

```bash
# from the repo root
npm install
npx nx serve frontend      # http://localhost:4200
```

Set the backend URL in `src/environments/environment.ts` (`apiBaseUrl`) to
match wherever your ASP.NET Core API is actually running — the default
(`https://localhost:54221/api`) matches this repo's `apps/api/Properties/launchSettings.json` — only change it if you edit that file too.

**Two things moved since the standalone-repo version of this doc:**
- Core models (`Trip`, `Booking`, `Payment`, etc.) now live in
  `libs/shared/models` and are imported via `@ticketportal-mono/models`
  instead of a local `core/models` folder — the React admin app
  (`apps/admin`) shares the exact same types.
- Design tokens (`--tp-*` CSS variables) and the `.tp-btn`/`.tp-card`/
  `.tp-pill` classes now live in `libs/shared/design-tokens` — same reason.
  See the root `README.md` for the full monorepo layout.

## What's already built for you

- **Design system** — `src/styles/_tokens.scss` (CSS variables: colors,
  spacing, radius, shadows) + `src/styles/_components.scss`. Never hardcode
  a hex color or px radius in a feature module — use the `--tp-*` variables.
- **`ApiService`** (`core/services/api.service.ts`) — `get/post/put/patch/delete`,
  auto-prefixes `environment.apiBaseUrl`. Use this instead of raw `HttpClient`.
- **`AuthService`** (`core/services/auth.service.ts`) — `login()`, `register()`,
  `currentUser()` signal, `isAuthenticated()` signal, `hasRole(...roles)`.
- **Interceptors** (wired globally, you don't touch these) — bearer token
  attached automatically, errors normalized + toasted automatically, 401
  logs you out and redirects to login automatically.
- **Guards** — `authGuard` (must be logged in), `roleGuard` (must have a
  specific role, set via route `data: { roles: [...] }`).
- **Shared UI kit** (`shared/ui`, barrel-exported from `shared/ui/index.ts`):
  `TpButtonDirective` (`button[tpButton]`), `TpCardComponent`,
  `TpStatusPillComponent`, `TpModalComponent`, `TpToastContainerComponent`
  (mounted once, don't add another), `TpSpinnerComponent`,
  `TpEmptyStateComponent`, `TpTabsComponent`, `TpTableComponent`. Each file
  has usage examples in its doc comment — read those before building your
  own version of something that already exists here.
- **Core models** — now `libs/shared/models` (import via
  `@ticketportal-mono/models`), not a local folder — TypeScript interfaces
  matching the real backend DTOs I read directly out of the repo: `Trip`,
  `TripSearchResult`, `SeatHold`, `Booking`, `Payment`, `BusOperator`, every
  enum from `ModelEnums.cs`, and `ApiError` (the normalized shape every
  failed request surfaces as). Shared with `apps/admin` (React) too.
- **App shell** — navbar (role-aware nav links), footer, global toast
  stack, top-loading bar — all mounted once in `layout/shell`. You never
  touch this from a feature module.
- **Placeholder routes** for every other piece, already wired into
  `app.routes.ts` with the right guard/role — you just replace the
  placeholder component with your real screens.

## Important: the real roles

The backend seeds exactly 4 roles (`Data/DbSeeder.cs`): **Admin**, **Staff**,
**Operator**, **Customer**. There is no separate `CounterStaff` or
`FinanceStaff` role — Piece 5 (Counter) and Piece 6 (Finance) both gate on
`Staff`. Don't invent role strings that don't exist in the JWT.

## Adding your feature module

Each piece already has a folder under `src/app/features/<yours>/` with a
placeholder route file (`*.routes.ts`) wired into `app.routes.ts` with the
correct guard. To build your piece:

1. Delete the placeholder component in your folder (or keep it as a
   landing page and add sub-routes next to it).
2. Add your real components/services under your feature folder. Split into
   subfolders as it grows (e.g. `features/search/{home,results,trip-details}`).
3. Use `ApiService`, `AuthService`, and the shared UI kit — don't
   reimplement auth, HTTP wrapping, or basic components.
4. If you need a model that isn't in `libs/shared/models` yet, check the
   backend DTO first and match its field names/casing exactly, then add it
   there (not inside your feature folder) so both `apps/frontend` and
   `apps/admin` can reuse it.

## Git workflow

- Branch off `dev`: `feature/p2-search`, `feature/p3-booking`, etc.
- Small commits, PR into `dev`, at least one reviewer before merging.
- If you touch a `core/` or `shared/` file and it's not something everyone
  agreed to change, flag it in the PR — those files are shared surface
  area, breaking them breaks 5 other people's work.

## Error handling — you don't need to write your own

Every failed API call already shows a toast automatically (`ErrorInterceptor`).
If you need to react to a specific failure (e.g. highlight an invalid form
field), subscribe to the error and read the normalized `ApiError`:

```ts
this.api.post<Booking>('bookings', request).subscribe({
  next: (booking) => { /* ... */ },
  error: (err: ApiError) => {
    // err.message is always a clean string
    // err.fieldErrors is set for 400 validation failures, keyed by field name
  },
});
```

You do **not** need to call `toast.error(...)` yourself for a failed HTTP
call — that already happened. Only call `toast.success()` / `toast.info()`
for your own flows.
