import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../client-src/markdown.js';

function withoutReviewAnnotations(html) {
  return html
    .replace(/<del\b[^>]*>[\s\S]*?<\/del>/g, '')
    .replace(/<ins class="space-suggestion-insert space-suggestion-source-insert"[^>]*>[\s\S]*?<\/ins>/g, '')
    .replace(/<ins\b[^>]*>/g, '')
    .replace(/<\/ins>/g, '')
    .replace(/<span class="space-src"[^>]*>/g, '')
    .replace(/<\/span>/g, '')
    .replace(/<(h[1-6]|p|li)>\s*<\/\1>\s*/g, '')
    .replace(/ data-src-(?:from|to)="\d+"/g, '')
    .replace(/ data-suggestion-id="[^"]*"/g, '');
}

test('Markdown renders tables, code and annotated source ranges', () => {
  const source = '# 标题\n\n| 名称 | 状态 |\n| --- | :---: |\n| 引擎 | 完成 |\n\n```js\nconst answer = 42;\n```\n\n> 引用中的文字\n';
  const html = renderMarkdown(source);
  assert.match(html, /<div class="space-table-wrap"><table>/);
  assert.match(html, /<th><span class="space-src" data-src-from="\d+" data-src-to="\d+">名称<\/span><\/th>/);
  assert.match(html, /<pre class="space-code-block"><code class="language-js space-src"><span class="space-src" data-src-from="\d+" data-src-to="\d+">const answer = 42;/);
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

  const nestedLink = '[a [b]](https://example.test/path_(one)) and b';
  const nestedHtml = renderMarkdown(nestedLink);
  const ranges = [...nestedHtml.matchAll(/data-src-from="(\d+)" data-src-to="(\d+)">([^<]*)<\/span>/g)];
  assert.ok(ranges.some(match => nestedLink.slice(Number(match[1]), Number(match[2])) === 'a [b]'));
  assert.ok(ranges.some(match => nestedLink.slice(Number(match[1]), Number(match[2])) === ' and b'));
});

test('suggestions whose ranges include Markdown structure attach to block tokens', () => {
  const listSource = '- old\n- keep\n';
  const listHtml = renderMarkdown(listSource, [{
    id: 'list-replace', status: 'pending', from: 0, to: 6, expected: '- old\n', replacement: '- new\n',
  }]);
  assert.match(listHtml, /<li><del[^>]*>- old\n<\/del><ins[^>]*>new<\/ins><\/li>/);

  const tableSource = '| a | b |\n|---|---|\n| x | y |\n';
  const rowStart = tableSource.indexOf('| x | y |');
  const tableHtml = renderMarkdown(tableSource, [{
    id: 'row-replace', status: 'pending', from: rowStart, to: rowStart + '| x | y |\n'.length,
    expected: '| x | y |\n', replacement: '| p | q |\n',
  }]);
  assert.match(tableHtml, /<td><del[^>]*>\| x \| y \|\n<\/del><ins[^>]*>p<\/ins><\/td>/);
  assert.match(tableHtml, /<td><ins[^>]*>q<\/ins><\/td>/);
});

test('pure block deletions remain visible as struck-through Markdown blocks', () => {
  const source = '# Intro\n\n## Why heading\n\n## Next\n';
  const expected = '## Why heading\n\n';
  const from = source.indexOf(expected);
  const html = renderMarkdown(source, [{
    id: 'delete-heading', status: 'pending', from, to: from + expected.length,
    expected, replacement: '',
  }]);

  assert.match(html, /<h2><del class="space-src space-suggestion-delete" data-src-from="\d+" data-src-to="\d+" data-suggestion-id="delete-heading">Why heading<\/del><\/h2>/);
  assert.ok(html.indexOf('Why heading') < html.indexOf('<h2><span class="space-src"'));
  const deletedText = html.match(/<del[^>]*data-src-from="(\d+)" data-src-to="(\d+)"[^>]*>Why heading<\/del>/);
  assert.ok(deletedText);
  assert.equal(source.slice(Number(deletedText[1]), Number(deletedText[2])), 'Why heading');
  const accepted = source.slice(0, from) + source.slice(from + expected.length);
  assert.equal(withoutReviewAnnotations(html), withoutReviewAnnotations(renderMarkdown(accepted)));
});

test('suggestion previews preserve inline Markdown context when ranges include delimiters', () => {
  const source = '普通、**粗体**、删除线';
  const expected = '**粗体**';
  const from = source.indexOf(expected);
  const html = renderMarkdown(source, [{
    id: 'bold-replacement', status: 'pending', from, to: from + expected.length,
    expected, replacement: '**加粗文本**',
  }]);

  assert.match(html, /<strong><del class="space-src space-suggestion-delete"[^>]*><strong>粗体<\/strong><\/del><ins class="space-suggestion-insert"[^>]*>加粗文本<\/ins><\/strong>/);
  assert.ok(html.indexOf('加粗文本') < html.indexOf('、删除线'));
  assert.doesNotMatch(html, /<ins[^>]*>\*\*加粗文本\*\*<\/ins>/);
});

