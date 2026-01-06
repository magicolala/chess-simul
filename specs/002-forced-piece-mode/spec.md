# Feature Specification: Forced-Piece Game Mode

**Feature Branch**: `002-forced-piece-mode`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "Ajoute ce nouveau mode de jeu à l'application : Feature : Mode “Main–Cerveau Obligatoire” (pièce imposée à chaque coup)..."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Play a turn with a forced piece (Priority: P1)

As a player in a "Forced-Piece" game, at the beginning of my turn, the game should automatically determine a piece I must move, so that I can follow the rules of the mode. The UI must clearly show me which piece is forced, and prevent me from moving any other piece.

**Why this priority**: This is the core mechanic of the entire feature. Without it, the game mode doesn't exist.

**Independent Test**: Can be tested by starting a 1-player game in this mode. The user should see a piece highlighted, receive an error when trying to move another piece, and be able to successfully move the highlighted piece.

**Acceptance Scenarios**:

1.  **Given** it is the player's turn in a "Forced-Piece" mode game,
    **When** the turn begins,
    **Then** the system automatically determines the piece to be moved and highlights it on the board with a message like "Brain: You must play the piece on [square] ([piece name])".
2.  **Given** a piece is forced for the current turn,
    **When** the player attempts to select or drag a different piece,
    **Then** the action is rejected and a message "Brain-forced piece: [square]." is shown.
3.  **Given** a piece is forced for the current turn,
    **When** the player selects the forced piece,
    **Then** all its legal moves are displayed on the board.
4.  **Given** the player has selected the forced piece,
    **When** the player chooses a legal destination square,
    **Then** the move is executed and the turn ends.

---

### User Story 2 - Handle game state changes during a turn (Priority: P2)

As a player, if the game board changes unexpectedly during my turn (e.g., due to a network update in a multiplayer game), the system should immediately recalculate the forced piece based on the new position to ensure I'm not stuck with an obsolete suggestion.

**Why this priority**: This ensures the game is resilient and doesn't lock up or present invalid states in a multiplayer or unstable environment.

**Independent Test**: In a test environment, after a forced piece is suggested, manually update the board state (FEN) and verify that the forced piece suggestion is re-evaluated and updated in the UI.

**Acceptance Scenarios**:

1.  **Given** a forced piece "P1" on square "S1" is suggested for the current board state "B1",
    **When** the board state changes to "B2" before the player moves,
    **Then** the system immediately re-runs the brain to determine a new forced piece "P2" on square "S2" corresponding to state "B2".

---

### Edge Cases

-   **What happens when the forced piece has only one legal move?** The player must execute that single move. No special handling is required; the standard UI flow for selecting the piece and its only available move applies.
-   **How does the system handle the brain taking too long to think?** The UI should show a `thinking` status to the user so they know the system is active. The board should be interactive but moves blocked until the brain is `ready`.

## Requirements _(mandatory)_

### Functional Requirements

-   **FR-001**: The system MUST provide a "Forced-Piece" game mode.
-   **FR-002**: At the start of each player's turn, the system MUST automatically consult an engine to determine the best move and thus the piece to be forced.
-   **FR-003**: The UI MUST clearly and visually indicate the forced piece and its source square to the current player.
-   **FR-004**: The system MUST prevent the player from selecting or moving any piece other than the one forced by the brain.
-   **FR-005**: The system MUST allow the player to execute any legal move with the forced piece.
-   **FR-006**: The rules MUST apply symmetrically to both players (White and Black).
-   **FR-007**: If the board position changes mid-turn, the system MUST immediately re-calculate the forced piece for the new position.

### Key Entities _(include if feature involves data)_

-   **Game Session**: Represents a single game.
    -   `mode`: "Forced-Piece"
    -   `brainForcedFromSquare`: The source square of the piece forced by the brain for the current turn (e.g., "g1").
    -   `brainForcedForPosition`: An identifier for the board position (e.g., FEN hash or ply count) for which the suggestion is valid.
    -   `brainStatus`: The state of the engine calculation (`idle` | `thinking` | `ready`).

## Success Criteria _(mandatory)_

### Measurable Outcomes

-   **SC-001**: In a "Forced-Piece" mode game, 100% of moves made must originate from the square forced by the brain for that turn.
-   **SC-002**: When a player attempts to move a non-forced piece, the action is blocked 100% of the time, with a feedback message displayed instantly (<100ms).
-   **SC-003**: In case of a board state desynchronization, the new forced-piece suggestion is calculated and displayed to the user within 500ms of the new state being recognized.
-   **SC-004**: The UI indication for the forced piece is displayed within 200ms of the brain calculation completing.
