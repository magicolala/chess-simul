# Feature Specification: Hydra Multitable Tournaments

**Feature Branch**: `001-hydra-multitable-tournament`  
**Created**: 2025-12-29  
**Status**: Draft  
**Input**: User description: "Add Hydra Chess multitabling tournament mode to the existing Chess Simul app without changing the current monorepo architecture. Players can open multiple simultaneous games (2 to 9) during a tournament session. Each game uses a fixed time control of 5+3. The UI displays boards in a responsive mosaic: 1 board fullscreen, 2-4 boards in a 2x2 grid, 5-9 boards in a 3x3 grid. The board where the opponent just moved is highlighted and can optionally trigger a distinct sound. Implement Hydra scoring: Win: +3 Draw: +1 Loss: -1 Scores update in real-time during the session. Support two event types: 1) Arena (“Hydra Hour”): fixed duration (e.g., 60 minutes). Rankings are decided by total score at the end; games still running at the end continue and still count. 2) Survival: each player has a life pool; each loss consumes one life; players are eliminated at zero lives and final ranking is based on score and time of elimination. Matchmaking: A single global queue that pairs players based on Elo, widening the Elo range every 10 seconds until a match is found. Players may have multiple active games at once. Anti-abandon: If a player is inactive for 20 seconds at the beginning of a game, the game is forfeited. Rage-quitting multiple games should not block opponents; forfeits should resolve games quickly. Data & audit: Persist tournaments, participants, games, moves metadata (minimal), results, scores, and matchmaking events. Provide a tournament leaderboard view and a “my active games” view. Non-goals for MVP: No bots, no new frontend framework, no major refactor; only add missing features aligned with existing structure and security rules."

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Multitable Play Experience (Priority: P1)

As a tournament participant, I want to play multiple simultaneous games with a clear, responsive board layout so I can manage several opponents at once.

**Why this priority**: The multitable experience is the core value of the Hydra mode and must exist for any tournament session to be viable.

**Independent Test**: Join a tournament session, open 2 to 9 concurrent games, and verify the layout, time control, and last-move highlight behavior.

**Acceptance Scenarios**:

1. **Given** a player joins a Hydra tournament session, **When** they have 1 active game, **Then** the board is shown fullscreen with a 5+3 clock.
2. **Given** a player has 2 to 4 active games, **When** the view renders, **Then** the boards are displayed in a 2x2 grid and each game uses 5+3.
3. **Given** a player has 5 to 9 active games, **When** the view renders, **Then** the boards are displayed in a 3x3 grid and each game uses 5+3.
4. **Given** an opponent makes a move in any game, **When** the move arrives, **Then** that board is visibly highlighted and the optional alert sound plays if enabled.

---

### User Story 2 - Tournament Scoring and Rankings (Priority: P2)

As a participant, I want my Hydra score and the leaderboard to update in real time so I can track performance during the event.

**Why this priority**: Competitive play depends on transparent scoring and rankings across the tournament.

**Independent Test**: Complete a sequence of wins, draws, and losses and confirm scores and rankings update per event type rules.

**Acceptance Scenarios**:

1. **Given** a game ends in a win, **When** the result is recorded, **Then** the player’s tournament score increases by 3 and is reflected on the leaderboard.
2. **Given** a game ends in a draw, **When** the result is recorded, **Then** the player’s tournament score increases by 1 and is reflected on the leaderboard.
3. **Given** a game ends in a loss, **When** the result is recorded, **Then** the player’s tournament score decreases by 1 and is reflected on the leaderboard.
4. **Given** an Arena event reaches its scheduled end, **When** games continue to finish afterward, **Then** those results still affect final rankings.
5. **Given** a Survival event, **When** a player’s life pool reaches zero, **Then** the player is eliminated and final ranking factors in score and elimination time.

---

### User Story 3 - Matchmaking and Active Games Management (Priority: P3)

As a participant, I want matchmaking to quickly find opponents for multiple games and to recover from early inactivity so my session keeps moving.

**Why this priority**: Fast matchmaking and anti-abandon rules prevent stalled sessions and keep opponents from being blocked.

**Independent Test**: Enter the queue, verify Elo range widening, and trigger inactivity at game start to confirm forfeits resolve quickly.

**Acceptance Scenarios**:

