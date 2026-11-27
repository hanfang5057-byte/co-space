import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkTheme } from '../scripts/check-theme.mjs';
import {
  PUBLIC_TOKENS,
  REQUIRED_TOKENS,
  ROOT_CLASS,
  SURFACE_ATTRIBUTE,
  SURFACES,
  THEME_CONTRACT_VERSION,
  normalizeTheme,
  themeRootProps,
  themeStyle,
} from '../packages/review-ui/src/theme/index.js';
import manifest from '../packages/review-ui/src/theme/tokens.json' with { type: 'json' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the repository obeys the theme contract', async () => {
  const { problems } = await checkTheme();
  assert.deepEqual(problems, []);
});

test('the manifest and the module agree on the contract surface', () => {
  assert.equal(THEME_CONTRACT_VERSION, manifest.version);
  assert.equal(ROOT_CLASS, manifest.rootClass);
  assert.equal(SURFACE_ATTRIBUTE, manifest.surfaceAttribute);
  assert.deepEqual([...SURFACES], manifest.surfaces);
  assert.deepEqual([...PUBLIC_TOKENS], Object.keys(manifest.tokens).map(name => `${manifest.prefix}${name}`));
  assert.ok(REQUIRED_TOKENS.length >= 16, 'the palette is the part every host must be able to set');
  for (const token of REQUIRED_TOKENS) assert.ok(PUBLIC_TOKENS.includes(token));
});

test('the DSH host pack maps every required token', async () => {
  const css = await readFile(path.join(root, 'adapters/dsh/client/theme.css'), 'utf8');
  for (const token of REQUIRED_TOKENS) {
    assert.match(css, new RegExp(`${token}\\s*:`), `DSH theme must set ${token}`);
  }
});

test('themeStyle accepts short and full names and rejects unknown tokens', () => {
  assert.deepEqual(themeStyle({ accent: '#123456' }), { '--cospace-accent': '#123456' });
  assert.deepEqual(themeStyle({ '--cospace-accent': '#123456' }), { '--cospace-accent': '#123456' });
  assert.throws(() => themeStyle({ structure: '1px' }), /Unknown CoSpace theme token/);
  assert.throws(() => themeStyle({ accent: '#123; }' }), /Invalid value/);
});

test('a host theme resolves to one marked root', () => {
  const theme = normalizeTheme({ tokens: { accent: '#123456', 'surface-paper': '#ffffff' }, surface: 'sidebar' });
  assert.deepEqual(theme.style, {
    '--cospace-accent': '#123456',
    '--cospace-surface-paper': '#ffffff',
  });
  assert.equal(theme.surface, 'sidebar');
  assert.deepEqual(themeRootProps('page'), { className: ROOT_CLASS, [SURFACE_ATTRIBUTE]: 'page' });
  assert.deepEqual(themeRootProps('inline', { className: 'space-ref-card' }), {
    className: `${ROOT_CLASS} space-ref-card`,
    [SURFACE_ATTRIBUTE]: 'inline',
  });
  assert.throws(() => themeRootProps('dialog'), /Unknown CoSpace surface/);
  assert.throws(() => normalizeTheme({ surface: 'dialog' }), /Unknown CoSpace surface/);
});
