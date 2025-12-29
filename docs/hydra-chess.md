# Hydra Chess Concept Brief

## Vision
Hydra Chess is a high-tempo tournament format where success depends on both chess strength and attention management. Players can launch as many simultaneous boards as they dare.

- **Slogan:** "Plus tu as de têtes, plus tu es dangereux... ou vulnérable."
- **Pillar:** Risk vs. reward. More tables mean more scoring upside and a higher chance of blunders that cost points.

## Gameplay Mechanics
### Hydra Scoring
The scoring model rewards wins and discourages low-effort spamming of games.

- Victory: **+3**
- Draw: **+1**
- Loss: **-1**

### Time Control & Board Slots
- Single cadence: **5 minutes + 3 seconds increment** per move to give players time to navigate multiple boards.
- Mosaic interface that resizes boards on the fly:
  - 1 game: Full screen
  - 2–4 games: 2x2 grid
  - 5–9 games: 3x3 grid
- Focus indicator: The board where the opponent just moved is highlighted (green border) or plays a distinct alert sound.

## Tournament Modes
Hydra Chess supports two tournament structures:

1. **L'Heure de l'Hydre (Arena):** Fixed duration (e.g., 60 minutes). The top score at the buzzer wins. Games already in progress continue and count once finished.
2. **Mode Survie:** Each player starts with a life pool. Every loss consumes one life. The goal is to score as many points as possible before elimination.

## Recommended Stack
- **Backend (Node.js & WebSockets)**
  - Game logic: `chess.js` to validate moves and track board state server-side.
  - Realtime: `socket.io` for synchronized events across all boards.
  - Matchmaking: Single queue that pairs by Elo, widening the search window every 10 seconds.
- **Frontend (React/Next.js)**
  - Rendering: Chessground for smooth, touch-friendly boards.
  - State management: Zustand or Redux to track many concurrent games without performance loss.

## MVP Roadmap
1. **Multi-board engine:** Allow a user to open two simultaneous games against basic bots and handle clock desynchronization.
2. **Matchmaking & scoring:** Implement the global queue and persist the +3/+1/-1 scoring in a database (PostgreSQL or Redis).
3. **Dynamic interface:** Build the adaptive grid with visual turn alerts.

## Anticipated Challenges
1. **Anti-abandon:** Rage-quitting many boards can block opponents.
   - Detect early inactivity (forfeit if no move within ~20 seconds after start).
2. **Client performance:** Rendering many boards strains the browser.
   - Optimize SVG rendering and limit animations on inactive boards.
