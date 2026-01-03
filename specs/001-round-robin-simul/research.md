# Research: Round Robin Simul Sessions

## Decision 1: Session creation and start as privileged actions

- **Decision**: Use Edge Functions for session creation, join, and start operations with authenticated user context.
- **Rationale**: These actions perform privileged writes and must enforce organizer-only start and roster locking.
- **Alternatives considered**: Client-only writes with RLS; rejected due to complexity in enforcing multi-step creation and race conditions.

## Decision 2: Data model alignment with existing games

- **Decision**: Store session participants and generate game records that link to existing game entities when the session starts.
- **Rationale**: Reuses existing game lifecycle and avoids parallel game logic.
- **Alternatives considered**: Dedicated session-only games table; rejected to prevent duplicated game state management.

## Decision 3: Realtime updates for lobby and match list

- **Decision**: Use session-scoped realtime subscriptions with minimal columns for lobby roster and game status.
- **Rationale**: Keeps updates fast and aligns with realtime performance discipline.
- **Alternatives considered**: Polling; rejected due to slower feedback for participants.
