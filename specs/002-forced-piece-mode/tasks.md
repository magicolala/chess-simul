# Tasks: Forced-Piece Game Mode

**Input**: Design documents from `/specs/002-forced-piece-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the necessary database schema changes for the feature.

- [ ] T001 Create a new migration script in `supabase/migrations/` to add the `game_mode` column to the `games` table.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the core engine service that will be used by the game logic.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Create the `stockfish.service.ts` file in `apps/web/src/services/`.
- [ ] T003 Implement the `StockfishService` class to manage the Stockfish.js Web Worker, including methods for initialization, getting the best move, and termination.

---

## Phase 3: User Story 1 - Play a turn with a forced piece 🎯 MVP

**Goal**: Implement the core game loop where the engine forces a piece, and the UI restricts the player's move.

**Independent Test**: Start a new game in "Forced-Piece" mode. At the player's turn, verify that a piece is highlighted, moving other pieces is blocked, and a legal move with the forced piece can be made.

### Implementation for User Story 1

- [ ] T004 [US1] Extend the client-side game state management (e.g., in `apps/web/src/state/game.store.ts`) to include the `ForcedPieceState` (`brainStatus`, `brainForcedFromSquare`, `brainForcedForPosition`).
- [ ] T005 [US1] In the main game component (e.g., `apps/web/src/pages/game/game.page.tsx`), import and initialize the `StockfishService`.
- [ ] T006 [US1] In the game logic, when a new turn begins for a human player in "Forced-Piece" mode, call the `StockfishService` to get the best move and update the game state with the forced piece details.
- [ ] T007 [P] [US1] Create a new component `forced-piece-overlay.component.tsx` in `apps/web/src/components/game/` to visually highlight the forced piece on the board based on the game state.
- [ ] T008 [US1] Integrate the `ForcedPieceOverlay` component into the main game view.
- [ ] T009 [US1] Modify the board's input handling logic to check the game state. If a piece is forced, reject any move attempts that do not originate from the `brainForcedFromSquare`.
- [ ] T010 [US1] Display a message (e.g., using a toast or a small text element) when a player attempts to move a non-forced piece.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Handle game state changes

**Goal**: Ensure the forced-piece suggestion is immediately recalculated if the board state changes unexpectedly mid-turn.

**Independent Test**: In a test environment, after a forced piece is suggested, manually change the board state and verify that the engine is re-queried and the UI updates with a new forced piece.

### Implementation for User Story 2

- [ ] T011 [US2] In the main game component (`apps/web/src/pages/game/game.page.tsx`), add logic to detect changes to the official board position (e.g., from a Supabase realtime event).
- [ ] T012 [US2] When a board change is detected, compare the new position's FEN with the `brainForcedForPosition` from the game state.
- [ ] T013 [US2] If the FENs do not match, immediately trigger a recalculation by calling the `StockfishService` with the new position.

**Checkpoint**: At this point, the game should be resilient to desynchronization events.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements for user experience and robustness.

- [ ] T014 [P] Implement a visual indicator in the UI that shows the `brainStatus` (e.g., a "thinking..." spinner or message).
- [ ] T015 [P] Add robust error handling to the `StockfishService` in case the engine fails to load or the Web Worker crashes.
- [ ] T016 [P] Update the "New Game" screen to allow players to select the "Forced-Piece" game mode.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Must be completed first.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational. Can be worked on in parallel with User Story 1.
- **Polish (Phase 5)**: Depends on User Story 1.

### User Story Dependencies

- **User Story 1 (P1)**: The core MVP. Depends only on Phase 1 & 2.
- **User Story 2 (P2)**: Depends on the state management from US1, but the core logic is independent and can be developed in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (add `game_mode` column).
2. Complete Phase 2: Foundational (create `StockfishService`).
3. Complete Phase 3: User Story 1 (implement the core game loop).
4. **STOP and VALIDATE**: Manually test the complete flow for a single player.

### Incremental Delivery

1.  Deliver the MVP (US1).
2.  Add User Story 2 functionality.
3.  Complete Polish tasks for a final, robust feature.
