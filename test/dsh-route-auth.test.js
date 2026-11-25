import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { apply } from '../adapters/dsh/index.js';

function createHarness(connection) {
  let route;
  const disposers = [];
  const ctx = {
    get: name => (name === 'connection' ? connection : undefined),
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

function invoke(handler, headers) {
  const res = {
    status: 0,
    body: '',
    writeHead(status) { this.status = status; },
    end(body) { this.body = body; },
  };
  handler({ method: 'POST', url: '/cospace-api', headers }, res);
  return res;
}

test('the CoSpace HTTP route applies the DSH connection admission check', () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-route-auth-'));
  const previous = process.env.DSH_SPACE_HOME;
  process.env.DSH_SPACE_HOME = home;
  let seenHeaders;
  const { route, dispose } = createHarness({
    requestRejection: ({ headers }) => {
      seenHeaders = headers;
      return headers['x-space-test'] === 'deny' ? 403 : undefined;
    },
  });
  try {
    const rejected = invoke(route.handler, { 'x-space-test': 'deny' });
    assert.equal(seenHeaders['x-space-test'], 'deny');
    assert.equal(rejected.status, 403);
    assert.equal(JSON.parse(rejected.body).error.code, 'FORBIDDEN');
  } finally {
    dispose();
    if (previous === undefined) delete process.env.DSH_SPACE_HOME;
    else process.env.DSH_SPACE_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
});

test('the CoSpace HTTP route fails closed without the DSH connection service', () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-route-auth-missing-'));
  const previous = process.env.DSH_SPACE_HOME;
  process.env.DSH_SPACE_HOME = home;
  const { route, dispose } = createHarness(undefined);
  try {
    const response = invoke(route.handler, {});
    assert.equal(response.status, 503);
    assert.equal(JSON.parse(response.body).error.code, 'UNAVAILABLE');
  } finally {
    dispose();
    if (previous === undefined) delete process.env.DSH_SPACE_HOME;
    else process.env.DSH_SPACE_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
});

test('an admitted request still reaches the CoSpace API', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-route-auth-allow-'));
  const previous = process.env.DSH_SPACE_HOME;
  process.env.DSH_SPACE_HOME = home;
  const { route, dispose } = createHarness({ requestRejection: () => undefined });
  try {
    const req = {
      method: 'POST',
      url: '/cospace-api',
      headers: {},
      async *[Symbol.asyncIterator]() {
        yield Buffer.from(JSON.stringify({ method: 'listDocuments' }));
      },
    };
    const res = {
      status: 0,
      body: '',
      writeHead(status) { this.status = status; },
      end(body) { this.body = body; },
    };
    await route.handler(req, res);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.body), { result: [] });
  } finally {
    dispose();
    if (previous === undefined) delete process.env.DSH_SPACE_HOME;
    else process.env.DSH_SPACE_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
});
