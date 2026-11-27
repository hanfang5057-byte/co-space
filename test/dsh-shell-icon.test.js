import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [client, icon] = await Promise.all([
  readFile(new URL('../adapters/dsh/client/index.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../adapters/dsh/client/brand-icon.jsx', import.meta.url), 'utf8'),
]);

test('the sidebar panel and the composer command share the brand icon', () => {
  // Both shell slots used to inline a generic document glyph; one shared
  // component keeps the two small icons from drifting from the plugin card.
  assert.match(client, /import \{ SpaceIcon \} from '\.\/brand-icon\.jsx'/);
  assert.match(client, /name:'sidebar\.panellist'[\s\S]*?\},SpaceIcon\)\);/);
  assert.match(client, /commandUi\.register\(\{[\s\S]*?icon:SpaceIcon,/);
  assert.doesNotMatch(client, /<rect x="3" y="4" width="18"/);
});

test('the shell icon is a line mark with the main icon rings', () => {
  // The host draws monochrome line icons, so the small mark keeps the shell
  // treatment and only borrows the artwork's content: an open C ring and the
  // offset O ring from assets/cospace-icon.svg.
  assert.match(icon, /viewBox="0 0 16 16"/);
  assert.match(icon, /stroke="currentColor"/);
  assert.match(icon, /strokeWidth="1"/);
  assert.equal(icon.match(/vectorEffect="non-scaling-stroke"/g)?.length, 2);
  assert.equal(icon.match(/<path /g)?.length, 1);
  assert.equal(icon.match(/<circle /g)?.length, 1);
});
