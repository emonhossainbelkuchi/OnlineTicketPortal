# Security Checklist — Chunk 10

Status of each item as of this pass.

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | JWT signing key never committed; fails fast outside Development without one | ✅ Already done (earlier chunk) | `Program.cs` line 64 area: `if (!builder.Environment.IsDevelopment())` guards a real-key requirement; Development uses a clearly-labeled non-secret key from `appsettings.Development.json`. |
| 2 | Swagger UI and demo/database seeding restricted to Development | ✅ Already done (earlier chunk) | Both gated behind `app.Environment.IsDevelopment()` in `Program.cs`. |
| 3a | Raw exception text (`ex.Message`, `ex.InnerException`) never returned outside Development | ✅ Fixed this pass | `TripsController.Create` and `TripsController.Update` (3 call sites) now gate `detail`/`innerDetail` behind `env.IsDevelopment()`, returning `null` otherwise. `env` (`IWebHostEnvironment`) was already injected into the controller — no new dependency needed. |
| 3b | `GET /api/Trips` (anonymous, unbounded) restricted or paginated | ✅ Fixed this pass | Capped via a new `Trips:MaxAnonymousListSize` config key (default 500, clamped 1–2000), ordered by `DepartureTimeUtc` descending. Deliberately did **not** add pagination query params or flip the endpoint to `[Authorize]` — see the fix's own code comment for why (avoids an untested breaking change to whatever Angular/React screens already call this endpoint expecting a plain array). This is a safety net, not a UX fix; `Search` remains the intended way to browse trips with a filter. |
| 3c | File upload validation (type/size/name) on image uploads | ✅ Already done (earlier chunk) | `BusesController.UploadImage` calls `FileUploadValidation.Validate(file)`. |
| 3d | CORS restricted to a configured allow-list, not `AllowAnyOrigin` | ✅ Already done (earlier chunk) | Confirmed in `Program.cs`. |
| 3e | Payment gateway calls never reach a real provider outside an explicit live-mode flag | ✅ Already done (earlier chunk) | `Payments:DemoMode` in `appsettings.json`; the test suite (`apps/api.tests`) relies on this staying `true` and documents that reliance. |
| 4 | No broad `IsInRole("Staff")`/`IsInRole("Operator")` authorization paths remain in business controllers | ❌ **Not done — 42 controller files still have this pattern (down from 47 after Chunk 4; Chunk 7's finance-permissions work fixed 5, zero regressions)** | This is the big one. See `docs/RBAC_MIGRATION_GAP_REPORT.md` for the full list, history, and severity notes, and `apps/api.tests/Architecture/NoBroadRoleChecksTests.cs` for the automated gate that now tracks it as a baseline. This is core Chunk 2 scope that was not actually finished. |
| 5 | No endpoint relies only on an Angular/React guard for authorization (server-side check required) | ⚠️ Not independently verified this pass | Not audited — would require reading every controller alongside its corresponding frontend route guard, which this pass didn't have time for. The 45-controller gap above is a reasonable proxy (a controller with no permission check at all can't be relying on one), but a controller that HAS a permission check could still have a frontend guard for a DIFFERENT, unprotected route — that class of gap wasn't checked. |
| 6 | No empty-success response masks an authorization denial (e.g. returning `200 OK` with an empty list instead of `403`) | ⚠️ Not independently verified this pass | Same reasoning as #5 — this needs a per-endpoint review, not a mechanical scan. Worth specifically checking the `GetAll`-style list endpoints in the 42 unmigrated controllers once they're being migrated anyway. |
| 7 | The authorization test suite runs in CI | ⚠️ Test suite exists but has no CI wiring yet | `apps/api.tests` was created this pass (see `docs/FINAL_TEST_MATRIX.md`) but no `.github/workflows/*.yml` change was made to run it. There IS a `.github/workflows` directory already in this repo — wiring `dotnet test apps/api.tests` into whatever runs there is a small, safe follow-up once the test project itself has been confirmed to build (see the compile-risk disclosure in `apps/api.tests/README.md`). Not done here specifically to avoid changing CI behavior around a test suite that hasn't been build-verified yet. |

## Summary

Of the checklist items that are pure code fixes (1, 2, 3a–3e), everything is now done. The
two structural items (4, and by extension 5/6 which depend on it) are **not** done and are
larger than a Chunk 10 task — they're the remainder of Chunk 2. Item 7 is blocked on the new
test suite being confirmed to actually build, which needs a real `dotnet` environment this
pass didn't have.
