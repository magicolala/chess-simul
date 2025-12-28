#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const envFile = process.env.SUPABASE_ENV_FILE ?? 'supabase/.env';

function formatCommand(command, args) {
  return [command, ...args].join(' ');
}

function runStep(title, command, args) {
  console.log(`\n▶️  ${title}`);
  console.log(`$ ${formatCommand(command, args)}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env: process.env });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${formatCommand(command, args)}`));
      }
    });
  });
}

async function main() {
  const migrationArgs = ['migration', 'up', '--all'];

  if (envFile && existsSync(envFile)) {
    migrationArgs.push('--env-file', envFile);
  }

  await runStep('Start the local Supabase stack (idempotent)', 'supabase', ['start']);
  await runStep('Apply latest migrations', 'supabase', migrationArgs);
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`);
  process.exit(1);
});
