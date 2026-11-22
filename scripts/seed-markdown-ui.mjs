#!/usr/bin/env node
/**
 * Seed a running (or stopped) DSH Space home with Markdown review fixtures for
 * manual UI acceptance. Uses the real Space MCP tools over stdio, so every
 * document and suggestion goes through the same validation as an Agent call.
 *
 * Usage:
 *   node scripts/seed-markdown-ui.mjs              # remove old md-ui fixtures, then seed
 *   node scripts/seed-markdown-ui.mjs --keep-old   # keep existing fixture documents
 *   node scripts/seed-markdown-ui.mjs --clean-only # only remove old md-ui fixtures
 *   node scripts/seed-markdown-ui.mjs --dry-run    # show cleanup and resolved offsets
 *   node scripts/seed-markdown-ui.mjs --only=comments
 *
 * Cleanup only touches documents whose id starts with `md-ui-` (or
 * `md-ui-<only>-` when --only is set). Regular documents are never removed.
 * DSH_SPACE_HOME defaults to $DSH_HOME/space (or ~/.dsh/space).
 */
import os from 'node:os';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SpaceService } from '../src/space-service.js';
import { CommentStore } from '../src/comments.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = path.resolve(process.env.DSH_SPACE_HOME || path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), 'space'));
const suffix = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString(36).slice(-5)}`;
const dryRun = process.argv.includes('--dry-run');
const keepOld = process.argv.includes('--keep-old');
const cleanOnly = process.argv.includes('--clean-only');
const only = process.argv.find(argument => argument.startsWith('--only='))?.slice('--only='.length);
const fixturePrefix = only ? `md-ui-${only}-` : 'md-ui-';

const lines = (...value) => value.join('\n');

function longDocument() {
  const body = [
    '# 长篇 Markdown 滚动与批注槽定位验收',
    '',
    '这是一篇用于检查长文档滚动、固定标题栏和批注槽定位的文档，共 32 节。正文区间与建议卡片都应随滚动保持对应。',
    '',
  ];
  for (let n = 1; n <= 32; n += 1) {
    body.push(`## 第 ${n} 节 · ${n === 1 ? '开篇' : n === 32 ? '收束' : '正文'}`, '');
    body.push(`第 ${n} 节的正文包含一个待修改的词。这一节用于检查长文档滚动、批注槽定位与固定标题栏；段落编号 ${n}，即使文字重复，源码区间也不应被混淆。`, '');
    if (n === 5) body.push('第 5 节额外说明：接受建议后，正文只在这个区间内变化，其他节保持不动。', '');
    if (n === 8) body.push(`超长连续字符：${'W'.repeat(160)}`, '');
    if (n === 12) {
      body.push('| 节点 | 内容 | 说明 |', '| --- | --- | --- |', '| A | 长文档 | 滚动 |', '| B | 批注槽 | 定位 |', '| C | 建议 | 决策 |', '');
    }
    if (n === 18) body.push('第 18 节额外说明：这一节的建议位于文档中部，用来检查批注槽是否需要滚动。', '');
    if (n === 20) {
      body.push('```txt', `const veryLongLine = '${'0123456789'.repeat(12)}';`, '```', '');
    }
    if (n === 28) body.push('> 第 28 节的引用：长文档中的引用仍按普通 Markdown 渲染。', '');
  }
  body.push('结尾段落：滚动到底部时，标题栏、文档栏和批注槽都应可达。', '');
  return lines(...body);
}

