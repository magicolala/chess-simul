# Supabase security posture

RLS is enabled on all gameplay tables and policies are trimmed down to the minimum needed for the simul workflows.

## Helper functions

- `public.is_host(simul_id uuid)`: returns true when the current `auth.uid()` matches the simul host.
- `public.is_participant(game_id uuid)`: returns true when the current `auth.uid()` is the white/black player, the game host, or the host of the related simul (directly or via its table).

## Table rules

- **profiles**: publicly readable; users can only update their own row.
- **user_settings**: full CRUD restricted to the row owner.
- **simuls**: hosts have full CRUD; others can only select simuls in `open` or `running` status.
- **simul_tables**: hosts have full CRUD; anyone can see tables for `open`/`running` simuls; challengers can join/leave seats only on tables where they are (or will be) the guest.
- **games**: selectable by participants and simul hosts; creation and deletion are host-only; updates require participant or simul-host context.
- **moves**: selectable by participants and simul hosts; inserts/updates/deletes are limited to participants (temporary until Edge Function takes over).

Realtime subscriptions inherit these rules because all tables are in the `supabase_realtime` publication and rely on RLS predicates to filter rows.

## Verification checklist

Use the lightweight SQL harness in [`supabase/tests/security_checks.sql`](tests/security_checks.sql) with the Supabase CLI (`supabase db remote commit` or `supabase db connect`) to quickly smoke-test RLS. Replace the UUID placeholders with real user IDs before running.

Key expectations:

1. A signed-in host can see and manage their simuls, tables, games, and moves.
2. A signed-in guest can see only simuls in `open`/`running` and only games/moves they participate in.
3. A random authenticated user cannot see games or moves belonging to others.
4. Realtime subscriptions only emit rows that the above select policies allow (no leakage when the user is not a participant or simul host).
