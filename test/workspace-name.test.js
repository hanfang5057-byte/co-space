import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceNameForSession } from '../adapters/dsh/client/workspace-name.js';

test('workspace name comes from the workspace containing the exact session',()=>{
  const items=[{title:'Design',sessionIds:['a']},{title:'Project',sessionIds:['b','c']}];
  assert.equal(workspaceNameForSession(items,'b'),'Project');
  assert.equal(workspaceNameForSession(items,'missing'),null);
  assert.equal(workspaceNameForSession(undefined,'b'),null);
});