const fixtures = [
  {
    key: 'render',
    title: 'Markdown 渲染验收',
    content: lines(
      '# Markdown 渲染验收',
      '',
      '这是一篇用于验收渲染效果的示例文档。正文以 Markdown 源文本保存，界面负责渲染。',
      '',
      '## 标题层级',
      '',
      '### 三级标题',
      '#### 四级标题',
      '##### 五级标题',
      '###### 六级标题',
      '',
      '## 行内样式',
      '',
      '普通、*斜体*、**粗体**、***粗斜体***、~~删除线~~、`inline code`、H~2~O、E=mc^2^。',
      '',
      '行尾两个空格产生硬换行：  ',
      '这是第二行。',
      '',
      '转义与实体：&copy; &amp; \\*不是斜体\\*。',
      '',
      '原始 HTML 不生效：<b>加粗标签</b> 与 <kbd>Ctrl</kbd> 应显示为字面量。',
      '',
      '> 一级引用：Markdown 源文本是唯一事实源。',
      '>',
      '> > 二级引用：渲染只用于阅读，不参与坐标计算。',
      '>',
      '> - 引用中的列表项',
      '> - 引用中的第二项',
      '',
      '## 列表',
      '',
      '- 无序列表第一项',
      '- 无序列表第二项',
      '  - 嵌套第一层',
      '    - 嵌套第二层',
      '- 无序列表第三项',
      '',
      '1. 有序列表第一项',
      '2. 有序列表第二项',
      '3. 有序列表第三项',
      '',
      '3. 从三开始',
      '4. 继续四',
      '5. 继续五',
      '',
      '- [ ] 任务列表语法未启用',
      '- [x] 已勾选任务同样显示字面量',
      '',
      '## 表格',
      '',
      '| 语法 | 渲染 | 源码 |',
      '| :--- | :---: | ---: |',
      '| 标题 | 支持 | `#` |',
      '| 表格 | 支持 | 竖线 |',
      '| 任务列表 | 未启用 | `- [ ]` |',
      '',
      '## 代码',
      '',
      '行内代码：`const answer = 42`。',
      '',
      '```js',
      'function greet(name) {',
      '  return `你好，${name}！`;',
      '}',
      '```',
      '',
      '```json',
      '{',
      '  "document": "markdown",',
      '  "version": 0,',
      '  "suggestions": 8',
      '}',
      '```',
      '',
      '## 链接与分隔线',
      '',
      '[DSH 官网](https://example.com/docs) · [邮件](mailto:space@example.com) · <https://example.com/autolink>',
      '',
      '---',
      '',
      '结尾段落：滚动到这里仍应看到固定标题栏。',
    ),
    proposals: [
      { label: '修改标题', op: 'replace', find: 'Markdown 渲染验收', text: 'Markdown 渲染与审阅验收' },
      { label: '修改粗体', op: 'replace', find: '**粗体**', text: '**加粗文本**' },
      { label: '删除原始 HTML 段落', op: 'delete', find: '原始 HTML 不生效：<b>加粗标签</b> 与 <kbd>Ctrl</kbd> 应显示为字面量。\n\n' },
      { label: '引用中新增列表项', op: 'insert', at: '> - 引用中的第二项\n', edge: 'end', text: '> - 引用中新增的第三项\n' },
      { label: '修改表格单元', op: 'replace', find: '| 任务列表 | 未启用 | `- [ ]` |', text: '| 任务列表 | 字面量 | `- [ ]` |' },
      { label: '修改代码行', op: 'replace', find: '  return `你好，${name}！`;', text: '  return `Hello, ${name}!`;' },
      { label: '表格末尾新增行', op: 'insert', at: '| 任务列表 | 未启用 | `- [ ]` |\n', edge: 'end', text: '| 图片 | 外链 | `![]()` |\n' },
      { label: '修改链接文字', op: 'replace', find: '[DSH 官网](https://example.com/docs)', text: '[DeepSeek Harness](https://example.com/docs)' },
    ],
  },
  {
    key: 'suggestions',
    title: '建议决策验收',
    content: lines(
      '# 建议决策验收',
      '',
      '## 相邻替换',
      '',
      '序列 AlphaBeta 中，Alpha 与 Beta 是两个首尾相接的修改单位。',
      '',
      '## 同点插入',
      '',
      '两个同点插入在这里：写入后顺序必须稳定。',
      '',
      '## 边界插入',
      '',
      '边界目标需要先替换，再在它的起点和终点外侧各插入一段文字。',
      '',
      '## 列表',
      '',
      '- 待修改的列表项',
      '- 待删除的列表项',
      '- 保留的列表项',
      '',
      '## 表格',
      '',
      '| 名称 | 状态 |',
      '| --- | --- |',
      '| 引擎 | 待替换 |',
      '',
      '## 引用',
      '',
      '> 引用中的蓝色文字将被修改。',
      '',
      '## 长段落',
      '',
      '这一段包含一个待删除的从句，删除后其余文字应保持原样。句号之后还有内容，用于确认删除范围没有吃掉相邻字符。',
      '',
      '结尾固定文字。',
    ),
    proposals: [
      { label: '修改标题', op: 'replace', find: '建议决策验收', text: '建议决策 · 压力测试' },
      { label: '相邻替换 A', op: 'replace', find: 'Alpha', text: 'AlphaOne' },
      { label: '相邻替换 B', op: 'replace', find: 'Beta', text: 'BetaTwo' },
      { label: '同点插入 1', op: 'insert', at: '两个同点插入在这里：', edge: 'end', text: '【第一次插入】' },
      { label: '同点插入 2', op: 'insert', at: '两个同点插入在这里：', edge: 'end', text: '【第二次插入】' },
      { label: '替换边界目标', op: 'replace', find: '边界目标', text: '新的边界目标' },
      { label: '起点边界插入', op: 'insert', at: '边界目标', edge: 'start', text: '〈起点插入〉' },
      { label: '终点边界插入', op: 'insert', at: '边界目标', edge: 'end', text: '〈终点插入〉' },
      { label: '修改列表项', op: 'replace', find: '- 待修改的列表项', text: '- 已修改的列表项' },
      { label: '删除列表项', op: 'delete', find: '- 待删除的列表项\n' },
      { label: '新增列表项', op: 'insert', at: '- 保留的列表项\n', edge: 'end', text: '- 新增的列表项\n' },
      { label: '修改表格单元', op: 'replace', find: '待替换', text: '已替换' },
      { label: '修改引用文字', op: 'replace', find: '蓝色文字', text: '靛蓝色文字' },
      { label: '删除从句', op: 'delete', find: '待删除的从句，' },
      { label: '修改结尾', op: 'replace', find: '结尾固定文字。', text: '结尾固定文字（已修改）。' },
    ],
  },
  {
    key: 'long',
    title: '长篇 Markdown 滚动与批注槽定位验收',
    content: longDocument(),
    proposals: [
      { label: '修改长文标题', op: 'replace', find: '长篇 Markdown 滚动与批注槽定位验收', text: '长篇 Markdown · 滚动与批注槽验收' },
      { label: '修改第 5 节', op: 'replace', find: '第 5 节的正文包含一个待修改的词。', text: '第 5 节的正文包含一个已经修改的词。' },
      { label: '修改第 18 节', op: 'replace', find: '第 18 节的正文包含一个待修改的词。', text: '第 18 节的正文包含一个已经修改的词。' },
      { label: '修改结尾', op: 'replace', find: '结尾段落：滚动到底部时，标题栏、文档栏和批注槽都应可达。', text: '结尾段落（已修改）：滚动到底部时，标题栏、文档栏和批注槽都应可达。' },
    ],
  },
  {
    key: 'i18n',
    title: '中文、表情与边界验收',
    content: lines(
      '# 中文、表情与边界验收',
      '',
      '本段包含中文标点：「引号」、『双引号』、（括号）、《书名号》、省略号……与破折号——以及全角空格　和零宽字符\u200b。',
      '',
      '表情：😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖',
      '',
      '家庭组合：👨‍👩‍👧‍👦；肤色修饰：👋🏻 👋🏼 👋🏽；职业组合：🧑‍🚀 👩‍💻。',
      '',
      '中文与 emoji 相邻：这里兴奋😀，那里惊讶😲，删除时不能拆开代理对。',
      '',
      '反向文字：مرحبا بالعالم — 这一段用于检查双向文字排版。',
      '',
      '长链接：https://example.com/a/very/long/path/that/should/wrap/or/scroll/without/breaking/layout?query=1234567890。',
      '',
      '结尾。',
    ),
    proposals: [
      { label: 'emoji 前替换', op: 'replace', find: '兴奋', text: '非常兴奋' },
      { label: '删除含 emoji 片段', op: 'delete', find: '那里惊讶😲，' },
      { label: '文首插入', op: 'insert', offset: 0, text: '【文首插入】\n\n' },
      { label: '文末插入', op: 'insert', offset: 'end', text: '\n\n【文末追加】。' },
      { label: '阿拉伯文字修改', op: 'replace', find: 'مرحبا بالعالم', text: 'مرحبًا بالعالم' },
    ],
  },
  {
    key: 'structure',
    title: '结构验收 · 表格 / 代码 / 引用',
    content: lines(
      '# 结构验收 · 表格 / 代码 / 引用',
      '',
      '## 宽表格',
      '',
      '| 编号 | 名称 | 负责模块 | 状态 | 版本 | 更新时间 | 备注 |',
      '| ---: | :--- | :--- | :---: | ---: | :---: | :--- |',
      '| 1 | 审阅内核 | review-core | 完成 | 0.1.0 | 2026-11-20 | 文本替换 |',
      '| 2 | 评论文档 | comments | 完成 | 0.1.0 | 2026-11-20 | 锚点映射 |',
      '| 3 | 渲染层 | client | 进行中 | 0.1.0 | 2026-11-22 | Markdown |',
      '',
      '## 代码块',
      '',
      '```js',
      "const offset = content.indexOf('待修改的代码行');",
      "const replacement = '已修改的代码行';",
      '```',
      '',
      '```diff',
      '- 旧的一行',
      '+ 新的一行',
      '```',
      '',
      '超长代码行：',
      '',
      '```txt',
      `const veryLongToken = '${'0123456789'.repeat(12)}';`,
      '```',
      '',
      '## 引用',
      '',
      '> 第一层引用，包含 **强调** 与 `code`。',
      '>',
      '> > 第二层引用。',
      '>',
      '> 结尾引用段落。',
      '',
      '最后一段。',
    ),
    proposals: [
      { label: '修改表格状态', op: 'replace', find: '进行中', text: '已验收' },
      { label: '表格末尾新增行', op: 'insert', at: '| 3 | 渲染层 | client | 进行中 | 0.1.0 | 2026-11-22 | Markdown |\n', edge: 'end', text: '| 4 | 批注槽 | client | 进行中 | 0.1.0 | 2026-11-22 | 连线 |\n' },
      { label: '修改代码中的文字', op: 'replace', find: '待修改的代码行', text: '已修改的代码行' },
      { label: '代码块中新增一行', op: 'insert', at: "const replacement = '已修改的代码行';", edge: 'end', text: '\nconst reviewed = true;' },
      { label: '修改引用文字', op: 'replace', find: '第一层引用，包含 **强调** 与 `code`。', text: '第一层引用，包含 **强调**、`code` 与 ~~删除线~~。' },
    ],
  },
  {
    key: 'edge',
    title: '边界验收',
    content: lines(
      '# 边界验收',
      '',
      '第一行正文。',
      '第二行正文。',
      '',
    ),
    proposals: [
      { label: '文首插入', op: 'insert', offset: 0, text: '【文首插入】\n\n' },
      { label: '文末插入', op: 'insert', offset: 'end', text: '【文末插入】' },
      { label: '修改第一行', op: 'replace', find: '第一行正文。', text: '第一行已修改的正文。' },
      { label: '删除第二行', op: 'delete', find: '第二行正文。\n' },
    ],
  },
  {
    key: 'comments',
    title: '评论与锚点验收',
    content: lines(
      '# 评论与锚点验收',
      '',
      '## 自动映射',
      '',
      '请先选中下方段落中的目标句子并添加一条评论，再接受下面的第一条建议；评论应自动移动到新的位置，而不是标记失效。',
      '',
      '需要评论的句子位于这一段中间。',
      '',
      '## 位置失效',
      '',
      '请选中下方段落中的待删除引用并添加评论，再接受下面的删除建议；评论应保留引用并进入「位置已失效」分组，且不绘制正文连线。',
      '',
      '这一句将被删除，前后文字保留。',
      '',
      '## 发送',
      '',
      '评论创建后不应自动发送；确认无当前对话或会话不可用时仍保留评论。只有点击顶部「全部发送」才送入当前对话。',
    ),
    proposals: [
      { label: '评论位置前插入', op: 'insert', at: '需要评论的句子位于这一段中间。', edge: 'start', text: '在评论之前插入的一句话。' },
      { label: '删除评论引用', op: 'delete', find: '这一句将被删除，' },
    ],
  },
  {
    key: 'clean',
    title: '无建议的阅读状态',
    content: lines(
      '# 无建议的阅读状态',
      '',
      '这篇文档没有待处理建议，用于对比正常阅读状态与审阅状态。',
      '',
      '## 一览',
      '',
      '- 侧边栏标题应显示「无建议的阅读状态」',
      '- 批注槽应显示空状态',
      '- 顶部计数为 0',
      '',
      '没有更多内容。',
    ),
    proposals: [],
  },
];

