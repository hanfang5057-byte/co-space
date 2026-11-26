import path from 'node:path';
import { startLocalService } from '../../../packages/local-runtime/src/service.js';
import { resolveDataHome, resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';

async function run() {
  const dataHome = path.resolve(process.env.COSPACE_DATA_HOME || resolveDataHome());
  const runtimeHome = path.resolve(process.env.COSPACE_RUNTIME_HOME || resolveRuntimeHome({ dataHome }));
  const versionHome = path.resolve(process.env.COSPACE_VERSION_HOME || path.dirname(process.argv[1]));
  const version = process.env.COSPACE_PACKAGE_VERSION || '0.0.0';
  const service = await startLocalService({ dataHome, runtimeHome, versionHome, version });
  let stopping;
  const shutdown = () => stopping ??= service.close().finally(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

run().catch(error => {
  process.stderr.write(`CoSpace Local Server daemon: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
