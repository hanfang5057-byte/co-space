import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocx, docxParts, exportFileName, markdownBlocks } from '../packages/review-ui/src/export.js';

test('export parses common Markdown blocks and keeps filenames safe', () => {
  const source = '# 标题\n\n**重点** [安全链接](https://example.test)\n\n- 一\n- 二\n\n|列一|列二|\n|---|---|\n|值|内容|';
  assert.deepEqual(markdownBlocks(source).map(block => block.type), ['heading', 'paragraph', 'list', 'table']);
  assert.equal(exportFileName('../草稿: 一','docx'), '草稿- 一.docx');
  assert.equal(exportFileName('...','docx'), '未命名文档.docx');
});

test('DOCX contains valid OOXML parts, safe links and excludes unsafe link targets', async () => {
  const parts = docxParts('[安全](https://example.test) [危险](javascript:alert(1)) **粗体**');
  assert.match(parts['word/document.xml'], /w:hyperlink r:id="rId1"/);
  assert.doesNotMatch(parts['word/document.xml'], /javascript:/);
  assert.match(parts['word/_rels/document.xml.rels'], /https:\/\/example.test/);
  assert.match(parts['word/_rels/document.xml.rels'], /relationships\/styles/);
  assert.match(parts['word/styles.xml'], /styleId="Heading1"/);
  const bytes = new Uint8Array(await createDocx('# 标题').arrayBuffer());
  assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);
});
