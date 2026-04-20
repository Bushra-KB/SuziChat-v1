import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Loads `.env` files before Nest boots so PrismaService sees DATABASE_URL.
 * Order: monorepo root, then apps/api (local overrides).
 */
export function loadEnvBeforeNestBootstrap(): void {
  const dirs = [join(__dirname, '..', '..'), join(__dirname, '..')];

  const assignLine = (rawLine: string, override: boolean) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      return;
    }

    const equalsAt = line.indexOf('=');
    if (equalsAt <= 0) {
      return;
    }

    const key = line.slice(0, equalsAt).trim();
    if (!key) {
      return;
    }

    let value = line.slice(equalsAt + 1).trim();
    const quote =
      value.startsWith('"') && value.endsWith('"')
        ? '"'
        : value.startsWith("'") && value.endsWith("'")
          ? "'"
          : '';

    if (quote) {
      value = value.slice(1, -1).replace(/\\n/g, '\n');
    }

    if (!override && process.env[key] !== undefined) {
      return;
    }
    process.env[key] = value;
  };

  for (let index = 0; index < dirs.length; index += 1) {
    const dir = dirs[index];
    const path = join(dir, '.env');
    if (!existsSync(path)) {
      continue;
    }

    const override = index === dirs.length - 1;
    const body = readFileSync(path, 'utf8');
    for (const rawLine of body.split(/\r?\n/)) {
      assignLine(rawLine, override);
    }
  }
}
