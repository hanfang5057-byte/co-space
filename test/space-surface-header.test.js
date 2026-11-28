import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = relative => readFile(path.join(root, relative), 'utf8');
const [app, sidebar, locale] = await Promise.all([
  source('packages/review-ui/src/SpaceApp.jsx'),
  source('packages/review-ui/src/SpaceSidebar.jsx'),
  source('packages/review-ui/src/locale.js'),
]);

test('both review surfaces render the one shared header', () => {
  // The page and the Sidebar tab review the same document. A hand-rolled header
  // on either side is what let the two toolbars drift apart before.
  assert.match(app, /<SpaceSurfaceHeader\s+surface="page"/);
  assert.match(sidebar, /<SpaceSurfaceHeader surface="sidebar"/);
  assert.match(sidebar, /import \{[^}]*SpaceSurfaceHeader[^}]*\} from '\.\/SpaceApp\.jsx'/);

  // The shells live in the shared component only.
  assert.match(app, /className=\{sidebar \? 'space-sidebar-toolbar' : 'space-top space-preview-top'\}/);
  assert.doesNotMatch(app, /<header className="space-top space-preview-top">/);
  assert.doesNotMatch(sidebar, /<header className="space-sidebar-toolbar">/);
});

test('the shared header keeps the controls a document review needs', () => {
  // Both surfaces render zoom, the one send action and the review/edit mode
  // switch; only the brand/back cluster stays page-only.
  const header = app.slice(app.indexOf('export function SpaceSurfaceHeader'), app.indexOf('export function useDocumentExport'));
  assert.match(header, /space-pending-chip/);
  assert.match(header, /<DocStatus/);
  assert.match(app, /space-doc-status/);
  assert.match(header, /ReviewZoomControls/);
  assert.match(header, /ReviewSendButton/);
  assert.match(header, /compact=\{sidebar\}/);
  assert.match(header, /\{leading && <div className="space-preview-brand">\{leading\}<\/div>\}/);
  assert.match(header, /space-toolbar-group is-view/);

  // The Sidebar still passes a tools menu, so export and the Agent handoff are
  // reachable without leaving the conversation.
  assert.match(sidebar, /<ReviewToolsMenu/);
  assert.match(sidebar, /onOpenPage=/);
  assert.match(sidebar, /<SpaceAgentPromptDialog/);

  // Document preferences are document actions too, so they are reachable from
  // the compact menu; the review/edit switch is shared by both surfaces
  // through the one ModeSwitch component.
  assert.match(sidebar, /onPreferences=/);
  assert.match(sidebar, /<SpaceDocumentPreferencesDialog/);
  assert.match(app, /<SpaceDocumentPreferencesDialog/);
  assert.match(sidebar, /<ModeSwitch/);
});

test('the shared header seats status first and the overflow menu last', () => {
  // The status slot answers "is what I see saved?" leftmost, before the mode
  // switch; the kebab is the conventional trailing "more actions" trigger.
  const header = app.slice(app.indexOf('export function SpaceSurfaceHeader'), app.indexOf('export function useDocumentExport'));
  const seats = [header.indexOf('<DocStatus'), header.indexOf('{viewTools'), header.indexOf('<ReviewSendButton'), header.indexOf('{tools}')];  assert.ok(seats.every(seat => seat >= 0));
  assert.deepEqual([...seats].sort((left, right) => left - right), seats);
});

test('document preferences run through one shared controller', () => {
  // Both surfaces open, edit and save the same preference text; a second save
  // path is what would let a Sidebar edit and a page edit disagree on version.
  assert.match(app, /const preferences=useDocumentPreferences\(\{docId,adapter,t\}\)/);
  assert.match(app, /preferences\.openPreferences\('document'\)/);
  assert.match(sidebar, /useDocumentPreferences\(\{ docId, adapter, t \}\)/);
  assert.match(sidebar, /preferences\.openPreferences\('document'\)/);

  // The single write path lives with the controller in SpaceApp.jsx.
  assert.equal((app.match(/saveInstructions/g) || []).length, 1);
  assert.equal((sidebar.match(/saveInstructions/g) || []).length, 0);
  assert.doesNotMatch(app, /saveCollaboration/);
});

test('the shared header copy is localized in both dictionaries', () => {
  assert.match(locale, /'toolbar\.openPage': '在页面中打开'/);
  assert.match(locale, /'toolbar\.openPage': 'Open in page'/);
});
