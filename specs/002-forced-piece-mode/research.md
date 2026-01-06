# Research: Forced-Piece Game Mode

This document outlines the research for implementing the Forced-Piece Game Mode feature.

## 1. Stockfish.js Integration

-   **Decision**: Use the official Stockfish.js library, loaded from a reliable CDN (e.g., cdnjs or jsDelivr), and run it in a Web Worker.
-   **Rationale**:
    -   Running the engine in a Web Worker is non-negotiable. It prevents the UI from freezing during engine calculation, which can take several seconds depending on the position and search depth.
    -   Loading from a CDN simplifies dependency management and leverages browser caching.
    -   The official Stockfish.js library provides a stable API for interacting with the engine using the standard UCI (Universal Chess Interface) protocol.
-   **Implementation Steps**:
    1.  Create a dedicated service/wrapper (e.g., `StockfishService`) to manage the Web Worker and the engine's lifecycle.
    2.  This service will expose methods like `initialize()`, `getBestMove(fen, depth)`, and `terminate()`.
    3.  The service will handle the asynchronous communication with the worker, parsing the UCI output to extract the `bestmove`.
    4.  The UI will interact only with this service, not directly with the worker or engine.

## 2. Client-Side State Management

-   **Decision**: The "forced piece" state (`brainForcedFromSquare`, `brainForcedForPosition`, `brainStatus`) will be managed exclusively within the client-side state management solution (e.g., a React context, a Zustand store, or an Angular service). It will not be persisted to the database.
-   **Rationale**:
    -   This state is transient and only relevant for the current player's current turn. It has no value beyond that turn, as it is recalculated every time.
    -   Persisting this to the database would add unnecessary network traffic and database load for data that becomes instantly stale.
    -   The `brainForcedForPosition` (using the FEN or a hash of it) is sufficient to handle desynchronization. If the board state from the server (via Supabase Realtime) changes, the client can compare the new position's FEN with `brainForcedForPosition`. If they don't match, it triggers a recalculation. This is a purely client-side check.
-   **Alternatives considered**:
    -   **Storing state in the database**: Rejected due to high overhead for transient data. This would be slow, inefficient, and complex to manage. The `games` table should only store the persistent state of the game (FEN, whose turn, etc.), not UI-related or turn-specific transient state.

## 3. Game Mode Identification

-   **Decision**: A new column, `game_mode` (type `text`), will be added to the `games` table in the Supabase database.
-   **Rationale**:
    -   This is necessary to distinguish "Forced-Piece" games from other game types (e.g., standard, round-robin).
    -   The application logic will use this field to determine whether to activate the forced-piece mechanics on the client-side.
    -   Using a `text` field is flexible enough to accommodate future game modes without requiring schema changes for each new mode. An `enum` was considered but is less flexible for rapid iteration.
