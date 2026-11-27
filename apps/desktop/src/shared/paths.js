import path from 'node:path';
import { existsSync } from 'node:fs';
import { resolveDataHome, resolveLegacyDataHome } from '../../../../packages/local-runtime/src/paths.js';

export function resolveWebHome(env = process.env) {
  return resolveDataHome(env);
}

export function migrationStatus(env = process.env) {
  const sourceHome = resolveLegacyDataHome(env);
  const destinationHome = resolveWebHome(env);
  return { sourceHome, destinationHome, required: !existsSync(destinationHome), hasLegacy: existsSync(path.join(sourceHome, 'review.sqlite')) };
}
