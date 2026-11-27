import desktop from '../package.json' with { type: 'json' };
import { localServiceStatus, stopLocalDaemon } from '../../../packages/local-runtime/src/manager.js';
import { resolveDataHome, resolveRuntimeHome } from '../../../packages/local-runtime/src/paths.js';

export async function reconcileLocalServiceVersion({ expectedVersion = desktop.version, dataHome = resolveDataHome() } = {}) {
  const runtimeHome = resolveRuntimeHome({ dataHome });
  const service = await localServiceStatus({ dataHome, runtimeHome });
  if (!service.running || service.version === expectedVersion) return service;

  if (service.activeMcpClients > 0 || service.activeUiSessions > 0) {
    throw new Error(`CoSpace service ${service.version} is active (${service.activeMcpClients} Agent connection(s), ${service.activeUiSessions} review page(s)). Disconnect Agents and close review pages before opening ${expectedVersion}.`);
  }

  await stopLocalDaemon({ dataHome, runtimeHome });
  console.log(`Stopped idle CoSpace service ${service.version}; CoSpace ${expectedVersion} can start.`);
  return { ...service, running: false };
}
