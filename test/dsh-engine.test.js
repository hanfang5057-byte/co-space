import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(root, 'adapters/dsh/package.json'), 'utf8'));
const range = manifest.engines?.dsh ?? '';

/** Parse `x.y.z[-pre]`; the engine range only ever uses this shape. */
function parse(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
  if (!match) throw new Error(`not a semantic version: ${version}`);
  return { core: [Number(match[1]), Number(match[2]), Number(match[3])], pre: match[4] ? match[4].split('.') : [] };
}

function comparePrerelease(left, right) {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    const numericA = /^\d+$/.test(a);
    const numericB = /^\d+$/.test(b);
    if (numericA && numericB) {
      if (Number(a) !== Number(b)) return Number(a) - Number(b);
      continue;
    }
    if (numericA) return -1;
    if (numericB) return 1;
    if (a !== b) return a < b ? -1 : 1;
  }
  return 0;
}

function compare(left, right) {
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] - b.core[index];
  }
  return comparePrerelease(a.pre, b.pre);
}

// DSH evaluates `engines.dsh` with semver.satisfies(version, range, { includePrerelease: true }),
// so an open lower bound accepts later prereleases as well as later releases.
const satisfies = version => range.startsWith('>=') && compare(version, range.slice(2)) >= 0;

test('the DSH engine requirement is an open floor, not a capped range', () => {
  assert.match(range, /^>=\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert.equal(range, '>=0.2.3-alpha.2');
  assert.ok(!range.includes('<'), 'a caret or upper bound would reject later DSH majors');
  assert.ok(!range.includes('||'), 'one floor keeps the supported surface single and reviewable');
});

test('the floor accepts the verified version and everything newer', () => {
  for (const version of [
    '0.2.3-alpha.2', // the version this adapter is verified against
    '0.2.3-alpha.3',
    '0.2.3',
    '0.2.4-alpha.1', // includePrerelease: later prereleases are accepted too
    '0.2.4',
    '0.3.0',
    '1.0.0-beta.1',
    '1.0.0',
  ]) {
    assert.equal(satisfies(version), true, `${version} should satisfy ${range}`);
  }
  for (const version of ['0.2.3-alpha.1', '0.2.2', '0.2.2-rc.5', '0.1.15']) {
    assert.equal(satisfies(version), false, `${version} should be below ${range}`);
  }
});

test('every install surface advertises the same DSH floor', async () => {
  for (const file of [
    'README.md',
    'README.en.md',
    'adapters/dsh/README.md',
    'apps/site/index.html',
  ]) {
    const text = await readFile(path.join(root, file), 'utf8');
    assert.match(text, /0\.2\.3-alpha\.2/, `${file} must name the supported DSH floor`);
    assert.doesNotMatch(text, /0\.2\.2-rc\.5/, `${file} still advertises the retired DSH floor`);
  }
});
