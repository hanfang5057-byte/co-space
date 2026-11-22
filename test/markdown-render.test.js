import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../client-src/markdown.js';

test('Markdown renders tables, code and annotated source ranges', () => {
  const source = '# 标题\n\n| 名称 | 状态 |\n| --- | :---: |\n| 引擎 | 完成 |\n\n```js\nconst answer = 42;\n```\n\n> 引用中的文字\n';
  const html = renderMarkdown(source);
  assert.match(html, /<div class="space-table-wrap"><table>/);
  assert.match(html, /<th><span class="space-src" data-src-from="\d+" data-src-to="\d+">名称<\/span><\/th>/);
  assert.match(html, /<pre class="space-code-block"><code class="language-js space-src" data-src-from="\d+" data-src-to="\d+">const answer = 42;/);
  assert.match(html, /<blockquote>\s*<p><span class="space-src"[^>]*>引用中的文字<\/span><\/p>\s*<\/blockquote>/);
  const heading = html.match(/<h1><span class="space-src" data-src-from="(\d+)" data-src-to="(\d+)">标题<\/span><\/h1>/);
  assert.ok(heading);
  assert.equal(source.slice(Number(heading[1]), Number(heading[2])), '标题');
});

test('Markdown escapes raw HTML and maps escaped/entity text back to source', () => {
  const source = '普通 &copy; \\*不是斜体\\* 与 <b>标签</b>。\n';
  const html = renderMarkdown(source);
  assert.doesNotMatch(html, /<b>标签<\/b>/);
  assert.match(html, /&lt;b&gt;标签&lt;\/b&gt;/);
  const spans = [...html.matchAll(/data-src-from="(\d+)" data-src-to="(\d+)"/g)].map(match => [Number(match[1]), Number(match[2])]);
  assert.ok(spans.some(([from, to]) => source.slice(from, to) === '&copy;'));
  assert.ok(spans.some(([from, to]) => source.slice(from, to) === '\\*'));
});

test('suggestions whose ranges include Markdown structure attach to block tokens', () => {
  const listSource = '- old\n- keep\n';
  const listHtml = renderMarkdown(listSource, [{
    id: 'list-replace', status: 'pending', from: 0, to: 6, expected: '- old\n', replacement: '- new\n',
  }]);
  assert.match(listHtml, /space-suggestion-insert-block/);
  assert.match(listHtml, />new<\/ins>/);

  const tableSource = '| a | b |\n|---|---|\n| x | y |\n';
  const rowStart = tableSource.indexOf('| x | y |');
  const tableHtml = renderMarkdown(tableSource, [{
    id: 'row-replace', status: 'pending', from: rowStart, to: rowStart + '| x | y |\n'.length,
    expected: '| x | y |\n', replacement: '| p | q |\n',
  }]);
  assert.match(tableHtml, /space-suggestion-insert-row/);
  assert.match(tableHtml, />p<\/ins>/);
});