function locate(text, needle, nth = 0) {
  let at = -1;
  for (let index = 0; index <= nth; index += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) break;
  }
  if (at < 0) throw new Error(`Anchor not found (nth ${nth}): ${JSON.stringify(needle)}`);
  return at;
}

const boundarySafe = (text, index) => !(index > 0 && index < text.length
  && text.charCodeAt(index - 1) >= 0xd800 && text.charCodeAt(index - 1) <= 0xdbff
  && text.charCodeAt(index) >= 0xdc00 && text.charCodeAt(index) <= 0xdfff);

function resolveProposal(content, proposal, index) {
  let from;
  let to;
  let expected;
  let replacement;
  if (proposal.op === 'insert') {
    expected = '';
    replacement = proposal.text;
    if (proposal.offset === 'end') from = content.length;
    else if (proposal.offset === 0) from = 0;
    else {
      const at = locate(content, proposal.at, proposal.nth || 0);
      from = proposal.edge === 'end' ? at + proposal.at.length : at;
    }
    to = from;
  } else {
    expected = proposal.find;
    replacement = proposal.op === 'delete' ? '' : proposal.text;
    from = locate(content, expected, proposal.nth || 0);
    to = from + expected.length;
  }
  if (!boundarySafe(content, from) || !boundarySafe(content, to)) throw new Error(`Range splits a surrogate pair: ${proposal.label}`);
  if (content.slice(from, to) !== expected) throw new Error(`Expected text mismatch: ${proposal.label}`);
  return { ...proposal, index, from, to, expected, replacement };
}

