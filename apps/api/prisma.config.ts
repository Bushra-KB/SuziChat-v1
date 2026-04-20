import { defineConfig, env } from 'prisma/config';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function hydrateEnvFile(filePath: string, overwrite: boolean) {
  if (!existsSync(filePath)) {
    return;
  }
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (overwrite || !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const cwd = process.cwd();
hydrateEnvFile(path.join(cwd, '.env'), false);
hydrateEnvFile(path.join(cwd, '..', '.env'), false);
hydrateEnvFile(path.join(cwd, '.env'), true);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
