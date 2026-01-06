# Data Model: Forced-Piece Game Mode

This document describes the data model changes required for the Forced-Piece Game Mode. The changes are divided into the backend (database) and frontend (client-side state).

## 1. Backend Data Model (Supabase)

The primary change is to the `games` table to allow identifying games that use this new mode.

### `games` table modification

A new column will be added to the `games` table.

-   **Table**: `games`
-   **Column to add**: `game_mode`
    -   **Type**: `text`
    -   **Default value**: `'standard'`
    -   **Constraints**: Not null.
    -   **Description**: Stores the identifier for the game mode. For this feature, the value will be `'forced_piece'`.

This will be implemented via a new Supabase migration file.

## 2. Frontend Data Model (Client-Side State)

This state is transient and managed entirely on the client. It is not saved to the database. This state will likely be managed within a dedicated state management store or service for the game view.

### `ForcedPieceState`

-   **`brainStatus`**:
    -   **Type**: `'idle' | 'thinking' | 'ready'`
    -   **Description**: Tracks the current status of the Stockfish engine calculation.
        -   `idle`: The engine is not currently processing a request.
        -   `thinking`: The engine is calculating the best move. The UI should reflect this waiting state.
        -   `ready`: The engine has provided a `bestmove`, and the forced piece is known.

-   **`brainForcedFromSquare`**:
    -   **Type**: `string | null` (e.g., `'e2'`)
    -   **Description**: The source square of the piece that the player is forced to move this turn. It is `null` when the brain is not ready or it's not the player's turn.

-   **`brainForcedForPosition`**:
    -   **Type**: `string | null`
    -   **Description**: An identifier for the board position (e.g., the FEN string) for which the `brainForcedFromSquare` is valid. This is used to detect desynchronization. If the actual board position changes and no longer matches this identifier, a recalculation is required.