function assertNoOverlap(proposals) {
  for (let left = 0; left < proposals.length; left += 1) {
    for (let right = left + 1; right < proposals.length; right += 1) {
      const a = proposals[left];
      const b = proposals[right];
      const hit = a.from === a.to && b.from === b.to ? false
        : a.from === a.to ? a.from > b.from && a.from < b.to
          : b.from === b.to ? b.from > a.from && b.from < a.to
            : a.from < b.to && b.from < a.to;
      if (hit) throw new Error(`Fixtures overlap: ${a.label} / ${b.label}`);
    }
  }
}

const selectedFixtures = only ? fixtures.filter(fixture => fixture.key === only) : fixtures;
if (only && !selectedFixtures.length) throw new Error(`Unknown fixture: ${only}`);

const planned = selectedFixtures.map(fixture => {
  const id = `md-ui-${fixture.key}-${suffix}`;
  const proposals = fixture.proposals.map((proposal, index) => resolveProposal(fixture.content, proposal, index));
  assertNoOverlap(proposals);
  return { ...fixture, id, proposals };
});

function oldFixtureIds() {
  const file = path.join(home, 'review.sqlite');
  if (!existsSync(file)) return [];
  const db = new DatabaseSync(file, { readOnly: true, timeout: 5000 });
  try {
    return db.prepare('SELECT id FROM review_documents WHERE substr(id, 1, ?) = ? ORDER BY rowid')
      .all(fixturePrefix.length, fixturePrefix)
      .map(row => row.id);
  } finally {
    db.close();
  }
}

