# Tasks: Round Robin Simul Sessions

**Input**: Design documents from `/specs/001-round-robin-simul/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: No test tasks generated (not explicitly requested in spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create session/join response types in `packages/shared/src/simul-round-robin.types.ts`
- [x] T002 [P] Re-export round-robin simul types from `packages/shared/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T003 Add Supabase schema for sessions, participants, and game links in `supabase/migrations/20260103000000_round_robin_simul.sql`
- [x] T004 [P] Define RLS policies for session visibility and participation in `supabase/migrations/20260103000000_round_robin_simul.sql`
- [x] T005 Regenerate Supabase types in `supabase/types/database.types.ts`
- [x] T006 [P] Add shared SQL helper functions or enums (if needed) in `supabase/migrations/20260103000000_round_robin_simul.sql`
- [x] T007 Scaffold Edge Function router in `supabase/functions/simul-sessions/index.ts`
- [x] T008 [P] Add CORS handling and auth checks in `supabase/functions/simul-sessions/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Start a Private Simul (Priority: P1) 🎯 MVP

**Goal**: Organizer can create a private simul session, share link, and manually start round-robin games.

**Independent Test**: Create a session, view the lobby roster, start with 2+ participants, and verify games are created.

### Implementation for User Story 1

- [x] T009 [US1] Implement session creation endpoint in `supabase/functions/simul-sessions/index.ts` (POST /simul-sessions)
- [x] T010 [US1] Implement session start endpoint in `supabase/functions/simul-sessions/index.ts` (POST /simul-sessions/{id}/start)
- [x] T011 [US1] Enforce roster lock after start in `supabase/functions/simul-sessions/index.ts` (reject joins when status=started)
- [x] T012 [US1] Prevent auto-start by validating start is organizer-triggered in `supabase/functions/simul-sessions/index.ts`
- [x] T013 [US1] Add session service calls in `apps/web/src/services/round-robin-simul.service.ts`
- [x] T014 [P] [US1] Create organizer lobby UI in `apps/web/src/components/round-robin-lobby.component.ts`
- [x] T015 [US1] Wire lobby into a page/view in `apps/web/src/pages/round-robin-simul-page.component.ts`
- [x] T016 [US1] Route or view state integration in `apps/web/src/app.routes.ts` and `apps/web/src/app.component.ts`
- [x] T017 [US1] Enforce start guard (min 2 participants) in `apps/web/src/components/round-robin-lobby.component.ts`

**Checkpoint**: User Story 1 fully functional and testable independently

---

## Phase 4: User Story 2 - Join via Share Link (Priority: P2)

**Goal**: Participants can join a private session through a share link and appear in the lobby roster without duplicates.

**Independent Test**: Join via invite link, appear once in roster, and confirm duplicate joins are blocked.

### Implementation for User Story 2

- [x] T018 [US2] Implement join endpoint in `supabase/functions/simul-sessions/index.ts` (POST /simul-sessions/{id}/join)
- [x] T019 [US2] Implement session detail endpoint in `supabase/functions/simul-sessions/index.ts` (GET /simul-sessions/{id})
- [x] T020 [US2] Add join flow in `apps/web/src/pages/round-robin-simul-page.component.ts` (invite link parsing)
- [x] T021 [US2] Update roster rendering + duplicate prevention in `apps/web/src/components/round-robin-lobby.component.ts`
- [x] T022 [US2] Add participant join call in `apps/web/src/services/round-robin-simul.service.ts`

**Checkpoint**: User Story 2 fully functional and testable independently

---

## Phase 5: User Story 3 - Access Generated Matches (Priority: P3)

**Goal**: Participants can view and access their generated round-robin games with status updates.

**Independent Test**: Start a 3-player session and verify each player sees N-1 games with status updates.

### Implementation for User Story 3

- [x] T023 [US3] Implement session games endpoint in `supabase/functions/simul-sessions/index.ts` (GET /simul-sessions/{id}/games)
- [x] T024 [US3] Add games fetch to `apps/web/src/services/round-robin-simul.service.ts`
- [x] T025 [US3] Create match list UI in `apps/web/src/components/round-robin-games.component.ts`
- [x] T026 [US3] Render match list in `apps/web/src/pages/round-robin-simul-page.component.ts`
- [x] T027 [US3] Add deep link handling for games in `apps/web/src/app.component.ts`

**Checkpoint**: User Story 3 fully functional and testable independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T028 [P] Add realtime roster subscription in `apps/web/src/services/round-robin-realtime.service.ts`
- [x] T029 [P] Add realtime game status subscription in `apps/web/src/services/round-robin-realtime.service.ts`
- [x] T030 Update Edge Function error responses and CORS headers in `supabase/functions/simul-sessions/index.ts`
- [x] T031 Update `specs/001-round-robin-simul/quickstart.md` with any new setup or steps
- [ ] T032 Run `npm run lint`, `npm run format:check`, and `npm test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - integrates with US1 session objects
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - depends on US1 start flow

### Parallel Opportunities

- T001 and T002 can run in parallel
- T003 and T004 can run in parallel (same migration file but separable if coordinated)
- T007 and T008 can run in parallel
- T014 and T015 can run in parallel
- T028 and T029 can run in parallel

---

## Parallel Example: User Story 1

```bash
Task: "Implement session creation endpoint in supabase/functions/simul-sessions/index.ts"
Task: "Create organizer lobby UI in apps/web/src/components/round-robin-lobby.component.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. STOP and validate User Story 1 independently (create, invite, start, game generation)

### Incremental Delivery

1. Setup + Foundational
2. User Story 1 → Validate → Demo
3. User Story 2 → Validate → Demo
4. User Story 3 → Validate → Demo
5. Polish and quality gates
