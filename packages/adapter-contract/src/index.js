/** Version of the adapter-to-CoSpace integration contract. */
export const ADAPTER_CONTRACT_VERSION = 1;

/**
 * Stable, optional host capabilities. These describe host integration only;
 * the core's document and review operations are exposed separately through
 * its transport API.
 */
export const HOST_CAPABILITIES = Object.freeze([
  'conversation.current.read',
  'conversation.create',
  'conversation.open',
  'conversation.send',
  'conversation.references.insert',
  'conversation.references.render',
  'workspace.list',
  'workspace.select',
  'identity.current.read',
  'navigation.document.open',
  'navigation.deepLink.register',
  'files.export.save',
  'files.import.choose',
  'clipboard.write',
  'clipboard.read',
  'notifications.show',
  'application.lifecycle.observe',
  'application.window.open',
  'application.shortcuts.register',
  'updates.subscribe',
  'runtime.localService.manage',
  'runtime.localStorage.choose',
]);

const knownCapabilities = new Set(HOST_CAPABILITIES);

function capabilityList(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  const result = new Set();
  for (const capability of value) {
    if (typeof capability !== 'string' || !knownCapabilities.has(capability)) {
      throw new TypeError(`Unknown ${label} entry: ${String(capability)}`);
    }
    result.add(capability);
  }
  return result;
}

/**
 * Validate an adapter's static declaration and intersect it with runtime
 * availability. Runtime availability may shrink the declaration, never grow
 * it. Missing runtime entries are unavailable, which makes older hosts safe.
 * @param {{id:string, version:string, contractVersion:number, capabilities:string[]}} declaration
 * @param {string[]} [availableNow]
 * @returns {{id:string, version:string, contractVersion:number, declared:string[], available:string[]}}
 */
export function resolveAdapterCapabilities(declaration, availableNow = []) {
  if (!declaration || typeof declaration !== 'object') throw new TypeError('Adapter declaration is required');
  if (typeof declaration.id !== 'string' || !/^[a-z][a-z0-9.-]*$/.test(declaration.id)) {
    throw new TypeError('Adapter id must be a lowercase identifier');
  }
  if (typeof declaration.version !== 'string' || declaration.version.length === 0) {
    throw new TypeError('Adapter version is required');
  }
  if (declaration.contractVersion !== ADAPTER_CONTRACT_VERSION) {
    throw new TypeError(`Unsupported adapter contract version: ${declaration.contractVersion}`);
  }
  const declared = capabilityList(declaration.capabilities, 'declared capability');
  const available = capabilityList(availableNow, 'runtime capability');
  return Object.freeze({
    id: declaration.id,
    version: declaration.version,
    contractVersion: declaration.contractVersion,
    declared: Object.freeze([...declared]),
    available: Object.freeze([...declared].filter(capability => available.has(capability))),
  });
}

/**
 * Require an adapter capability at an optional call site. Callers should
 * choose a documented fallback when this returns false.
 * @param {{available?:string[]}|null|undefined} resolved
 * @param {string} capability
 */
export function supportsCapability(resolved, capability) {
  return Array.isArray(resolved?.available) && resolved.available.includes(capability);
}
