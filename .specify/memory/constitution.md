<!--
Sync Impact Report
- Version change: N/A (template) -> 1.0.0
- Modified principles: template principle 1 -> I. Workspace Ownership; template principle 2 -> II. Security & Privileged Operations; template principle 3 -> III. Quality Gates (Non-Negotiable); template principle 4 -> IV. Spec-Driven Delivery; template principle 5 -> V. Realtime & Performance Discipline
- Added sections: Environment & Deployment Constraints; Development Workflow & Review
- Removed sections: None
- Templates requiring updates: ✅ .specify/templates/plan-template.md; ✅ .specify/templates/spec-template.md (no changes needed); ✅ .specify/templates/tasks-template.md (no changes needed); ⚠ .specify/templates/commands/*.md (directory missing)
- Follow-up TODOs: TODO(RATIFICATION_DATE)
-->
# Chess Simul Monorepo Constitution

## Core Principles

### I. Workspace Ownership
- All UI code lives in `apps/web`, shared types/utilities in `packages/shared`, and
  database work (migrations, seed data, generated types) in `supabase`.
- Cross-workspace dependencies MUST go through package boundaries; do not import
  files directly across workspaces.
- Repository tooling and shared scripts live at the root or in `scripts`.
Rationale: Clear boundaries prevent circular dependencies and keep ownership explicit.

### II. Security & Privileged Operations
- Only the public `anon` key may appear in `apps/web/src/environments/`.
- Never commit Supabase `.env` files; web-only secrets belong in root `.env.local`.
- Privileged database writes MUST go through Edge Functions or server-only code,
  with RLS policies enforced and validated.
Rationale: Client bundles must remain safe, and database access must be auditable.

### III. Quality Gates (Non-Negotiable)
- Before review or merge, changes MUST pass `npm run lint`, `npm run format:check`,
  and `npm test` (TypeScript typecheck).
- Code MUST follow `.editorconfig` and Prettier formatting; do not bypass tooling.
Rationale: Automated checks keep the monorepo consistent and prevent regressions.

### IV. Spec-Driven Delivery
- Feature work MUST include a spec (`/specs/.../spec.md`), plan, and tasks aligned
  to user stories, with acceptance scenarios defined up front.
- If a feature requires tests, they MUST be listed and written to fail before
  implementation.
- Changes that alter environments, schemas, or workflows MUST update docs.
Rationale: Specs keep scope aligned and make delivery measurable and reviewable.

### V. Realtime & Performance Discipline
- Realtime subscriptions MUST filter early and keep payloads lean (select only the
  columns needed).
- Prefer incremental updates and paginated history over full-table streams.
- Avoid heavy computed fields in realtime payloads unless justified.
Rationale: Realtime features must remain fast and scalable for live play.

## Environment & Deployment Constraints

- Build and deploy MUST use the generated environment wiring (`npm run generate:env`).
- Schema changes MUST be captured in `supabase/migrations` and accompanied by
  regenerated types under `supabase/types`.
- CI is authoritative; do not merge when lint, typecheck, or build fails.

## Development Workflow & Review

- Angular files MUST use kebab-case names; types/classes are PascalCase and
  variables/functions are camelCase.
- Reviews MUST verify constitution compliance and document any approved exception
  in the plan's "Complexity Tracking" section.
- Use conventional, imperative commit prefixes when possible (`feat:`, `chore:`).

## Governance

- This constitution supersedes other practices; conflicts MUST be resolved in favor
  of this document.
- Amendments require a documented rationale, review by maintainers, and an updated
  Sync Impact Report.
- Versioning follows semantic intent: MAJOR for incompatible governance changes,
  MINOR for new or expanded principles/sections, PATCH for clarifications.
- Reviews MUST include a constitution check; violations require explicit approval
  and a mitigation plan.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not found in repo. | **Last Amended**: 2025-12-29
