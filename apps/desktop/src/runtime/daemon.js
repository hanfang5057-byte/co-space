import path from 'node:path';
import { startLocalService } from '../../../../packages/local-runtime/src/service.js';
import { resolveRuntimeHome } from '../../../../packages/local-runtime/src/paths.js';
import { resolveWebHome } from '../shared/paths.js';
import { backupBeforeVersionChange, recordHealthyVersion } from './backup.js';

async function run() {
  const dataHome = path.resolve(process.env.COSPACE_DATA_HOME || resolveWebHome());
  const runtimeHome = path.resolve(process.env.COSPACE_RUNTIME_HOME || resolveRuntimeHome({ dataHome }));
  const versionHome = path.resolve(process.env.COSPACE_VERSION_HOME || path.dirname(process.argv[1]));
  const version = process.env.COSPACE_PACKAGE_VERSION || '0.0.0';
  await backupBeforeVersionChange(dataHome, version);
  const service = await startLocalService({ dataHome, runtimeHome, versionHome, version, beforeAdvertise: () => recordHealthyVersion(dataHome, version) });
  let stopping;
  const shutdown = () => stopping ??= service.close().finally(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

run().catch(error => {
  process.stderr.write(`CoSpace desktop service: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
