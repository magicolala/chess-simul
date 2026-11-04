# Issue #55 — atomic move submission (draft rollout plan)

This branch is **not deployed**. Supabase remains the production backend and its data
(7 Auth users / 24 games at the initial audit) has not been modified by this change.

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

1. Provision a **separate** Supabase test project with database migrations and
   deploy all changed Edge Functions to that project. The initial cloud project
   was used only for *read-only* schema/trigger inspection.
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
   Tests create and clean up their own users and games. **Never point them at
   the live project.**
5. Verify Realtime `games UPDATE` and `moves INSERT` with two clients, and
   verify simultaneous moves, clock increment, timeout, checkmate, draw,
   promotion, illegal move, off-turn move and retry/reconnect behavior.
6. Review the Angular build, unit suite and Playwright results. Do not accept
   an existing failure on `main` as proof this PR is correct.

## Deployment sequence, after validation

1. Back up and record current schema and Edge Function versions.
2. Apply `20261104161355_atomic_move_submission.sql` to *staging* first.
   This expands the `games.status` check constraint to include `timeout`,
   creates two RPCs, and revokes their EXECUTE from `PUBLIC`/`anon`/
   `authenticated`. Check the PostgREST schema cache.
3. Deploy the modified functions together:
   `submit-move`, `check-timeout`, `resign-game`, `join-queue`,
   `accept-invite` and `process-hydra-queue`. The first two **depend**
   on the new RPC migration, so must not be deployed before it.
4. Run staging E2E with at least two users; verify results/ratings,
   performance, and rollback. Deploy to production only with explicit approval.
5. Rollback plan: revert Edge Functions to previous versions **before**
   changing any database RPCs; never delete or reinitialize `games` / `moves`.

## Remaining constraints

- This migration is checked in for review; it was **not** applied to the
  production Supabase database or the Neon fallback.
- The hosted `check-timeout` function was not listed as deployed at audit
  time; deploy it explicitly in staging before the timeout integration test.
- Existing `process-game-result` has a separate legacy status and ELO protocol
  and must be secured and made idempotent before release: see
  [issue #63](https://github.com/magicolala/chess-simul/issues/63).
- Historical `games` rows with non-zero `move_count` and empty `moves`
  cannot have their missing moves reconstructed reliably from FEN.
