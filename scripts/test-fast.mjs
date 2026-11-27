import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// The full suite covers these slower process, update, and recovery scenarios.
const integrationTests = new Set([
]);
const files = readdirSync('test')
  .filter(name => name.endsWith('.test.js') && !integrationTests.has(name))
  .sort()
  .map(name => `test/${name}`);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
