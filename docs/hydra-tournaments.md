# Hydra Tournaments

## Overview
Hydra tournaments allow players to run multiple simultaneous games (2-9) inside a single session.
Each game runs at a fixed 5+3 time control with Hydra scoring:

- Win: +3
- Draw: +1
- Loss: -1

## Event Types

### Arena (Hydra Hour)
- Fixed duration.
- Rankings decided by total score at the scheduled end.
- Games still running at the end continue and count toward final score.

### Survival
- Each player starts with a configurable life pool (default 3).
- Each loss consumes one life.
- Players are eliminated at zero lives.
- Rankings are based on total score, then elimination time.

## UI Layout
- 1 active game: fullscreen board.
- 2-4 active games: 2x2 mosaic.
- 5-9 active games: 3x3 mosaic.
- The board where the opponent just moved is highlighted and can trigger an alert sound.

## Views
- Tournament leaderboard with live score updates.
- My active games view showing all current games.

## Matchmaking
- Single global queue per tournament.
- Initial Elo window: ±100.
- Elo window widens every 10 seconds while queued.
- Inactivity for 20 seconds at game start triggers a forfeit.
