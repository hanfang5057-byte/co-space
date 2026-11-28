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
  // switch; only the back control stays page-only. The header carries no
  // document-scoped pending count: the panel and the home list already name it,
  // so the seat would only crowd the controls.
  const header = app.slice(app.indexOf('export function SpaceSurfaceHeader'), app.indexOf('export function useDocumentExport'));
  assert.doesNotMatch(header, /space-pending-chip/);
  // The save state has no seat of its own: it rides on the switch thumb.
  assert.doesNotMatch(app, /space-doc-status/);
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

test('the shared header seats the mode switch first and the overflow menu last', () => {
  // The mode switch leads because its thumb also answers "is what I see saved?";
  // the kebab is the conventional trailing "more actions" trigger.
  const header = app.slice(app.indexOf('export function SpaceSurfaceHeader'), app.indexOf('export function useDocumentExport'));
  const seats = [header.indexOf('{viewTools'), header.indexOf('<ReviewSendButton'), header.indexOf('{tools}')];
  assert.ok(seats.every(seat => seat >= 0));
  assert.deepEqual([...seats].sort((left, right) => left - right), seats);
});

test('the review/edit control is one switch that names the current mode', () => {
  // One switch gives the mode a single target and a fixed width; the track shows
  // the current mode as small text, so the old two-button pair must stay gone.
  const block = app.slice(app.indexOf('export function ModeSwitch'), app.indexOf('* One comment balloon'));
  assert.match(block, /role="switch"/);
  assert.match(block, /aria-checked=\{editing\}/);
  assert.match(block, /space-mode-switch-label/);
  assert.match(block, /const mode=editing\?t\('edit\.editMode'\):t\('edit\.reviewMode'\)/);
  assert.doesNotMatch(block, /aria-pressed/);
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

test('the switch thumb reports the save state, in sight and to a screen reader', () => {
  // The thumb is 22px of header real estate, so the state rides there as one icon
  // and the header keeps a single seat for mode and save state together.
  const block = app.slice(app.indexOf('const saveStateIcons'), app.indexOf('* One comment balloon'));
  assert.match(block, /readonly:Lock,editing:Pencil,unsaved:Pencil,saving:LoaderCircle,saved:Check,error:CircleAlert/);
  assert.match(block, /space-mode-switch-knob is-\$\{state\}/);
  assert.match(block, /aria-label=\{\`\$\{t\('edit\.switchLabel'\)\}，\$\{status\}\`\}/);
  // The state also stays a live region, so a save outcome is announced once.
  assert.match(block, /space-visually-hidden" role="status"/);

  // Every reported state has a dictionary entry for the icon's tooltip and label.
  const zhBlock = locale.slice(locale.indexOf('export const zh'), locale.indexOf('export const en'));
  for (const key of ['status.readonly', 'status.editing', 'edit.unsaved', 'edit.saving', 'edit.saved', 'edit.autoSaveFailedShort']) {
    const escaped = key.replace('.', '\\.');
    assert.ok(new RegExp(`'${escaped}': '([^']+)'`).test(zhBlock), `${key} is missing from the Chinese dictionary`);
  }
});