1. **Given** a player is in the global queue, **When** 10 seconds pass without a match, **Then** the acceptable Elo range widens and matchmaking continues.
2. **Given** a player has multiple active games, **When** they enter the queue again, **Then** they can be paired for additional games until the 9-game limit is reached.
3. **Given** a player is inactive for 20 seconds at the beginning of a game, **When** the inactivity timer expires, **Then** the game is forfeited and the opponent is released from that game.
4. **Given** a player abandons multiple games, **When** forfeits are triggered, **Then** opponents receive timely results without being blocked by the missing player.

---

[Add more user stories as needed, each with an assigned priority]

## Clarifications

### Session 2025-12-29

- Q: Should the Survival life pool be fixed or configurable per tournament? → A: Configurable per tournament, default 3 lives.
- Q: What minimal move metadata should be persisted for audit? → A: Store full PGN for each game.
- Q: What happens when a player is inactive for 20 seconds at game start? → A: Immediate forfeit with standard win/loss scoring.
- Q: What is the initial Elo matchmaking window before widening? → A: ±100 Elo.
- Q: What is the default board ordering and sort options in the mosaic? → A: Default order by game start; user can filter to sort by recent activity or remaining time.

### Edge Cases

- A player reaches the Arena end time while still in multiple games.
- A player reaches zero lives mid-session in Survival while other games are still active.
- A player hits the 9-game cap but remains in the matchmaking queue.
- Two opponents move in different games within the same update window and both boards need highlighting.
- An opponent disconnects at the game start but reconnects within the 20-second inactivity window.

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST allow participants to play 2 to 9 concurrent games within a single tournament session.
- **FR-002**: System MUST enforce a fixed 5+3 time control for every Hydra game.
- **FR-003**: System MUST render the multiboard view as fullscreen for 1 game, 2x2 grid for 2-4 games, and 3x3 grid for 5-9 games.
- **FR-004**: System MUST highlight the board where the most recent opponent move occurred and allow players to enable or disable an alert sound for that event.
- **FR-005**: System MUST calculate Hydra scores as win +3, draw +1, loss -1 and update participant totals during the session.
- **FR-006**: System MUST support Arena events with a fixed duration where in-progress games at the end still count toward final rankings.
- **FR-007**: System MUST support Survival events with a life pool, consuming one life per loss and eliminating players at zero lives.
- **FR-007a**: System MUST allow the Survival life pool to be configured per tournament, with a default of 3 lives when not specified.
- **FR-008**: System MUST rank Arena results by total score and Survival results by total score with elimination time as a tiebreaker.
- **FR-009**: System MUST maintain a global matchmaking queue that starts at ±100 Elo and widens the acceptable range every 10 seconds until a match is found.
- **FR-010**: System MUST allow players to enter the queue while already playing, up to a maximum of 9 concurrent games.
- **FR-011**: System MUST forfeit a game if a player is inactive for 20 seconds at the beginning of that game, applying standard win/loss scoring.
- **FR-012**: System MUST resolve forfeits promptly so opponents receive a result and can continue matchmaking.
- **FR-013**: System MUST provide a tournament leaderboard view with live score updates.
- **FR-014**: System MUST provide a “my active games” view showing all current games for the participant.
- **FR-015**: System MUST persist tournaments, participants, games, full PGN per game, results, scores, and matchmaking events for auditability.
- **FR-016**: System MUST default the board mosaic ordering to game start order and allow a user-controlled filter to sort by recent activity or by remaining time.

### Key Entities

- **Tournament**: Event definition including type (Arena/Survival), duration, start/end times, rules, and status.
- **Participant**: Player entry in a tournament with current score, life pool, elimination time (if any), and active game count.
- **Game**: Individual match with players, time control, state, result, and timestamps.
- **Move Metadata**: Full PGN record for each game for audit purposes.
- **Matchmaking Event**: Queue entry, Elo search range changes, pairing outcome, and timestamps.
- **Score Event**: Score adjustments tied to game outcomes for audit and leaderboard updates.

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% of participants can start at least 2 concurrent games within 2 minutes of entering a tournament.
- **SC-002**: 95% of game results appear on the leaderboard within 5 seconds of completion.
- **SC-003**: At least 90% of Arena tournaments conclude with finalized rankings that include post-time-limit games.
- **SC-004**: In Survival events, 100% of eliminations are recorded with a timestamp used for ranking.
- **SC-005**: Less than 5% of games remain unresolved due to early inactivity beyond the 20-second window.

## Assumptions

- The alert sound for last-move highlights is opt-in per participant and remembered for the session.
- Players can choose to queue for additional games up to the 9-game limit, rather than being auto-queued.

## Non-Goals

- No bots or AI opponents.
- No new frontend framework or major architectural refactor.
- No changes that violate existing security rules or repo structure.
