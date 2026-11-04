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
- Draws from stalemate/insufficient material/50-move rules are detected from
  the FEN + move. **Threefold repetition is still incomplete** because the old
  game history is absent: full historical repetition detection must reconstruct
  prior positions, not just load the current FEN.

## Test instructions (staging only)

1. Provision a **separate** Supabase test project with database migrations and
   deploy all changed Edge Functions to that project. The initial cloud project
   was used only for *read-only* schema/trigger inspection.
2. Confirm `get_advisors`, RLS policies and API execution grants. Anonymous and
   authenticated users **must not** have EXECUTE on the two new RPCs;
   `service_role` needs EXECUTE. Do not expose service role secrets to Angular.
3. Run the stateless clock helper suite:
   `deno test --allow-net supabase/tests/game_clock_test.ts`
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
2. Apply `20261104000000_atomic_move_submission.sql` to *staging* first.
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
- Existing `process-game-result` has a separate legacy status protocol and
  needs a compatibility review before production rollout.
- Historical `games` rows with non-zero `move_count` and empty `moves`
  cannot have their missing moves reconstructed reliably from FEN.
