import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { apply } from '../adapters/dsh/index.js';

/**
 * Minimal Host context: admission belongs to `webServer.register`, so the
 * harness only records the registration and never supplies `connection`.
 */
function createHarness() {
  let route;
  const disposers = [];
  const ctx = {
    get: () => undefined,
    inject: (_deps, callback) => callback(ctx),
    effect: callback => {
      const dispose = callback();
      if (typeof dispose === 'function') disposers.push(dispose);
    },
    mcpManager: { register: () => () => {} },
    webServer: {
      register: value => {
        route = value;
        return () => {};
      },
    },
  };
  apply(ctx);
  return { route, dispose: () => disposers.reverse().forEach(dispose => dispose?.()) };
}

function request(body) {
  return {
    method: 'POST',
    url: '/cospace-api',
    headers: {},
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify(body));
    },
  };
}

function response() {
  return {
    status: 0,
    body: '',
    writeHead(status) { this.status = status; },
    end(body) { this.body = body; },
  };
}

test('the CoSpace HTTP route delegates admission to the Host with auth required', () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-route-auth-'));
  const previous = process.env.DSH_SPACE_HOME;
  process.env.DSH_SPACE_HOME = home;
  const { route, dispose } = createHarness();
  try {
    assert.equal(route.kind, 'prefix');
    assert.equal(route.path, '/cospace-api');
    assert.equal(route.auth, 'required');
    assert.equal(typeof route.handler, 'function');
  } finally {
    dispose();
    if (previous === undefined) delete process.env.DSH_SPACE_HOME;
    else process.env.DSH_SPACE_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
});

test('an admitted request reaches the CoSpace API without the connection service', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-route-auth-allow-'));
  const previous = process.env.DSH_SPACE_HOME;
  process.env.DSH_SPACE_HOME = home;
  const { route, dispose } = createHarness();
  try {
    const res = response();
    await route.handler(request({ method: 'listDocuments' }), res);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.body), { result: [] });
  } finally {
    dispose();
    if (previous === undefined) delete process.env.DSH_SPACE_HOME;
    else process.env.DSH_SPACE_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
});
