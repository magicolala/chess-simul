# Data Model: Round Robin Simul Sessions

## Entities

### SimulSession

- **Purpose**: Represents a private round-robin lobby and start state.
- **Fields**:
  - `id` (unique identifier)
  - `organizer_id` (user identifier)
  - `invite_code` (shareable token)
  - `status` (draft | started | completed)
  - `created_at`
  - `started_at`
- **Validation Rules**:
  - `invite_code` must be unique.
  - `status` transitions only forward: draft -> started -> completed.

### SimulParticipant

- **Purpose**: Tracks participants in a session and prevents duplicates.
- **Fields**:
  - `id` (unique identifier)
  - `session_id` (SimulSession reference)
  - `user_id` (user identifier)
  - `joined_at`
  - `status` (active | left)
- **Validation Rules**:
  - `(session_id, user_id)` must be unique.
  - Participants can be added only while session status is `draft`.

### SimulGameLink

- **Purpose**: Associates a session with generated games for each player pair.
- **Fields**:
  - `id` (unique identifier)
  - `session_id` (SimulSession reference)
  - `game_id` (existing Game reference)
  - `white_id` (user identifier)
  - `black_id` (user identifier)
  - `created_at`
- **Validation Rules**:
  - For a session with N participants, there must be exactly N*(N-1)/2 rows.
  - Each unique `(white_id, black_id)` pair appears only once per session.

## Relationships

- SimulSession 1..* SimulParticipant
- SimulSession 1..* SimulGameLink
- SimulGameLink *..1 Game (existing game table)

## State Transitions

- **SimulSession**: draft -> started (organizer action); started -> completed (all games finished or manual close).
- **SimulParticipant**: active -> left (optional, before start only).
