# Implementation Plan: Hydra Multitable Tournaments

**Branch**: `001-hydra-multitable-tournament` | **Date**: 2025-12-29 | **Spec**: `/home/ced/projet/chess-simul/specs/001-hydra-multitable-tournament/spec.md`
**Input**: Feature specification from `/specs/001-hydra-multitable-tournament/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver Hydra multitable tournaments with 2-9 simultaneous games, fixed 5+3
time control, live scoring/leaderboards, and Arena/Survival event rules. The
plan uses the existing Angular client and Supabase backend to add tournament,
matchmaking, scoring, and audit persistence with realtime updates and a
multiboard UI.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.9  
**Primary Dependencies**: Angular 21, RxJS 7.8, Supabase JS 2.89, chess.js 1.4  
**Storage**: Supabase Postgres with RLS + migrations  
**Testing**: `npm test` (Angular typecheck)  
**Target Platform**: Modern desktop/mobile browsers  
**Project Type**: Web app + Supabase backend services  
**Performance Goals**: Leaderboard updates in <= 5s; game matchmaking start <= 2 min for 95% of participants  
**Constraints**: No new frontend framework; no major refactor; 5+3 time control; max 9 concurrent games; security rules preserved  
**Scale/Scope**: Tournament sessions with up to 9 concurrent games per player; target hundreds of concurrent participants per event

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Workspace Ownership: changes stay within correct workspace; no cross-workspace
  direct file imports.
- Security & Privileged Ops: no `service_role` keys in web envs; Supabase `.env`
  files untracked; privileged writes use Edge Functions or server-only paths.
- Quality Gates: plan includes lint, format check, and typecheck before review.
- Spec-Driven Delivery: spec/plan/tasks align to user stories; doc updates planned
  for env/schema/workflow changes.
- Realtime & Performance Discipline: subscriptions filter early and keep payloads
  lean when realtime is in scope.

**Gate Status (Pre-Phase 0)**: Pass

## Project Structure

### Documentation (this feature)

```text
specs/001-hydra-multitable-tournament/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
apps/
└── web/
    └── src/
        ├── app/
        ├── environments/
        └── styles/

packages/
└── shared/
    └── src/

supabase/
├── migrations/
├── seed/
├── functions/
└── types/
```

**Structure Decision**: Use the existing monorepo split: Angular UI in
`apps/web`, shared types in `packages/shared`, and Supabase schema/functions in
`supabase`.

## Phase 0: Research

**Output**: `/home/ced/projet/chess-simul/specs/001-hydra-multitable-tournament/research.md`

Scope:

- Confirm Supabase realtime and RLS approach for live scores and game updates.
- Confirm Edge Function usage for matchmaking and scoring to avoid privileged
  client writes.

## Phase 1: Design & Contracts

**Outputs**:

- `/home/ced/projet/chess-simul/specs/001-hydra-multitable-tournament/data-model.md`
- `/home/ced/projet/chess-simul/specs/001-hydra-multitable-tournament/quickstart.md`
- `/home/ced/projet/chess-simul/specs/001-hydra-multitable-tournament/contracts/`

Design focus:

- Data model for tournaments, participants, games, PGN audit, matchmaking events,
  and score events with state transitions.
- API surface for tournament lifecycle, queue management, game state, and
  leaderboard queries.
- Realtime channels and payloads scoped to tournament/session to meet latency
  goals with minimal payloads.

**Gate Status (Post-Phase 1)**: Pass

## Phase 2: Implementation Plan

1. **Database + RLS**
   - Add tables for tournaments, participants, games, score events, matchmaking
     events, and PGN storage in `supabase/migrations`.
   - Define RLS policies for participant-scoped reads and privileged writes
     through Edge Functions.
   - Regenerate Supabase types in `supabase/types`.
2. **Matchmaking + Scoring Services**
   - Implement matchmaking queue logic with widening Elo windows and inactivity
     forfeits in Edge Functions.
   - Implement scoring updates for Arena and Survival events, including
     elimination timestamps and final ranking rules.
3. **Realtime Updates**
   - Add realtime subscriptions for games, scores, and leaderboard updates with
     lean projections and per-tournament filtering.
4. **UI: Tournament Views**
   - Multiboard mosaic layouts (1, 2-4, 5-9), highlight last opponent move, and
     optional alert sound toggle.
   - Sorting filter for board order (start order, recent activity, time
     remaining).
   - Tournament leaderboard and “my active games” views with live updates.
5. **Anti-Abandon & Recovery**
   - Enforce 20-second inactivity forfeits at game start and resolve matches
     promptly.
6. **Documentation + Checks**
   - Update docs if schema/workflow changes require it.
   - Run `npm run lint`, `npm run format:check`, and `npm test`.

## Checks

- `npm run lint`: Failed (ESLint error: `Object.hasOwn is not a function` in espree).
- `npm run format:check`: Failed (repo-wide formatting warnings).
- `npm test`: Timed out (repeated `npm run typecheck -w web` invocation).
