import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectAgentIntegrations, connectAgent } from '../apps/desktop/src/agent/integration.js';

test('Agent detection is optional and rejects unknown targets without writing', async () => {
  const integrations = await detectAgentIntegrations();
  assert.ok(Array.isArray(integrations));
  assert.ok(integrations.every(agent => typeof agent.id === 'string' && typeof agent.name === 'string'));
  await assert.rejects(connectAgent('not-a-real-agent'), { code: 'AGENT_UNSUPPORTED' });
});
