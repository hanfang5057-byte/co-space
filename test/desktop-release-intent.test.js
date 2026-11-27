import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDesktopIntent } from '../apps/desktop/scripts/release-intent.mjs';

test('a desktop version bump on a push routes to release staging', () => {
  const intent = computeDesktopIntent({
    event: 'push',
    filesChanged: ['apps/desktop/package.json', 'packages/review-core/src/review-core.js'],
    versionBefore: '0.1.19',
    versionAfter: '0.1.20',
  });
  assert.equal(intent.mode, 'release');
  assert.equal(intent.version, '0.1.20');
});

test('desktop code changes without a version bump route to preview', () => {
  const intent = computeDesktopIntent({
    event: 'push',
    filesChanged: ['apps/desktop/src/server/index.js'],
    versionBefore: '0.1.20',
    versionAfter: '0.1.20',
  });
  assert.equal(intent.mode, 'preview');
});

test('shared workspace changes without desktop involvement route to none', () => {
  const intent = computeDesktopIntent({
    event: 'push',
    filesChanged: ['packages/review-ui/src/review-card.js', 'docs/16-release-process.md'],
    versionBefore: '0.1.20',
    versionAfter: '0.1.20',
  });
  assert.equal(intent.mode, 'none');
});

test('a push without a baseline commit routes to preview', () => {
  const intent = computeDesktopIntent({ event: 'push', versionBefore: null, versionAfter: '0.1.20' });
  assert.equal(intent.mode, 'preview');
});

test('pull requests always route to preview', () => {
  const intent = computeDesktopIntent({ event: 'pull_request', versionBefore: '0.1.20', versionAfter: '0.1.19' });
  assert.equal(intent.mode, 'preview');
});

test('manual dispatch defaults to preview and can force a release route', () => {
  assert.equal(computeDesktopIntent({ event: 'workflow_dispatch', versionAfter: '0.1.20' }).mode, 'preview');
  assert.equal(computeDesktopIntent({ event: 'workflow_dispatch', route: 'release', versionAfter: '0.1.21' }).mode, 'release');
});

test('desktop release versions must be stable semver', () => {
  assert.throws(
    () => computeDesktopIntent({ event: 'push', filesChanged: [], versionBefore: '0.1.20', versionAfter: '0.1.21-rc.1' }),
    /stable semver/,
  );
  assert.throws(
    () => computeDesktopIntent({ event: 'workflow_dispatch', route: 'release', versionAfter: '0.1.21-rc.1' }),
    /stable semver/,
  );
});

test('release intent requires a version, a known event, and a known route', () => {
  assert.throws(() => computeDesktopIntent({ event: 'push', versionBefore: '0.1.20', versionAfter: '' }), /version/);
  assert.throws(() => computeDesktopIntent({ event: 'status', versionAfter: '0.1.20' }), /event/);
  assert.throws(() => computeDesktopIntent({ event: 'workflow_dispatch', route: 'hotfix', versionAfter: '0.1.20' }), /route/);
});
