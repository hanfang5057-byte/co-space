import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = await readFile(path.join(root, 'packages/review-ui/src/space.css'), 'utf8');

/** The picker section, whitespace-normalized for selector matching. */
const picker = css.slice(css.indexOf('/* Document picker:')).replace(/\s+/g, ' ');

const rule = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return picker.match(new RegExp(`${escaped} \\{([^}]*)\\}`))?.[1] ?? '';
};

test('picker controls are scoped so the dialog shell cannot restyle them', () => {
  // SpaceDialog styles `.space-dialog-content label` and `input:not([type])`;
  // only a scoped picker selector outranks them. Without it the search field
  // grows a second focus ring and every document row becomes a muted grid.
  assert.match(picker, /\.space-picker-dialog \.space-dialog-content \.space-picker-search \{/);
  assert.match(picker, /\.space-picker-dialog \.space-dialog-content \.space-picker-row \{/);
  assert.match(picker, /\.space-picker-dialog \.space-dialog-content \.space-picker-search input/);

  // The unscoped rules are what the shell overrode; keep them gone.
  assert.doesNotMatch(css, /^\.space-picker-search \{/m);
  assert.doesNotMatch(css, /^\.space-picker-row \{/m);
});

test('the search field is one control: shell draws the box, input stays flat', () => {
  const shell = rule('.space-picker-dialog .space-dialog-content .space-picker-search');
  assert.match(shell, /display: flex/);
  assert.match(shell, /border: 1px solid var\(--cospace-border\)/);
  assert.match(picker, /\.space-picker-search:focus-within \{/);

  const input = rule('.space-picker-dialog .space-dialog-content .space-picker-search input, .space-picker-dialog .space-dialog-content .space-picker-search input:focus-visible');
  assert.match(input, /border: 0/);
  assert.match(input, /background: transparent/);
  assert.match(input, /box-shadow: none/);
  assert.match(input, /outline: 0/);
});

test('a document row is one flex line with primary text', () => {
  const row = rule('.space-picker-dialog .space-dialog-content .space-picker-row');
  assert.match(row, /display: flex/);
  assert.match(row, /align-items: flex-start/);
  assert.match(row, /color: var\(--cospace-text-primary\)/);
  assert.match(row, /font-weight: 400/);
});