/** Delete only documents created by this seed script, including their comments. */
function removeOldFixtures() {
  const service = new SpaceService(home);
  const comments = new CommentStore(path.join(home, 'review.sqlite'));
  const removed = [];
  try {
    const documents = service.listDocuments().filter(document => document.id.startsWith(fixturePrefix));
    for (const document of documents) {
      try {
        comments.deleteDocument(document.id);
      } catch (error) {
        throw new Error(`Cannot clean ${document.id}: ${error.message}`, { cause: error });
      }
      service.deleteDocument(document.id);
      // deleteDocument keeps proposal operations; remove the complete operation
      // family so a re-seed starts without stale idempotency records.
      service.store.db.prepare('DELETE FROM review_operations WHERE id = ? OR substr(id, 1, ?) = ?')
        .run(document.id, document.id.length + 1, `${document.id}-`);
      removed.push(document);
    }
    // Also drop operation rows left by a previous partial cleanup.
    service.store.db.prepare('DELETE FROM review_operations WHERE substr(id, 1, ?) = ?').run(fixturePrefix.length, fixturePrefix);
  } finally {
    comments.close();
    service.close();
  }
  return removed;
}

async function openClient() {
  const client = new Client({ name: 'space-markdown-ui-seed', version: '0.1.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(repo, 'server', 'mcp.js')],
    env: { ...process.env, DSH_SPACE_HOME: home },
    stderr: 'pipe',
  });
  await client.connect(transport);
  return client;
}

