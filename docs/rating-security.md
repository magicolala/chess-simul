# Issue #63 — Trustworthy, exactly-once Elo settlement

## Security boundary

This feature is **NOT yet deployed** on the Chess Simul staging Supabase
project. All database tests initially run on disposable PostgreSQL 17.

Existing `public.profiles` privileges allow an authenticated client to
`INSERT` or `UPDATE` its own `elo`. RLS protects the row, **not the
columns**. The migration revokes table-level INSERT/UPDATE grants from
`anon` and `authenticated`, then grants the required client-editable fields
(`id` for new profiles; `username`, `avatar_url`, `bio`,
`onboarding_completed`). The service role retains permission to change Elo.

A client can currently insert `public.games` with its own user ID. This
must **never** create a rated game merely because `status=checkmate`.
`rated_game_authorizations` is a server-only allowlist, and every existing
game starts **unrated**. In the first iteration, only the
authenticated/recipient-verified `accept-invite` Edge Function writes that
authorization after successfully creating a standard game. It marks the
game unrated on authorization failure, rather than fabricating eligibility.
Matchmaking game authorization is deferred until its queuing, RLS and race
conditions are secured. Simul and Hydra remain separate scoring models.

## Settlement

The Edge Function `process-game-result` accepts **only**
`{ "game_id": "UUID" }`, with a verified user JWT and participation
check. It ignores neither arbitrary outcomes nor client-supplied modes:
requests containing any other field are rejected. JWT gateway validation
is enabled in `supabase/config.toml`.

It calls `apply_completed_game_rating`, a **service-role-only**,
`SECURITY INVOKER` PostgreSQL RPC that:

1. Locks the game row and refuses unauthorized/nonstandard/unsettled games.
2. Returns an idempotent success when a ledger row already exists.
3. Validates terminal statuses `checkmate`, `draw`, `resigned`, `timeout`
   and a winner from the actual saved game row.
4. Locks **both** player profiles by ascending UUID to serialize shared
   Elo mutations across games.
5. Calculates expected scores with the existing Elo formula and K-factor
   thresholds. The real `profiles` table has no `age` or `games_played`
   columns; provisional game counts therefore come from the new rating
   event ledger. Historic games are deliberately **not** reprocessed.
6. Updates both ratings and inserts one uniquely-keyed audit event in the
   **same database transaction**; a failure rolls back every change.
7. Never overwrites the terminal `games.status` or `games.winner_id`.

We do **not** create an unauthenticated automatic result endpoint.

### Known limitations / follow-up work

- Game results are not settled automatically yet. A verified player needs to
  invoke `process-game-result` after completion. A secure outbox/worker or
  integration with the post-move/timeout lifecycle is a separate needed step.
- The SQL migration is independent of PR #57 in the repository, but actual
  `timeout` games require the new status from PR #57. The staging database
  already has that migration; do not assume another environment does.
- `hydra_games` has a different schema and score/lives rules. This RPC
  intentionally refuses Hydra and simul games; *do not* assign regular
  profile Elo with client-supplied `hydra_mode`.
- Profile self-update hardening is a behaviour change. Test the existing
  registration, profile editing and onboarding flows against staging before
  merging. These flows should update only the explicitly granted fields.
- Rating events preserve audit history and prevent deleting settled games
  via the FK; do not silently delete the audit ledger to reset ratings.
- No retroactive repair of the 24 historic staging games.
- To prevent rating farms, consider throttling trusted game creation and
  suspiciously frequent settlements before public release.

## Test and staging rollout

Use `.github/workflows/rating-postgres.yml`: a **disposable** PostgreSQL
17 service reproduces the old broad profile grants, applies the proposed
migration, and tests:
- no authenticated Elo insertion/update or unauthorized rating calls;
- continued permission to edit legitimate profile fields;
- old/unapproved games are never rated;
- expected first-game deltas, both profiles changed together;
- idempotency on replay, immutable terminal game status;
- drawn results and invalid winner rejection;
- Hydra exclusion and audit ledger uniqueness.

The workflow does not use Supabase secrets. After green CI, review DDL
privilege changes and explicitly apply the migration to the existing
owner-confirmed Supabase **staging** project `kjgcgnqeyxzivilkiruz`.
Record row counts and sample profile values before/after. Test a real
registration and profile edit. Only **then** deploy the updated
`accept-invite` and `process-game-result` functions with JWT checks
and real two-user tests when keys are securely available.

**No automatic merge or production deployment.**
