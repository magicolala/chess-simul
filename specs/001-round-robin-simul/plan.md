# Implementation Plan: Round Robin Simul Sessions

**Branch**: `001-round-robin-simul` | **Date**: 2026-01-03 | **Spec**: /home/ced/projet/chess-simul/specs/001-round-robin-simul/spec.md
**Input**: Feature specification from `/specs/001-round-robin-simul/spec.md`

## Summary

Deliver private round-robin simul sessions with invite links, lobby roster, manual start, and auto-generated pairwise games. Implement with new Supabase data and Edge Functions for privileged writes, Angular UI updates for lobby and match list, and realtime updates filtered to session scope.

## Technical Context

**Language/Version**: TypeScript (Angular app)  
**Primary Dependencies**: Angular, Supabase JS client, RxJS  
**Storage**: Supabase Postgres (sessions, participants, games)  
**Testing**: `npm test` (TypeScript typecheck), no dedicated test runner yet  
**Target Platform**: Web (desktop + mobile browsers)  
**Project Type**: Monorepo web app with shared packages and Supabase backend  
**Performance Goals**: Generate all round-robin games within 5 seconds for up to 20 participants  
**Constraints**: Client uses anon key only; privileged writes via Edge Functions; realtime payloads lean  
**Scale/Scope**: Private sessions only, no predefined participant cap, expected small groups (<=20)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Workspace Ownership: UI changes in `apps/web`, shared types in `packages/shared`, DB/Edge in `supabase`.
- Security & Privileged Ops: no service role keys in client; Edge Functions handle privileged writes with RLS.
- Quality Gates: plan includes `npm run lint`, `npm run format:check`, `npm test` before review.
- Spec-Driven Delivery: spec/plan/tasks align to user stories; doc updates included for schema/workflow changes.
- Realtime & Performance Discipline: session-scoped subscriptions with minimal columns.

## Project Structure

### Documentation (this feature)

```text
specs/001-round-robin-simul/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/

packages/shared/
└── src/

supabase/
├── functions/
├── migrations/
└── types/
```

**Structure Decision**: Web monorepo structure with Angular UI in `apps/web`, shared types in `packages/shared`, and Supabase data/functions in `supabase`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |

## Phase 0: Research Summary

All technical decisions are aligned with existing Supabase + Angular architecture; no open clarifications.

## Phase 1: Design Summary

- Data model defines sessions, participants, and round-robin games tied to existing game records.
- Contracts document session creation, joining, start, and listing routes for UI integration.
- Quickstart outlines a manual test flow for organizer and participants.

Post-design Constitution Check: PASS.

## Phase 2: Implementation Plan (Preview)

1. Add Supabase schema/migrations for simul sessions and participants; update types.
2. Implement Edge Functions for create/join/start actions with roster locking and pairwise game creation.
3. Update Angular UI/services for lobby creation, join via link, roster display, and game list.
4. Add realtime subscriptions scoped to session for lobby and game updates.
5. Update docs and run `npm run lint`, `npm run format:check`, `npm test`.
