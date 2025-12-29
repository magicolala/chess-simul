# Quickstart: Hydra Multitable Tournaments

## Prerequisites
- Node.js and npm
- Supabase CLI (optional for local DB)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start Supabase locally (if using local database):
   ```bash
   npm run supabase:start
   ```

3. Apply migrations and regenerate types (if schema changes were added):
   ```bash
   npm run supabase:migrate:up
   npm run supabase:gen:types
   ```

4. Start the web app:
   ```bash
   npm run dev
   ```

## Feature Smoke Test

1. Create or join a Hydra tournament session.
2. Enter matchmaking to open 2+ concurrent games.
3. Verify mosaic layout, last-move highlight, and score updates.
4. Check leaderboard and “my active games” views update in real time.