async function callTool(client, name, args) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.find(item => item.type === 'text')?.text;
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (result.isError) {
    const error = new Error(`${name}: ${payload?.error?.message || text || 'tool failed'}`);
    error.code = payload?.error?.code;
    throw error;
  }
  return payload;
}

console.log(`Space home: ${home}`);
if (dryRun) {
  const old = oldFixtureIds();
  if (keepOld) console.log('Would keep existing fixture documents (--keep-old).');
  else console.log(old.length ? `Cleanup would remove ${old.length} old fixture document(s):` : 'No old fixture documents to remove.');
  if (!keepOld) for (const id of old) console.log(`  - ${id}`);
  if (!cleanOnly) {
    for (const doc of planned) {
      console.log(`\n${doc.title} -> ${doc.id} (${doc.content.length} chars, ${doc.proposals.length} suggestions)`);
      for (const item of doc.proposals) console.log(`  [${item.from},${item.to}) ${item.label}: ${JSON.stringify(item.expected.slice(0, 30))} -> ${JSON.stringify(item.replacement.slice(0, 30))}`);
    }
  }
  process.exit(0);
}
if (keepOld) {
  console.log('Keeping existing fixture documents (--keep-old).');
} else {
  const removed = removeOldFixtures();
  console.log(removed.length ? `Removed ${removed.length} old fixture document(s):` : 'No old fixture documents to remove.');
  for (const document of removed) console.log(`  - ${document.id} · ${document.title}`);
}
if (cleanOnly) {
  console.log('Cleanup only (--clean-only); nothing seeded.');
  process.exit(0);
}

const client = await openClient();
try {
  for (const doc of planned) {
    const created = await callTool(client, 'space_document_create', {
      id: doc.id,
      text: doc.content,
      operationId: `${doc.id}-create`,
    });
    for (const item of doc.proposals) {
      await callTool(client, 'space_suggest', {
        docId: doc.id,
        baseVersion: created.version,
        from: item.from,
        to: item.to,
        expected: item.expected,
        replacement: item.replacement,
        operationId: `${doc.id}-s${item.index + 1}`,
      });
    }
    console.log(`  created ${doc.id} · ${doc.title} · ${doc.proposals.length} suggestions · version ${created.version}`);
  }
  const listed = await callTool(client, 'space_documents', {});
  console.log(`\nTotal documents: ${listed.documents.length}`);
  console.log(`Seed suffix: ${suffix}`);
} finally {
  await client.close();
}
