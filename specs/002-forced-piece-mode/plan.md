# Implementation Plan: Forced-Piece Game Mode

**Branch**: `002-forced-piece-mode` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-forced-piece-mode/spec.md`

## Summary

This plan outlines the implementation of the "Forced-Piece Game Mode". In this mode, a client-side Stockfish engine determines the piece a player must move each turn. The technical approach involves loading Stockfish.js in a Web Worker to avoid blocking the UI, managing the turn-specific forced-move state entirely on the client, and adding a `game_mode` field to the `games` table in Supabase to identify these games.

## Technical Context

**Language/Version**: TypeScript ^5.9.3
**Primary Dependencies**: React, Supabase, Stockfish.js (from CDN)
**Storage**: Supabase (PostgreSQL)
**Testing**: Vitest, Playwright
**Target Platform**: Web browser
**Project Type**: Monorepo (`apps/web`, `packages/shared`, `supabase`)
**Performance Goals**: UI updates for forced piece < 200ms after calculation; recalculation on desync < 500ms.
**Constraints**: The chess engine logic must run in the browser without freezing the UI, even on lower-end devices.
**Scale/Scope**: The feature is scoped to a new game mode for a 1v1 game.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

-   [X] **Workspace Ownership**: Changes will be primarily in `apps/web` (UI and engine logic) and `supabase/migrations` (schema change). No cross-workspace imports needed.
-   [X] **Security & Privileged Ops**: No new privileged operations are required. The engine is client-side, and the schema change is safe.
-   [X] **Quality Gates**: All code will pass `npm run lint`, `format:check`, and `test` before review.
-   [X] **Spec-Driven Delivery**: This plan and the associated artifacts (`research.md`, `data-model.md`) are aligned with the user stories in the spec. A migration will be documented.
-   [ ] **Realtime & Performance Discipline**: Not directly in scope as the core logic is client-side, but the plan respects performance by using a Web Worker and handling desync efficiently.

**Result**: All checks pass.

## Project Structure

### Documentation (this feature)

```text
specs/002-forced-piece-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output, details Stockfish.js integration
├── data-model.md        # Phase 1 output, details schema and state changes
├── contracts/           # Not needed for this feature
└── quickstart.md        # To be created if complex setup is needed
```

### Source Code (repository root)

The feature implementation will affect the `apps/web` and `supabase` workspaces.

```text
# Web Application Structure
apps/web/
└── src/
    ├── components/
    │   └── game/              # Components related to the chessboard and game view
    │       ├── forced-piece-overlay.component.tsx    # New: Component to highlight the forced piece
    │       └── ...
    ├── pages/
    │   └── game/
    │       └── game.page.tsx  # Existing: Will be modified to include the new mode's logic
    ├── services/
    │   ├── stockfish.service.ts   # New: Wrapper for Stockfish.js Web Worker
    │   └── ...
    └── state/
        └── game.store.ts      # Existing or New: To manage game state, including forced-piece transient state

# Database Structure
supabase/
└── migrations/
    └── [YYYYMMDDHHMMSS]_add_game_mode.sql   # New: Migration to add the game_mode column
```

**Structure Decision**: The implementation will integrate into the existing `apps/web` and `supabase` structure, following the established patterns of the monorepo. A new service will encapsulate the engine logic, and a new component will handle the UI overlay. State management will be integrated into the existing game state solution. A new database migration will handle the schema change.

## Complexity Tracking

No constitutional violations requiring justification.
