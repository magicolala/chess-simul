---

description: "Task list for Hydra Multitable Tournaments implementation"
---

# Tasks: Hydra Multitable Tournaments

**Input**: Design documents from `/specs/001-hydra-multitable-tournament/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not requested in spec; no test tasks included.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared types

- [x] T001 Create shared Hydra types in `packages/shared/src/types/hydra.types.ts` and export from `packages/shared/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T002 Create Hydra schema migration in `supabase/migrations/20251229_hydra_tournaments.sql`
- [x] T003 Add RLS policies for Hydra tables in `supabase/migrations/20251229_hydra_tournaments_rls.sql`
- [x] T004 Regenerate Supabase types in `supabase/types/database.types.ts`
- [x] T005 Create tournament/leaderboard Edge Function in `supabase/functions/hydra-tournaments/index.ts`
- [x] T006 Create matchmaking Edge Function scaffold in `supabase/functions/hydra-matchmaking/index.ts`
- [x] T007 Create scoring Edge Function scaffold in `supabase/functions/hydra-scoring/index.ts`
- [x] T008 [P] Add realtime subscription helper in `apps/web/src/services/hydra-realtime.service.ts`
- [x] T009 Add Hydra data service in `apps/web/src/services/hydra-tournament.service.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Multitable Play Experience (Priority: P1) 🎯 MVP

**Goal**: Multiboard view with 2-9 concurrent games, highlight/sound on opponent move, and board ordering filters.

**Independent Test**: Join a Hydra tournament session, open 2-9 games, verify layout, highlight, sound toggle, and sorting controls.

### Implementation for User Story 1

- [x] T010 [US1] Add Hydra tournament route in `apps/web/src/app.routes.ts`
- [x] T011 [US1] Create tournament page shell in `apps/web/src/pages/hydra-tournament-page.component.ts`
- [x] T012 [P] [US1] Create mosaic layout component in `apps/web/src/components/hydra-board-mosaic.component.ts`
- [x] T013 [P] [US1] Create board tile component with highlight in `apps/web/src/components/hydra-board-tile.component.ts`
- [x] T014 [US1] Wire active games data into the page via `apps/web/src/services/hydra-tournament.service.ts`
- [x] T015 [US1] Add board ordering filter (start order, recent activity, time remaining) in `apps/web/src/components/hydra-board-mosaic.component.ts`
- [x] T016 [US1] Add last-move sound toggle using `apps/web/src/services/preferences.service.ts` and bind in `apps/web/src/pages/hydra-tournament-page.component.ts`
- [x] T017 [US1] Ensure 5+3 time control display in `apps/web/src/components/hydra-board-tile.component.ts`

**Checkpoint**: User Story 1 is fully functional and independently testable

---

## Phase 4: User Story 2 - Tournament Scoring and Rankings (Priority: P2)

**Goal**: Live Hydra scoring, Arena/Survival ranking rules, and leaderboard view.

**Independent Test**: Complete win/draw/loss sequences and verify score updates, Arena end handling, and Survival elimination ranking.

### Implementation for User Story 2

- [x] T018 [US2] Implement score updates and elimination logic in `supabase/functions/hydra-scoring/index.ts`
- [x] T019 [US2] Implement leaderboard aggregation in `supabase/functions/hydra-tournaments/index.ts`
- [x] T020 [P] [US2] Create leaderboard component in `apps/web/src/components/hydra-leaderboard.component.ts`
- [x] T021 [US2] Wire leaderboard into `apps/web/src/pages/hydra-tournament-page.component.ts`
- [x] T022 [US2] Subscribe to score/leaderboard realtime updates in `apps/web/src/services/hydra-realtime.service.ts`

**Checkpoint**: User Story 2 works independently with live scoring and rankings

---

## Phase 5: User Story 3 - Matchmaking and Active Games Management (Priority: P3)

**Goal**: Global matchmaking queue with Elo widening and anti-abandon enforcement.

**Independent Test**: Enter queue, observe Elo window widening, create multiple games, and confirm inactivity forfeits resolve quickly.

### Implementation for User Story 3

- [x] T023 [US3] Implement queue join/leave and Elo widening in `supabase/functions/hydra-matchmaking/index.ts`
- [x] T024 [US3] Enforce 9-game cap and 5+3 time control on new games in `supabase/functions/hydra-matchmaking/index.ts`
- [x] T025 [US3] Implement inactivity forfeit handling in `supabase/functions/hydra-matchmaking/index.ts`
- [x] T026 [US3] Add matchmaking client service in `apps/web/src/services/hydra-matchmaking.service.ts`
- [x] T027 [US3] Add queue controls to `apps/web/src/pages/hydra-tournament-page.component.ts`

**Checkpoint**: User Story 3 works independently and does not block opponents

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final validation

- [x] T028 [P] Document Hydra tournaments in `docs/hydra-tournaments.md`
- [x] T029 Validate quickstart steps and update `specs/001-hydra-multitable-tournament/quickstart.md` if needed
- [x] T030 Run checks and record results in `specs/001-hydra-multitable-tournament/plan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependencies
- **User Story 2 (P2)**: Can start after Foundational - no dependencies
- **User Story 3 (P3)**: Can start after Foundational - no dependencies

### Parallel Opportunities

- T008 can run in parallel with T005-T007 (distinct files)
- T012 and T013 can run in parallel
- T020 can run in parallel with T018/T019

---

## Parallel Example: User Story 1

```bash
Task: "Create mosaic layout component in apps/web/src/components/hydra-board-mosaic.component.ts"
Task: "Create board tile component with highlight in apps/web/src/components/hydra-board-tile.component.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the independent test for User Story 1

### Incremental Delivery

1. Setup + Foundational
2. User Story 1 → Validate → Demo
3. User Story 2 → Validate → Demo
4. User Story 3 → Validate → Demo
5. Polish tasks