test('suggestions retain link context, entity ranges, and UTF-16 emoji offsets', () => {
  const linkSource = '前缀 [DeepSeek](https://example.com) 后缀';
  const linkFrom = linkSource.indexOf('DeepSeek');
  const linkHtml = renderMarkdown(linkSource, [{
    id: 'link-label', status: 'pending', from: linkFrom, to: linkFrom + 8,
    expected: 'DeepSeek', replacement: 'Harness',
  }]);
  assert.match(linkHtml, /<a href="https:\/\/example\.com"><del[^>]*>DeepSeek<\/del><ins[^>]*>Harness<\/ins><\/a>/);
  assert.equal((linkHtml.match(/<a\b/g) || []).length, 1);

  const entitySource = 'A &copy; B';
  const entityFrom = entitySource.indexOf('&copy;');
  const entityHtml = renderMarkdown(entitySource, [{
    id: 'entity', status: 'pending', from: entityFrom, to: entityFrom + 6,
    expected: '&copy;', replacement: '©',
  }]);
  assert.match(entityHtml, /<del[^>]*data-src-from="2" data-src-to="8"[^>]*>©<\/del><ins[^>]*>©<\/ins>/);

  const emojiSource = 'A 😀 B';
  const emojiFrom = emojiSource.indexOf('😀');
  const emojiHtml = renderMarkdown(emojiSource, [{
    id: 'emoji', status: 'pending', from: emojiFrom, to: emojiFrom + 2,
    expected: '😀', replacement: '😃',
  }]);
  assert.match(emojiHtml, /<del[^>]*data-src-from="2" data-src-to="4"[^>]*>😀<\/del><ins[^>]*>😃<\/ins>/);
});

test('insertions at document and block boundaries render inside their Markdown blocks', () => {
  const source = '# 标题\n\n- 项目\n\n段落';
  const startHtml = renderMarkdown(source, [{
    id: 'start', status: 'pending', from: 0, to: 0, expected: '', replacement: '【文首插入】',
  }]);
  assert.match(startHtml, /<p><ins[^>]*>【文首插入】<\/ins><span class="space-src" data-src-from="0"[^>]*># 标题<\/span><\/p>/);
  assert.doesNotMatch(startHtml, /<h1>/);

  const listAt = source.indexOf('- 项目');
  const listHtml = renderMarkdown(source, [{
    id: 'list-start', status: 'pending', from: listAt, to: listAt, expected: '', replacement: '**新增**',
  }]);
  assert.match(listHtml, /<p><strong><ins[^>]*>新增<\/ins><\/strong><span[^>]*>- 项目<\/span><\/p>/);

  const endHtml = renderMarkdown(source, [{
    id: 'end', status: 'pending', from: source.length, to: source.length, expected: '', replacement: '【文末插入】',
  }]);
  assert.match(endHtml, /段落<\/span><ins[^>]*>【文末插入】<\/ins><\/p>/);
});

test('pending preview has the same Markdown structure as accepting each replacement', () => {
  const samples = [
    { source: '普通、**粗体**、删除线', expected: '**粗体**', replacement: '**加粗文本**' },
    { source: 'A **word** B', expected: '*', replacement: 'x' },
    { source: 'A &copy; B', expected: '&co', replacement: 'X' },
    { source: 'before [old](https://old.example) after', expected: '[old](https://old.example)', replacement: '[new](https://new.example)' },
    { source: 'see [site](https://old.example)', expected: 'old.example', replacement: 'new.example' },
    { source: 'A 😀 B', expected: '😀', replacement: '😃' },
    { source: 'A remove me B', expected: 'remove me', replacement: '' },
    { source: 'A `code` B', expected: 'code', replacement: '**literal**' },
    { source: '- old\n- keep\n', expected: '- old\n', replacement: '- new\n' },
    { source: '| a | b |\n|---|---|\n| x | y |\n', expected: '| x | y |\n', replacement: '| p | q |\n' },
    { source: '# 标题\n', expected: '', replacement: '【文首插入】' },
  ];

  for (const [index, sample] of samples.entries()) {
    const from = sample.source.indexOf(sample.expected);
    const suggestion = {
      id: `roundtrip-${index}`, status: 'pending', from,
      to: from + sample.expected.length, expected: sample.expected, replacement: sample.replacement,
    };
    const accepted = sample.source.slice(0, suggestion.from) + suggestion.replacement + sample.source.slice(suggestion.to);
    const previewHtml = withoutReviewAnnotations(renderMarkdown(sample.source, [suggestion]));
    const acceptedHtml = withoutReviewAnnotations(renderMarkdown(accepted));
    assert.equal(previewHtml, acceptedHtml, `preview mismatch for ${JSON.stringify(sample)}`);
  }
});

test('multiple pending replacements preserve source mapping after projection shifts', () => {
  const source = 'A **one** B and &copy;';
  const first = source.indexOf('**one**');
  const second = source.indexOf('&copy;');
  const suggestions = [
    { id: 'one', status: 'pending', order: 1, from: first, to: first + 7, expected: '**one**', replacement: '**longer**' },
    { id: 'entity', status: 'pending', order: 2, from: second, to: second + 6, expected: '&copy;', replacement: '©' },
  ];
  const accepted = source.slice(0, first) + '**longer**' + source.slice(first + 7, second) + '©';
  const previewHtml = renderMarkdown(source, suggestions);
  assert.equal(withoutReviewAnnotations(previewHtml), withoutReviewAnnotations(renderMarkdown(accepted)));
  const trailing = [...previewHtml.matchAll(/<span class="space-src" data-src-from="(\d+)" data-src-to="(\d+)">([^<]*)<\/span>/g)];
  assert.ok(trailing.some(match => match[3] === ' B and ' && Number(match[1]) === source.indexOf(' B and ')));

  const samePoint = [
    { id: 'first', status: 'pending', order: 1, from: 1, to: 1, expected: '', replacement: 'B' },
    { id: 'second', status: 'pending', order: 2, from: 1, to: 1, expected: '', replacement: 'C' },
  ];
  const samePointHtml = renderMarkdown('ab', samePoint);
  assert.equal(withoutReviewAnnotations(samePointHtml), withoutReviewAnnotations(renderMarkdown('aBCb')));
  assert.ok(samePointHtml.indexOf('data-suggestion-id="first"') < samePointHtml.indexOf('data-suggestion-id="second"'));
});
