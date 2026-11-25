import { homedir } from 'node:os';
import path from 'node:path';

export function resolveWebHome(env = process.env) {
  return path.resolve(env.COSPACE_WEB_HOME || path.join(homedir(), '.cospace', 'webapp'));
}
