import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL. Set it to a Postgres connection string before running this check.');
  process.exit(1);
}

const supabaseArgs = [
  '--yes',
  'supabase@latest',
  'gen',
  'types',
  'typescript',
  '--db-url',
  dbUrl,
  '--schema',
  'public',
];

const { status, stdout, stderr, error } = spawnSync('npx', supabaseArgs, {
  cwd: resolve('supabase'),
  encoding: 'utf8',
});

if (error) {
  console.error('Failed to run Supabase CLI:', error.message);
  process.exit(1);
}

if (status !== 0) {
  console.error('Supabase CLI exited with a non-zero status.');
  if (stdout) console.error(stdout.trim());
  if (stderr) console.error(stderr.trim());
  process.exit(status ?? 1);
}

const generated = stdout.trim();
const currentPath = resolve('supabase/types/database.types.ts');
const current = readFileSync(currentPath, 'utf8').trim();

if (generated !== current) {
  console.error('Supabase generated types differ from supabase/types/database.types.ts.');
  console.error('Run `npm run supabase:gen:types` to regenerate and commit the updated file.');
  process.exit(1);
}

console.log('Supabase generated types are up to date.');
