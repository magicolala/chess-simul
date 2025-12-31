# Data Model: Hydra Multitable Tournaments

## Entities

### Tournament

- **Fields**: id, name, type (arena|survival), status (scheduled|active|ended),
  startTime, endTime, durationMinutes, survivalLivesDefault, createdAt.
- **Rules**: Arena uses durationMinutes; Survival uses survivalLivesDefault and
  elimination rules.
- **Relationships**: 1:N with Participant, 1:N with Game, 1:N with ScoreEvent,
  1:N with MatchmakingEvent.

### Participant

- **Fields**: id, tournamentId, playerId, scoreTotal, livesRemaining,
  eliminatedAt, activeGameCount, joinedAt.
- **Rules**: livesRemaining only for Survival; eliminatedAt set when lives reach
  zero; scoreTotal updates on game results.
- **Relationships**: N:1 Tournament, 1:N Game (as player), 1:N ScoreEvent.

### Game

- **Fields**: id, tournamentId, whitePlayerId, blackPlayerId, status
  (pending|active|finished|forfeited), startTime, endTime, result
  (whiteWin|blackWin|draw|forfeit), timeControl (fixed 5+3).
- **Rules**: status transitions pending -> active -> finished/forfeited.
- **Relationships**: N:1 Tournament, N:1 Participant (white/black), 1:1 MoveAudit.

### MoveAudit

- **Fields**: id, gameId, pgnText, createdAt, updatedAt.
- **Rules**: Stores full PGN for completed games; updated as moves append.
- **Relationships**: 1:1 Game.

### ScoreEvent

- **Fields**: id, tournamentId, participantId, gameId, delta, reason,
  createdAt.
- **Rules**: delta in {+3, +1, -1}; reason in {win, draw, loss, forfeit}.
- **Relationships**: N:1 Tournament, N:1 Participant, N:1 Game.

### MatchmakingEvent

- **Fields**: id, tournamentId, playerId, queueAction (join|leave|match),
  eloMin, eloMax, matchedGameId, createdAt.
- **Rules**: eloMin/eloMax expand every 10s while queued.
- **Relationships**: N:1 Tournament, N:1 Participant, 0..1 Game.

## State Transitions

- **Tournament**: scheduled -> active -> ended.
- **Participant**: active -> eliminated (Survival only).
- **Game**: pending -> active -> finished/forfeited.
