# Issue #55 — atomic move submission (staging verification)

**Environment clarification (2026-11-04):** The project owner confirmed
`kjgcgnqeyxzivilkiruz` is a staging/development instance, **not production**.
Its 7 Auth users and 24 games are old test data. No production Supabase
project currently exists for Chess Simul.

### Verified staging rollout

- Migration `20261104161355_atomic_move_submission` **applied** to the existing
  staging project via Supabase. Both service-only RPCs are present; the
  `timeout` constraint is active. EXECUTE checks: `anon=false`,
  `authenticated=false`, `service_role=true` for both RPCs.
- Edge Functions deployed to staging: `submit-move` **v11** (previous v10)
  and the new `check-timeout` **v1**. Both perform their own user JWT
  verification because the prior function had `verify_jwt=false`; enable
  gateway JWT verification in a separate reviewed security step.
- Live PostgreSQL smoke successfully tested a legal move, stale replay
  rejection, clock expiry and timeout winner. All created test rows were
  rolled back automatically in a nested SQL transaction.
- Post-test counts: **7 Auth users, 5 profiles, 24 games, 0 moves**.
  No historic games or users were altered by the smoke. It is expected that
  the pre-existing `moves` table is still empty because no game was played
  through an authenticated HTTP request.
- Historical SQL fixture CI, Angular checks and browser smoke passed on
  the previous branch revision; re-check the final PR head before merging.
- **Still unverified:** actual HTTP/Auth flow with two test users,
  PostgREST caching and `games UPDATE`/`moves INSERT` Realtime event delivery.
  No frontend release or branch fusion has occurred.

## What changes

- `persist_validated_move`: service-role-only, `SECURITY INVOKER` PostgreSQL
  RPC. Locks `games` using `SELECT ... FOR UPDATE`, verifies the expected
  FEN, ply, turn and `updated_at`, updates the game and inserts one row into
  `moves` within the **same** Postgres transaction. Existing trigger
  `trg_moves_update_game` still executes in that transaction; do not install
  duplicate triggers. A conflicting request gets a conflict response.
- `finalize_game_timeout`: database-clock timeout arbitration under the same
  row lock and game-version check. Records the winner and new terminal
  `timeout` status without inserting a move.
- Clock protocol: `white` / `black` are milliseconds and `unit: 'ms'` is
  explicitly written for new games. `initialSeconds` and `incrementSeconds`
  remain seconds-based metadata. Old online/Hydra rows with
  `initialSeconds` but no `unit` are read as seconds; old simuls without that
  metadata were already milliseconds.
- `submit-move` validates the authenticated caller and legal move via chess.js
  before calling the transactional RPC, and returns a retryable conflict when
  the state changes. It does not accept a user ID, FEN or clock from the browser.
- `check-timeout` now calls the atomic RPC. `resign-game` refuses to overwrite
  an already-ended game. Angular displays legacy seconds clocks consistently.
- Draws from stalemate, insufficient material and the 50-move rule are
  detected from the FEN + move. Threefold repetition is now evaluated by
  replaying **verified complete stored moves** from the standard starting
  position before the proposed move. Missing / truncated / inconsistent
  histories fall back to FEN-only validation instead of fabricating a draw.
  Historical games whose moves were never stored cannot be reconstructed.

## Disposable PostgreSQL integration gate

The draft PR now includes
`.github/workflows/game-rpc-postgres.yml`. It boots a temporary
PostgreSQL 17 container, recreates the existing production move trigger from
`supabase/tests/sql/atomic_move_fixture.sql`, applies the proposed migration
and executes `supabase/tests/sql/atomic_move_assertions.sql`.

It checks permissions, persistence of the game and move in one transaction,
stale request rejection, invalid actor rejection, clock increment and flag
fall. **All assertions passed** in GitHub Actions after correcting the SQL
parser error revealed by the first run. This verifies a disposable schema,
not live Supabase Auth / RLS / Realtime behaviour.

The shared-history helper also has Vitest coverage and the staging Deno
integration test now includes the sequence
`Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8` for threefold repetition.
The Deno integration test has **not** run against a real Supabase staging
project yet.

**Do not** run SQL fixtures against production: they create dummy roles and
tables. The workflow deliberately uses an isolated database container.

## Test instructions (staging only)

1. Use the **existing owner-confirmed staging project** `kjgcgnqeyxzivilkiruz`.
   A second paid project is not required. The migration and `submit-move` /
   `check-timeout` functions have already been deployed there. Preserve
   historic test rows and create uniquely named temporary test accounts.
2. Confirm `get_advisors`, RLS policies and API execution grants. Anonymous and
   authenticated users **must not** have EXECUTE on the two new RPCs;
   `service_role` needs EXECUTE. Do not expose service role secrets to Angular.
3. Run the stateless clock helper suite through the existing Vitest workspace:
   `npm run test:unit -w web -- --run src/services/game-clock.spec.ts`.
   A Deno helper test also exists in `supabase/tests/game_clock_test.ts` for
   staging Deno setups; the default CI uses Vitest to avoid loading Angular's
   CSS entry point as a Deno module.
4. Set `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, and
   `SUPABASE_TEST_SERVICE_ROLE_KEY` only in the test environment, then run:
   `deno test --allow-net --allow-env supabase/tests/integration/moves.test.ts`.
   Tests create and clean up their own users and games. Run them **only
   against the explicitly approved Chess Simul staging ref**; verify cleanup
   and never reuse / delete the older test accounts and games.
5. Verify Realtime `games UPDATE` and `moves INSERT` with two clients, and
   verify simultaneous moves, clock increment, timeout, checkmate, draw,
   promotion, illegal move, off-turn move and retry/reconnect behavior.
6. Review the Angular build, unit suite and Playwright results. Do not accept
   an existing failure on `main` as proof this PR is correct.

## Deployment sequence, after validation

1. **Done:** Record old status check / trigger, Edge versions, row counts and
   migration SQL in the issue; no historical rows are modified by this migration.
2. **Done:** Apply `20261104161355_atomic_move_submission.sql` on staging,
   matching the actual version in `supabase_migrations.schema_migrations`.
   Validate RPC grants and the existing trigger.
3. **Partly done:** `submit-move` v11 and `check-timeout` v1 are deployed.
   `resign-game`, `join-queue` and `accept-invite` have NOT yet been
   updated to this PR's source on staging; `process-hydra-queue` is not
   among the currently deployed functions.
4. **Next:** Run real two-user HTTP/Auth/Realtime tests and review all related
   functions. The connected staging instance is not public production.
5. **Rollback:** redeploy the prior `submit-move` v10 source if needed.
   Never delete/reinitialize `games`/`moves`; a DB rollback must
   account for any games with new terminal status `timeout`.

## Remaining constraints

- The migration and two Edge Functions have been **applied to staging**,
  which the owner explicitly confirmed is not production; the Neon fallback
  was not modified.
- Do not confuse a successful deployment with full authenticated E2E:
  the Edge Function HTTP route, Auth tokens and Realtime subscriptions still
  require testing.
- Existing `process-game-result` has a separate legacy status and ELO protocol
  and must be secured and made idempotent before release: see
  [issue #63](https://github.com/magicolala/chess-simul/issues/63).
- Historical `games` rows with non-zero `move_count` and empty `moves`
  cannot have their missing moves reconstructed reliably from FEN.
