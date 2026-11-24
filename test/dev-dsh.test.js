import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRebuild } from '../scripts/dev-dsh.mjs';

test('dev watcher rebuilds for plugin sources and copied resources', () => {
  assert.equal(shouldRebuild('packages/review-ui/src/SpaceApp.jsx'), true);
  assert.equal(shouldRebuild('packages/review-ui/src/space.css'), true);
  assert.equal(shouldRebuild('packages/review-core/src/review-core.js'), true);
  assert.equal(shouldRebuild('./adapters/dsh/client/index.jsx'), true);
  assert.equal(shouldRebuild('adapters/dsh/package.json'), true);
  assert.equal(shouldRebuild('assets/cospace-icon.svg'), true);
  assert.equal(shouldRebuild('docs/12-document-export-plan.md'), true);
});

test('dev watcher ignores generated output, dependencies and unrelated paths', () => {
  assert.equal(shouldRebuild('adapters/dsh/client.js'), false);
  assert.equal(shouldRebuild('dist/dsh-plugin/client.js'), false);
  assert.equal(shouldRebuild('packages/review-ui/node_modules/react/index.js'), false);
  assert.equal(shouldRebuild('package.json'), false);
  assert.equal(shouldRebuild('scripts/build-client.mjs'), false);
  assert.equal(shouldRebuild('packages/review-ui/.DS_Store'), false);
  assert.equal(shouldRebuild('packages/review-ui/src'), false);
});

test('dev watcher normalizes Windows separators', () => {
  assert.equal(shouldRebuild('packages\\review-ui\\src\\locale.js'), true);
  assert.equal(shouldRebuild('dist\\dsh-plugin\\client.js'), false);
});
