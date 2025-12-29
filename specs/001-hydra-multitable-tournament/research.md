# Research Notes: Hydra Multitable Tournaments

## Decision 1: Realtime delivery for games, scores, and leaderboard
- **Decision**: Use Supabase realtime on game, score, and leaderboard-related
  tables filtered by tournament/session ID.
- **Rationale**: Matches the live update requirement with low latency while
  keeping payloads scoped per tournament for performance.
- **Alternatives considered**: Client polling with short intervals (higher load),
  full-table realtime streams (too heavy at scale).

## Decision 2: Matchmaking and scoring via server-side functions
- **Decision**: Implement matchmaking, inactivity forfeits, and scoring updates
  through Supabase Edge Functions or server-only paths.
- **Rationale**: Avoids privileged writes from the client, aligns with RLS and
  auditability requirements.
- **Alternatives considered**: Client-side writes with broad RLS exceptions
  (security risk), manual admin operations (slow and error-prone).

## Decision 3: Audit trail granularity
- **Decision**: Persist full PGN per game in the audit record.
- **Rationale**: Provides a complete replay trail for disputes and analysis
  without introducing bespoke move formats.
- **Alternatives considered**: Minimal move metadata only (insufficient for
  replay), hybrid metadata plus PGN (more complexity without clear benefit).
