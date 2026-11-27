// Resolves the desktop release intent for a CI event.
//
// push:              compares the desktop version before and after the pushed
//                    commits; a version bump routes to release staging, desktop
//                    code changes route to preview builds, and anything else
//                    is left to the shared CI workflow.
// pull_request:      always a preview so proposed changes get matrix coverage.
// workflow_dispatch: a preview rebuild by default, or an explicit --mode release
//                    to resume a release whose earlier run failed.
//
// Output: `key=value` pairs appended to $GITHUB_OUTPUT when set, plus a
// human-readable summary on stdout. Release tags are never moved or reused,
// so a release route can only ever create a brand-new tag.

import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appDir, '../..');
const desktopVersionPath = path.join(appDir, 'package.json');
const stableVersion = /^\d+\.\d+\.\d+$/;
const desktopCodePrefix = 'apps/desktop/';
const supportedEvents = new Set(['push', 'pull_request', 'workflow_dispatch']);

export function computeDesktopIntent({ event, route, filesChanged = [], versionBefore, versionAfter }) {
  if (!supportedEvents.has(event)) throw new Error(`Unsupported release-intent event: ${event}`);
  if (typeof versionAfter !== 'string' || versionAfter.length === 0) {
    throw new Error('A desktop package version is required to resolve release intent');
  }
  if (event === 'pull_request') {
    return { mode: 'preview', version: versionAfter, reason: 'pull request' };
  }
  if (event === 'workflow_dispatch') {
    if (route !== undefined && route !== 'preview' && route !== 'release') {
      throw new Error(`Unsupported manual release route: ${route}`);
    }
    if (route === 'release') {
      if (!stableVersion.test(versionAfter)) {
        throw new Error(`Desktop release versions must be stable semver (got ${versionAfter}); build preview artifacts instead`);
      }
      return { mode: 'release', version: versionAfter, reason: 'manual release route' };
    }
    return { mode: 'preview', version: versionAfter, reason: 'manual preview route' };
  }
  if (versionBefore === null || versionBefore === undefined) {
    return { mode: 'preview', version: versionAfter, reason: 'no baseline commit for this push' };
  }
  if (versionBefore !== versionAfter) {
    if (!stableVersion.test(versionAfter)) {
      throw new Error(`Desktop release versions must be stable semver (got ${versionAfter}); build preview artifacts instead`);
    }
    return { mode: 'release', version: versionAfter, reason: `desktop version changed from ${versionBefore}` };
  }
  if (filesChanged.some(file => file.startsWith(desktopCodePrefix))) {
    return { mode: 'preview', version: versionAfter, reason: 'desktop code changed without a version bump' };
  }
  return { mode: 'none', version: versionAfter, reason: 'no desktop code or version change' };
}

function readDesktopVersion() {
  const pkg = JSON.parse(fs.readFileSync(desktopVersionPath, 'utf8'));
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    throw new Error(`Missing desktop version in ${path.relative(repoRoot, desktopVersionPath)}`);
  }
  return pkg.version;
}

function ensureCommit(revision) {
  execFileSync('git', ['cat-file', '-e', `${revision}^{commit}`], { cwd: repoRoot });
}

function hasFileAt(revision, file) {
  try {
    execFileSync('git', ['cat-file', '-e', `${revision}:${file}`], { cwd: repoRoot, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function readDesktopVersionAt(revision) {
  const manifest = JSON.parse(
    execFileSync('git', ['show', `${revision}:apps/desktop/package.json`], { cwd: repoRoot, encoding: 'utf8' }),
  );
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) return null;
  return manifest.version;
}

function changedFilesBetween(before, after) {
  const output = execFileSync('git', ['diff', '--name-only', before, after], { cwd: repoRoot, encoding: 'utf8' });
  return output.split('\n').filter(Boolean);
}

function parseArgs(argv) {
  const options = { event: 'push', before: null, mode: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    const value = () => {
      if (index + 1 >= argv.length) throw new Error(`Missing value for ${option}`);
      index += 1;
      return argv[index];
    };
    if (option === '--event') options.event = value();
    else if (option === '--before') options.before = value();
    else if (option === '--mode') options.mode = value();
    else throw new Error(`Unknown option: ${option}`);
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.before !== null && options.event !== 'push') {
    throw new Error('--before is only valid for push events');
  }
  if (options.mode !== undefined && options.event !== 'workflow_dispatch') {
    throw new Error('--mode is only valid for workflow_dispatch events');
  }
  const versionAfter = readDesktopVersion();
  let filesChanged = [];
  let versionBefore = null;
  if (options.event === 'push' && options.before !== null) {
    ensureCommit(options.before);
    filesChanged = changedFilesBetween(options.before, 'HEAD');
    if (hasFileAt(options.before, 'apps/desktop/package.json')) {
      versionBefore = readDesktopVersionAt(options.before);
    }
  }
  const intent = computeDesktopIntent({
    event: options.event,
    route: options.mode,
    filesChanged,
    versionBefore,
    versionAfter,
  });
  console.log(`Desktop intent: mode=${intent.mode} version=${intent.version} (${intent.reason})`);
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    appendFileSync(output, `mode=${intent.mode}\nversion=${intent.version}\nreason=${intent.reason}\n`);
  }
  return intent;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`release-intent: ${error.message}`);
    process.exit(1);
  }
}
