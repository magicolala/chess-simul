# Repository Guidelines

## Project Structure & Module Organization
This is a monorepo with npm workspaces. The Angular client lives in `apps/web`, shared utilities and types are in `packages/shared`, and database work (migrations, seed data, generated types) is in `supabase`. Tooling scripts sit in `scripts`, with repo-wide config at the root (`angular.json`, `eslint.config.mjs`, `package.json`).

## Build, Test, and Development Commands
- `npm install`: install workspace dependencies.
- `npm run dev`: start the web workspace dev server (defaults to http://localhost:3000).
- `npm run build`: generate env wiring and build the Angular app.
- `npm run lint`: run ESLint on `apps/` and `packages/`.
- `npm run format` / `npm run format:check`: format or check formatting with Prettier.
- `npm test`: run the current test task (TypeScript typecheck).
- `npm run generate:env`: regenerate environment files for the build.
If you use Supabase locally, common commands are `supabase start` and `supabase migration up`.

## Coding Style & Naming Conventions
Follow `.editorconfig`: 2-space indentation, LF endings, UTF-8. Prettier is the formatter (single quotes, semicolons, 100-char print width). ESLint uses `@eslint/js` and `typescript-eslint` defaults. Keep Angular file names kebab-case (e.g., `app-shell.component.ts`, `simul-lobby.routes.ts`). Use PascalCase for types/classes and camelCase for variables and functions.

## Testing Guidelines
There is no dedicated test runner configured yet; `npm test` maps to TypeScript typechecking. When adding tests, place `*.spec.ts` alongside the feature in `apps/web/src` and wire a test runner before relying on CI coverage.

## Commit & Pull Request Guidelines
Recent commits use conventional prefixes such as `feat:`, `feat(scope):`, and `chore:` alongside plain descriptive messages. Prefer imperative, scoped summaries to match that pattern. PRs should include a short description, link related issues, note any schema or env changes, and include screenshots for UI changes. Run `npm run lint`, `npm run format:check`, and `npm test` before requesting review.

## Configuration & Secrets
Use a root `.env.local` for web-only secrets (example: `GEMINI_API_KEY`). Supabase CLI generates `.env` files under `supabase/`; do not commit them. Only the public `anon` key should appear in `apps/web/src/environments/` files, never the `service_role` key.
