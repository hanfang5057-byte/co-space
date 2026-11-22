import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSendTarget } from '../server/send-target.js';

const session = (sessionId, updatedAt = 1, cwd = undefined) => ({ sessionId, updatedAt, ...(cwd === undefined ? {} : { cwd }) });
const workspace = (id, overrides = {}) => ({
  id,
  title: id,
  path: `/workspace/${id}`,
  sessionIds: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const services = overrides => {
  const result = {
    sessionController: {
      list: async () => ({ items: [] }),
      create: async () => ({ sessionId: 'created-session' }),
      state: async () => ({ active: false }),
      ...overrides?.sessionController,
    },
    workspaceRegistry: { list: () => [], ...overrides?.workspaceRegistry },
    workspaceController: {
      initializeDefault: async () => undefined,
      create: async ({ path }) => ({ workspace: workspace('adopted', { path }) }),
      ...overrides?.workspaceController,
    },
    workingDirectory: { defaultDirectory: '/default', ...overrides?.workingDirectory },
  };
  if (overrides && 'workspaceController' in overrides) result.workspaceController = overrides.workspaceController;
  if (overrides && 'workspaceRegistry' in overrides) result.workspaceRegistry = overrides.workspaceRegistry;
  return result;
};

test('an explicit session is validated and reused', async () => {
  const seen = [];
  const target = await resolveSendTarget({ sessionId: 's-1' }, services({
    sessionController: {
      state: async request => { seen.push(request); return { active: true }; },
    },
  }));
  assert.deepEqual(target, { sessionId: 's-1', created: false });
  assert.deepEqual(seen, [{ sessionId: 's-1' }]);
});

test('an invalid explicit session is rejected before any comment is marked sending', async () => {
  await assert.rejects(
    resolveSendTarget({ sessionId: 'missing' }, services({
      sessionController: { state: async () => { throw new Error('not found'); } },
    })),
    error => error.code === 'SESSION_UNAVAILABLE',
  );
});

test('no current session reuses the most recently active workspace', async () => {
  const calls = [];
  const target = await resolveSendTarget({}, services({
    sessionController: {
      list: async () => ({ items: [session('old', 1), session('new', 20)] }),
      create: async request => { calls.push(request); return { sessionId: 'fresh' }; },
    },
    workspaceRegistry: {
      list: () => [
        workspace('stale', { sessionIds: ['old'] }),
        workspace('active', { sessionIds: ['new'], title: 'Active repo' }),
      ],
    },
  }));
  assert.equal(target.sessionId, 'fresh');
  assert.equal(target.created, true);
  assert.equal(target.workspace.workspaceId, 'active');
  assert.deepEqual(calls, [{ workspaceId: 'active' }]);
});

test('a blank conversation already in the workspace is reused', async () => {
  const calls = [];
  const target = await resolveSendTarget({}, services({
    sessionController: {
      list: async () => ({ items: [{ sessionId: 'blank', blank: true, cwd: '/workspace/active', updatedAt: 5 }] }),
      create: async request => { calls.push(request); return { sessionId: 'blank' }; },
    },
    workspaceRegistry: {
      list: () => [workspace('active', { path: '/workspace/active', sessionIds: ['blank'] })],
    },
  }));
  assert.equal(target.sessionId, 'blank');
  assert.equal(target.created, true);
  assert.deepEqual(calls, [{ workspaceId: 'active', sessionId: 'blank' }]);
});

test('no workspace creates the default workspace during first use', async () => {
  const target = await resolveSendTarget({}, services({
    workspaceController: {
      initializeDefault: async () => ({ workspace: workspace('default', { title: 'Documents' }) }),
    },
  }));
  assert.equal(target.sessionId, 'created-session');
  assert.equal(target.workspace.workspaceId, 'default');
});

test('ungrouped sessions adopt their directory as a workspace', async () => {
  const created = [];
  const target = await resolveSendTarget({}, services({
    sessionController: {
      list: async () => ({ items: [session('s', 10, '/project')] }),
      create: async request => { created.push(request); return { sessionId: 'fresh' }; },
    },
    workspaceController: {
      initializeDefault: async () => undefined,
      create: async ({ path }) => { created.push({ path }); return { workspace: workspace('adopted', { path }) }; },
    },
  }));
  assert.equal(target.sessionId, 'fresh');
  assert.equal(target.workspace.workspaceId, 'adopted');
  assert.deepEqual(created, [{ path: '/project' }, { workspaceId: 'adopted' }]);
});

test('a host without workspace services still creates a session from the default directory', async () => {
  const target = await resolveSendTarget({}, services({
    workspaceController: undefined,
    workspaceRegistry: undefined,
    sessionController: {
      list: async () => ({ items: [] }),
      create: async () => ({ sessionId: 'cwd-session' }),
    },
  }));
  assert.deepEqual(target, { sessionId: 'cwd-session', created: true });
});

test('no usable sessions or workspaces fails with a clear code', async () => {
  await assert.rejects(
    resolveSendTarget({}, {
      sessionController: { list: async () => ({ items: [] }), create: async () => ({ sessionId: 'x' }) },
      workspaceRegistry: { list: () => [] },
      workspaceController: { initializeDefault: async () => undefined, create: async () => ({}) },
      workingDirectory: { defaultDirectory: '' },
    }),
    error => error.code === 'SESSION_UNAVAILABLE' && /工作区/.test(error.message),
  );
});
