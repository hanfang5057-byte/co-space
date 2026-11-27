import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportSpaceDocument } from '../adapters/dsh/client/exports.js';

const adapterWith = save => ({
  core: { request: async () => ({ title: '周报', content: '# 周报\n\n正文' }) },
  files: { saveExport: async file => { save(file); return true; } },
});

test('markdown export sends the accepted content through the host sink', async () => {
  let saved = null;
  await exportSpaceDocument(adapterWith(file => { saved = file; }), 'doc-1', 'md');
  assert.ok(saved.name.endsWith('.md'));
  assert.equal(saved.type, 'text/markdown;charset=utf-8');
  assert.equal(new TextDecoder().decode(saved.bytes), '# 周报\n\n正文');
});

test('word export sends a docx document', async () => {
  let saved = null;
  await exportSpaceDocument(adapterWith(file => { saved = file; }), 'doc-1', 'docx');
  assert.ok(saved.name.endsWith('.docx'));
  assert.equal(saved.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.ok(saved.bytes.length > 0);
});

test('an unwritable host or unknown format fails instead of reporting success', async () => {
  await assert.rejects(exportSpaceDocument({ core: { request: async () => null }, files: { saveExport: async () => true } }, 'doc-1', 'md'));
  await assert.rejects(exportSpaceDocument(adapterWith(() => {}), 'doc-1', 'pdf'));
  const refusing = { core: { request: async () => ({ title: 'a', content: 'b' }) }, files: { saveExport: async () => false } };
  await assert.rejects(exportSpaceDocument(refusing, 'doc-1', 'md'));
});
