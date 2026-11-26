import { resolveDataHome } from '../../../../packages/local-runtime/src/paths.js';

export function resolveWebHome(env = process.env) {
  return resolveDataHome(env);
}
