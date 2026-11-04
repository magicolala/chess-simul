# Playwright — smoke CI and full staging flows

## Why the E2E job was taking hours

The historic suite assumes UI flows that no longer exist (OTP `1234`, name
field at registration, a "Nouvelle partie" button on a protected dashboard).
It also runs on five browser profiles with retries, one worker and previously
had no suite-level timeout. As a result, a failing setup can stall GitHub Actions
long after lint, unit tests and the application build complete.

**The smoke suite is not a replacement for authenticated integration tests.**
It checks real public Angular navigation and form behaviour, and its CI status
must never be represented as complete multiplayer/staging coverage.

## On every PR: public smoke

`npm run test:e2e --workspace=web`

When `PLAYWRIGHT_SUITE` is unset (or `smoke`), Playwright selects only
`e2e/*.smoke.spec.ts` on Chromium desktop and mobile (Pixel 5). Currently:
- public landing renders and routes to /login;
- /register form validates email/password and navigates to /login, without a
  write to Supabase;
- the public /memory mode starts a local solo board;
- protected /dashboard redirects unauthenticated visitors to /login.

Limits: 8 minutes global, 25 seconds per test, no automatic retries in PR CI,
2 workers; GitHub E2E job limited to 15 minutes and installs Chromium only.
Failure artifacts (HTML report, test-results, traces, screenshots) are uploaded.
`npx playwright test --config playwright.config.ts --list` displays exactly
which tests CI will run.

## Authenticated staging suite (issue #62)

A separate, opt-in Playwright suite runs **real** sign-in flows against an
independent Supabase test project:

```sh
PLAYWRIGHT_SUITE=staging npm run test:e2e --workspace=web
```

It uses `e2e/auth.staging.spec.ts` with two accounts provisioned through
`auth.admin.createUser` **only in Node test fixtures**, not inside the
browser bundle. Both users are deleted in a `finally` cleanup step.
The tests verify the actual /login → /settings flow, guarded /dashboard,
session persistence and isolation between separate browser contexts.

The existing Supabase project `kjgcgnqeyxzivilkiruz` has been confirmed by the
owner as **staging only**, with old test data and no active users. The fixture
explicitly allowlists **only this exact project ref** and refuses any other
Supabase project. Never assume another project's safety without review.

Required environment variables, set in a trusted terminal or encrypted CI
secrets (never commit the keys):

- `PLAYWRIGHT_SUITE=staging`
- `PLAYWRIGHT_STAGING_CONFIRM=I_ACCEPT_TEST_DATA_CHANGES`
- `PLAYWRIGHT_TEST_SUPABASE_URL`: `https://kjgcgnqeyxzivilkiruz.supabase.co`.
- `PLAYWRIGHT_TEST_SUPABASE_REF`: `kjgcgnqeyxzivilkiruz`, matching the URL.
- `PLAYWRIGHT_TEST_SERVICE_ROLE_KEY`: staging **secret**, used only by
  Playwright's Node process. Never expose it in `environment.ts`, a build,
  browser page, public GitHub output or screenshot.
- When Angular is started locally by Playwright, `SUPABASE_URL` and
  `SUPABASE_URL_DEV` must both equal the test URL and the corresponding
  `SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY_DEV` must both point to the
  test project's publishable/anon key.

A deployed frontend is **not supported** for this suite yet: the fixture
requires local Angular with `SUPABASE_URL` and `SUPABASE_URL_DEV` both equal
to the approved staging URL. This prevents tests from accidentally contacting
a frontend compiled against a different Supabase instance.

Without these explicit settings, `PLAYWRIGHT_SUITE=staging` **fails
closed** instead of silently running against production.
The default `smoke` suite never provisions accounts.
`--list` discovery is safe and performs no account creation.

The staging Auth tests are scaffolding until the approved staging URL and
keys are configured **in the local test environment** and the integration
tests actually pass. The legacy `full`
suite continues to need migration and validation, including local play,
round-robin, Hydra, Stockfish and accessibility.

## Full E2E suite — manual with a dedicated staging backend

These test files remain in the repository; they are not skipped, deleted or
silently considered successful. Run the full suite explicitly using the flag:

macOS/Linux:
```sh
PLAYWRIGHT_SUITE=full npm run test:e2e --workspace=web
```

Windows PowerShell:
```powershell
$env:PLAYWRIGHT_SUITE = "full"
npm run test:e2e --workspace=web
Remove-Item Env:PLAYWRIGHT_SUITE
```

For a deployed test frontend, you may set `PLAYWRIGHT_BASE_URL`; otherwise the
config starts the local Angular dev server at http://localhost:3000.

**Never run tests that sign up users or create sessions against production.**
Supply `SUPABASE_URL_DEV`, `SUPABASE_ANON_KEY_DEV` and other necessary values
pointing at an *isolated test project* when serving Angular locally, or use a
deployed staging frontend configured to access staging. Do not version any
secrets or use the service-role key in browser tests.

The full suite retains its five profiles (Chromium, Firefox, WebKit, mobile
Chrome and mobile Safari), but has a 45-minute global cap and one CI retry.
It still contains known stale assumptions and is **not currently green**.
Before enabling it as a required gate, update:
- `auth.spec.ts`: use the real Supabase registration/login flow, no fake OTP,
  no imaginary name field, only test users in staging;
- `local-game.spec.ts`: stop relying on the obsolete registration helper;
- `round-robin.spec.ts`: real session creation and invite workflows with
  two isolated authenticated contexts;
- `accessibility.spec.ts`: align with AuthGuard and correct routed pages;
- `visual-regression.spec.ts`: stabilize snapshots per browser/platform and
  ensure appropriate authenticated fixtures;
- Stockfish suites: avoid timing assertions tied to CI machine speed and
  verify worker/WASM availability.

### Policy

- A green **E2E Smoke** job confirms only public browser smoke.
- A full multiplayer release requires staged integration tests for Auth,
  matchmaking, simultaneous play, moves, clocks, Realtime and Hydra.
- Do not promote a draft PR on smoke results alone.
- Avoid `test.skip()`, `|| true` or removing failure assertions just to
  make CI green. Fix tests against product behaviour or genuine defects.
