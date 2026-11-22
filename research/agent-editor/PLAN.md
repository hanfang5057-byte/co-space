# 以 Milkdown 为基础的「人机协同编辑」DSH 插件方案

> 调研对象：Milkdown `7.23.0`（MIT，2026-10-27 发布）· DeepSeek Harness `0.2.2-rc.5`
>
> 版本：v1.0 · 日期：2026-11-21 · 状态：**方案待评审**（未写实现代码）
>
> 配套材料：[dsh-host-brief.md](dsh-host-brief.md)（Host 扩展点）· [dsh-ui-brief.md](dsh-ui-brief.md)（Client 扩展点）

---

## 0. 一页结论

**能做，而且 Milkdown 是这个需求目前能找到的最省力的底座**——它把「AI 流式写入 + 逐块 diff 审阅」做成了官方插件（`@milkdown/plugin-streaming`、`@milkdown/plugin-diff`），DSH 的 slot/工具/投影机制刚好能承载外层产品形态。

但有一个关键判断必须先讲清楚：

> **Milkdown 的 streaming 与 diff review 在运行期会锁死编辑（`filterTransaction` 直接丢弃 `docChanged` 事务）。它们解决的是「Agent 写、人看/审」，不是「人机同时打字」。** 真正的并发现写必须走 Yjs（Milkdown 有 `plugin-collab`），而 Yjs 与这两个插件不能叠加。

由此得出推荐的演进路径：

| 阶段 | 协同模型 | 并发控制 | 代价 | 建议 |
|---|---|---|---|---|
| **v1（推荐先做）** | **单写者轮换 + 提议审阅**：人写时 Agent 只能提议；Agent 落地时用**动画式一次性提交**（不改文档、不锁编辑） | 文件版本 CAS + "脏则不覆盖，转为提议" | 低（不需要 CRDT、不需要常驻同步服务） | ✅ 产品化主线 |
| **v1.5（可选）** | **选区改写**：选中一段 → Agent 直接流式重写（官方 `plugin-streaming`，短暂锁编辑、可 Esc 取消） | 同上 | 低（复用官方流式） | ✅ 与 v1 并行做，成本极低 |
| **v2（可选）** | **真·实时同写**：Agent 作为 Yjs peer，带自己的光标/presence | Yjs CRDT | 高（Host 常驻文档会话 + 序列化回写 + 运维） | 仅当"同时打字"是硬需求 |

配套的判断：

- **底座选 `@milkdown/kit`（headless），不选 Crepe。** 实测打包（esbuild、minify、gzip）：kit + commonmark + gfm + history + listener + streaming + diff = **486 KB / 150 KB gzip**；Crepe 全量 = **2725 KB / 904 KB gzip**。Crepe 的 AI 面板是"LLM 指令调色板"，与"Agent 工具驱动"不是同一套交互，省下的 750 KB 和避免的主题冲突比开箱 UI 更值钱。
- **真相源仍然是 workspace 里的 Markdown 文件**（沿用 DSH 的 `ctx.fs` 与沙箱策略），编辑器不引入第二份权威数据。
- **Agent 不能整篇重写**。必须给 Agent 一套"块级锚点 + 补丁"的工具协议，否则每次编辑都是全文 diff，人无法审阅也保不住格式。
- **通信不需要代码生成**：Host→Client 用 `webServer.register` 的插件自有 HTTP/SSE 路由（本地 bundle 已有先例），Client→Agent 用已生成的 `remote.session.prompt`，Agent 活动用 `session/follow`。唯一的自研传输是"人保存文档"这一条单向 POST。
- **"流式"要分层看**：工具不支持流式输出（DSH 硬约束），所以 Agent 经工具写文档必然是"整块落地"。默认路径用**装饰层打字机动画 + 单事务提交**（观感是流式，实际不锁编辑）；官方 streaming 只用于"选区改写"这种用户明确要求 AI 重写的短场景。见 §4.5。

---

## 1. Milkdown 能力模型（事实）

### 1.1 架构定位

Milkdown 是 **ProseMirror 之上的 Markdown 双向编辑器框架**：Markdown → Remark AST → ProseMirror Schema → PM Document，反向序列化回 Markdown。它本身"headless"（不含 CSS），所有能力都是 Cordis 风格的插件（`$ctx` / `$command` / `$prose` / `$nodeSchema`），用 `Editor.make().use(...).create()` 组装。

对我们有意义的三点：

1. **Markdown 就是数据模型**——与 DSH 的"文件即真相源"天然一致，不需要为编辑器单独设计存储。
2. **命令系统可被外部驱动**：`editor.action((ctx) => ctx.get(commandsCtx).call(cmd.key, args))`，这意味着"Agent 的输出"可以完全绕开 UI，直接驱动编辑器命令（这正是 streaming 插件的用法）。
3. **schema 可扩展**：`$nodeSchema(...).extendSchema(handler)`（`packages/utils/src/composable/composed/$node-schema.ts:23`），可以给块加运行时属性。

### 1.2 与协同编辑直接相关的四个能力

| 能力 | 形态 | 关键事实 | 证据 |
|---|---|---|---|
| **流式写入** | `@milkdown/plugin-streaming` | 4 条命令（start/push/end/abort）+ 节流 flush；**streaming 期间 `filterTransaction` 丢弃所有用户 `docChanged` 事务** | `plugin-streaming/src/streaming-plugin.ts:75-90` |
| **逐块审阅** | `@milkdown/plugin-diff` | `computeDocDiff(old,new,{range,ignoreAttrs})` 按块 LCS；diff review 期间同样**锁编辑** | `plugin-diff/src/diff-plugin.ts:130-139`；`diff-compute.ts:22-32` |
| **AI 编排** | `@milkdown/crepe/feature/ai` | `AIProvider = (ctx, signal) => AsyncIterable<string>`；把 provider 换成 DSH Agent 的输出即可复用整套 UI | `crepe/src/feature/ai/types.ts:12-31` |
| **实时协同** | `@milkdown/plugin-collab` | y-prosemirror + awareness，`bindDoc().setAwareness().connect()`，自带远端光标 | `plugin-collab/src/collab-service.ts:60-140` |

#### 流式写入的真实语义（决定产品形态）

```ts
// plugin-streaming/src/streaming-commands.ts
export const startStreamingCmd = $command('StartStreaming', () => {
  return (options?: StartStreamingOptions) => (state, dispatch) => { ... }
})
// options.insertAt?: 'cursor' | 'selection' | number
```

- 插入策略（`defaultInsertStrategy`，`flush.ts:56-78`）：代码块→纯文本（保留换行）；表格单元→纯文本（折叠换行）；其他文本块→首行合并进当前块、余下按块插入；块之间→整段 Markdown 解析插入。
- 每次 flush 不是"整篇替换"，而是 `computeDocDiff(当前 doc, 解析出的新 doc)` 后**逐块 apply**（`flush.ts:19-46`）——所以理论上它能保住别处的编辑，但**锁**让人改不了。
- 结束时可 `endStreamingCmd({diffReview:true})` → 恢复原文档 + 进入 diff review（`streaming-commands.ts:123-175`）。
- 配置：`throttleMs`（默认 100）、`scrollFollow`、`diffReviewOnEnd`、`ignoreAttrs`、`insertStrategy`。

#### 审阅的真实粒度

`startDiffReviewCmd(markdown)` / `startDiffReviewFromDocCmd(doc)` **只接受"整篇新文档"，没有 range 参数**。但因为 diff 是"当前 doc vs 目标 doc"逐块比较，**只要目标 doc 里只有目标块不同，审阅就自然只显示那一块**。这足以实现"审阅 Agent 对第 3 节的修改"，无需改插件。

### 1.3 能力缺口（必须自研）

| 缺口 | 影响 | 自研方案 |
|---|---|---|
| **无稳定块 ID** | Agent 无法定位"第 3 节第 2 段"，只能整篇重写或文本匹配 | 用 `extendSchema` 给顶层块加 `blockId` 属性（不参与序列化，参考 `heading.id` 的先例：`preset-commonmark/src/node/heading.ts:55-57,100-104`） |
| **无评论/建议线程** | 无法"在段落上留一句 Agent 的解释" | 用 PM Decoration + widget 自建（Milkdown 的 tooltip/slash 插件是同类先例） |
| **diff 不能"合并到子区间"** | 人改了 A 块、Agent 改了 B 块时无法只接受 B | 客户端在生成目标 doc 时，用"当前 doc 的 A + 新文件的 B"构造，diff 自然只剩 B |
| **没有"不锁编辑"的流式** | 官方 streaming 期间不能人机同时打字 | 本方案用 §4.5 路线 A（装饰层动画 + 单事务）规避；若确需真流式且不锁，`flushBuffer` 未导出，需自研约 30 行（parser → `computeDocDiff` → 逐块 replace） |
| **listener 序列化开销** | 大文档每次变更都 `getMarkdown()` 会卡 | 只在"脏→保存"和需要时序列化；文档明确警告（`guide/interacting-with-editor`） |

### 1.4 安全性（意外的好消息）

- 原始 HTML 不会被执行：`htmlSchema` 用 `span.textContent` 渲染，`toDOM` 只写文本（`preset-commonmark/src/node/html.ts:20-30`）。
- 链接被消毒：`sanitizeLinkHref` 在渲染前干掉 `javascript:` / `data:` 等（`preset-commonmark/src/mark/link.ts:43-45`）。

→ **Agent 写的 Markdown 不会凭空变成 XSS**，这对"让模型直接产出内容"的场景是硬前提。

### 1.5 成熟度

- MIT，2021-04 起 175 个版本，最新 `7.23.0`（2026-10-27），近一年持续发版；仓库 12k stars，最近一次提交在调研前一天。
- AI 能力标记为 **7.21 起** 的第一方特性（Crepe 层），底层 streaming/diff 是独立插件，可脱离 Crepe 使用。

---

## 2. DSH 扩展点与可用通道（事实）

### 2.1 插件形态

一个 bundle = 普通 npm 包 + `package.json.dsh` + 一份 `cordis.patch.yml`：

```jsonc
{
  "name": "@local/dsh-coedit",
  "type": "module",
  "exports": { ".": "./index.js", "./client": "./client.js",
               "./locale/*.json": "./locale/*.json", "./icon": "./icon.svg" },
  "engines": { "dsh": "^0.2.2-rc.5" },      // 预发布必须原样写左边界
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true,
                "inject": ["@deepseek-ai/dsh-client-ui-layout"] }
  }
}
```

- Host 半：`export const name` + `export const inject = [...]` + `export function apply(ctx, config)`；所有资源必须在 `apply` 内用 `ctx.effect` 注册并返回清理（没有 `start/stop` 钩子）。
- Client 半：`window.__ModuleLoader__.load({ id, factory })`，`id` 必须等于包名，工厂返回 `{ inject, apply(ctx) }`。
- **跨插件 value import 被构建期禁止**，插件间协作只能走 Cordis service；但 `@deepseek-ai/dsh-*` 这类"随 dsh 安装发行的包"可以从安装目录解析（bundle 不必声明依赖），所以 `import { defineTool } from '@deepseek-ai/dsh-tools'` 可用。
- 一个可安装 bundle 还需要：`locale/*.json`（标题/描述/详情的 i18n）、`docs/DETAIL.md` + `docs/preview.svg`（安装详情页）、`icon.svg`（≤256 KiB）。缺这些不影响加载，但会显得不完整。

### 2.2 可用的 UI 挂载点

| 槽位 | kind | 用途 |
|---|---|---|
| `main` | keyed / root | **主编辑区面板**（按 panel id 切换，`ctx.layout.selectPanel(id)`） |
| `sidebar.panellist` | list / root | 左侧图标入口（`id` 必须等于 main 的 key） |
| `shell.overlay` | list / root | "Agent 正在改第 3 节"浮层 |
| `conversation.composer.dock` | list / session | 编辑器选区 →"交给 Agent"chip |
| `conversation.session.header.actions` | list / session | "在编辑器打开 / 让 Agent 改这段" |
| `settings.section` | list / root | 插件设置 |

面板 props 自带 `sessionId` / `useSession(selector)` / `useProjection(key, selector)` / `useAccess(action)`；没有 `sessionId` 的 root 槽用 `useSessions()` 取当前会话。

主题只引用 `--dsw-alias-*`（`--dsw-alias-bg-base`、`--dsw-alias-label-primary`、`--dsw-alias-border-l3`…），深浅色由宿主切换，插件不用自己实现。

### 2.3 通道矩阵（这是本方案能"零 codegen"成立的关键）

| 方向 | 需求 | 可用机制 | 结论 |
|---|---|---|---|
| Agent → 文件 | Agent 读写文档 | Host `ctx.fs`（`resolve/readText/writeText/patchText/stat/watch`，带 `FsWriteIntent` 版本守卫） | ✅ 现成 |
| 文件 → 编辑器 | 文件变了，编辑器要知道 | `remote.workspaceFiles.changes(sessionId, path)`（**已生成的 stream Remote**） | ✅ 现成，无需自研 |
| 编辑器 → 文件 | 人保存 | ❌ 没有写文件 Remote | 需插件自有路由 |
| 插件路由 | 人的保存 / presence | `ctx.webServer.register({ kind:'prefix', path:'/dsh-coedit', handler })` | ✅ 有先例（本工作区 `@local/dsh-space` 用它做 `/dsh-space-api`） |
| 编辑器 → Agent | "把这段改了" | `remote.session.prompt(sessionId, text)` / `remote.commands.execute` | ✅ 现成 |
| Agent 活动 → UI | 流式状态、工具卡片 | `remote.session.follow` / `observeEvent`；宿主既有 Conversation 层已处理 | ✅ 现成 |
| 派生状态 | "人在编辑哪一块" | Host `sessionProjections.register({key, init, apply, wire:{view}})` + 客户端 `useProjection` | ✅ 现成 |
| 自定义 `@Remote` 命名空间 | — | 需要 Typert codegen；SRC 回退没有 Client 类型投影 | ❌ 不用 |

鉴权已核实：插件自有路由默认 `auth: 'required'`，由 `webserver/authorize` 瀑布决定；默认 token provider 基于**页面 cookie**（`packages/host/authentication-token/src/index.ts:35-43`），同源 `fetch` 自动携带 → 客户端插件可以直接 `fetch('/dsh-coedit/save')`。这一点有本地先例，但仍列为 M0 须验证项。

### 2.4 工具（Agent 可调用面）

```ts
ctx.tools.register(defineTool({
  name: 'doc_patch',
  parameters: {                       // 隐式 open object 根；required 是属性级的
    path: { type: 'string', required: true },
    baseVersion: { type: 'string', required: true },
    ops: { type: 'array', required: true, items: { type: 'json' } },
  },
  output: { schema: { type: 'object' },

            render: (_a, v) => [{ type: 'text', text: JSON.stringify(v) }] },
  async execute(args, exec) { ... },
}), { when: ({ agent }) => true })
```

- 没有 `requiresApproval` / `readonly` 字段；要人确认只能 `tools/pre-execute` 返回 `{ kind:'ask', reason, displayReason:{en,zh} }`，再落 `ctx.approval.request()`。
- **工具不支持流式输出**；流式只存在于 `agent/assistant-stream` 事件。
- 想向运行中的会话补上下文：`agent.inject/followup/steer`；打断用 `agent.cancel({kind:'user'})`。

### 2.5 与宿主 React / 前端生态的兼容性

结论先说：**没有"生态冲突"，但有 3 条硬规则和 1 条选型建议**。逐项核实如下。

| # | 冲突面 | 事实（证据） | 做法 |
|---|---|---|---|
| 1 | **React 单实例** | 宿主把 `react` / `react/jsx-runtime` / `react-dom` / `react-dom/client` 冻结进 module table（`packages/client/web/src/platform.ts:8-18`），插件里的 `require` 只查这张表 | 构建**必须**把这四个 specifier 标为 external（esbuild `--external:react --external:react-dom…`），**禁止**把 React 打进 bundle；否则 `Invalid hook call` 或两份状态树 |
| 2 | **版本** | 宿主 `react@18.3.1`（`pnpm-lock.yaml:170` 等）；`@milkdown/react@7.23` 的 peer 是 `react: *`，实现里只用到 `useEffect` / `useLayoutEffect`（本工作区 `research/wysiwyg-spike` 安装的 7.23.0：`@milkdown/react/lib/index.js`） | 兼容。将来宿主升 19 时需复核（peer `*` 不会替你挡住） |
| 3 | **是否用 `@milkdown/react`** | 它依赖 `react` 与 `react-dom` 的 peer，但不使用 19-only API | **可以不用**：面板组件里 `useRef` + `useEffect` 直接 `Editor.make()`，React 耦合面缩到"一个组件 + 一个 ref"，最稳。用了也要 external |
| 4 | **第二个 React root** | 宿主已 `createRoot` + `flushSync` 挂整棵树（`ui-renderer/src/client/renderer.ts:27-46`）；slot 组件本身就是 React 组件 | 面板直接返回 `<div ref>`，**禁止**再 `createRoot`；编辑器是 DOM 级挂载，不是 React 子树 |
| 5 | **StrictMode 双跑** | 生产 renderer **没有** StrictMode（只在 `ui-renderer/tests/*` 里用），但宿主组件保证 StrictMode-safe | 我们的 mount effect 写成幂等（存在实例就复用、cleanup 只 destroy 自己创建的），测试里才能在 StrictMode 下跑 |
| 6 | **状态同步方向** | ProseMirror 的 doc 是外部可变状态，不进 React store | 编辑器实例放 `ref`，`state` 只放"版本 / 保存态 / presence"；**严禁**把 markdown 放 `useState` 再回灌——每次按键都会重渲染甚至重挂载 |
| 7 | **键盘快捷键** | 宿主有 `ctx.shortcuts` 注册表，命令带 `regions: 'page'｜'editable'｜'terminal'`，并**内置冲突检测**（`packages/client/shortcuts/src/client/types.ts:15-42`、`registry.ts:118-125`） | 编辑器相关快捷键按 `region: 'editable'` 注册，冲突会在宿主侧被标出来；Milkdown 自己的 keymap 只在编辑器 DOM 内生效，不会全局劫持 |
| 8 | **CSS 作用域** | ProseMirror 样式只打 `.ProseMirror*`（`prosemirror-view/style/prosemirror.css`）；Crepe 主题与 reset 全部挂在 `.milkdown` 下，**没有 `:root` 变量、没有全局 reset**（`@milkdown/crepe/lib/theme/common/reset.css`、`theme/frame/style.css`） | 无全局污染。但仍不要把 `*{}`/`body{}` 写进插件样式，只作用于自己的前缀类 |
| 9 | **深浅色** | 宿主用 `body[data-ds-dark-theme]` 切换 `--dsw-alias-*` 的值（`ui-theme/src/styles/design-platform.css:90,328`，共 267 处 alias 引用）；Crepe 的 dark 是**另一张独立样式表**，不会自动跟随 | 用 `--dsw-alias-*` 就自动跟随；这正是**选 kit 不选 Crepe 的第二条理由**（第一条是体积）。若用 Crepe，切主题时要自己换 dark sheet |
| 10 | **双编辑器焦点** | 宿主 Composer 是 Lexical（`ui-conversation/src/client/input/editor/runtime.ts`），与 ProseMirror 无共享状态 | 两者 DOM 子树独立，唯一冲突是全局快捷键与 `Esc` 语义：面板聚焦时把 `Esc` 先给编辑器处理（取消生成/关闭 tooltip），未消费再冒泡 |
| 11 | **卸载语义 vs 保留未保存态** | React 组件卸载必然跑 cleanup | 若要"离开面板不丢未保存内容"：实例放模块级 `Map<path, Editor>`（`ctx.effect` 统一回收），面板只 attach/detach DOM，不在 unmount 里 destroy |
| 12 | **第三方 React 库** | 任何带 React peer 的库（如 `react-aria-components`） | 同样 external，绝不让它带自己的 React 进来 |

**三条硬规则**：① React 及 `react-dom*` 一律 external，从 module table 取；② 不在 slot 里建第二个 React root；③ 文档状态进 ProseMirror，不进 React state。

**一条选型建议**：即使在 `--dsw-alias-*` 之外做主题（比如给 Markdown 的标题/代码块定色），也走 CSS 变量而不是字面颜色——宿主换肤时插件不需要改代码。这一点与 §6.5 的要求一致。

---

## 3. 可行性判定

| 需求 | 判定 | 依据 |
|---|---|---|
| Markdown WYSIWYG 编辑（GFM、表格、代码块） | ✅ 现成 | `@milkdown/kit` presets |
| 在 DSH 主面板里挂编辑器 | ✅ 现成 | `main` 槽 + `useRef` mount（Lexical 先例证明可内联编辑器库） |
| 选区改写（流式 + 中断） | ✅ 现成 | `startStreamingCmd({insertAt:'selection'})` / `pushChunkCmd` / `abortStreamingCmd` |
| Agent 工具写文档时"逐字流出" | ⚠️ 不可得（工具无流式） | 用 §4.5 路线 A：装饰层动画 + 单事务提交 |
| 逐块 接受/拒绝 Agent 修改 | ✅ 现成 | `startDiffReviewFromDocCmd` + `diffComponent` + accept/reject 命令 |
| 人机同时打字 | ⚠️ 需 v2（Yjs） | 两个插件都锁编辑 |
| Agent 精确定位"第 3 节第 2 段" | ⚠️ 需自研块锚 | Milkdown 只有 heading id |
| 人撤销 Agent 的一次改动 | ✅ 现成 | PM history（单事务）+ `addToHistory` 控制 |
| Agent 调用工具改文件、人看到 | ✅ 现成 | `ctx.fs` + `workspaceFiles.changes` |
| 冲突保护 | ✅ 现成（乐观 CAS） | `FsWriteIntent{kind:'replaceIfVersion'}` → `FS_STALE_VERSION` |
| 审批式写文件 | ✅ 现成 | `fs/write-intent` 瀑布 / `tools/pre-execute` |
| 多人 + Agent 三方协同 | ❌ v1 不做 | 需要 CRDT + 身份/权限层 |

---

## 4. 总体架构

### 4.1 三种集成深度（先选深度，再谈实现）

| 方案 | 做法 | 工作量 | 能得到什么 | 不能得到什么 |
|---|---|---|---|---|
| **S0 零协议 Copilot** | 打开 `CrepeFeature.AI`（或 kit 的 streaming/diff），把 `AIProvider` 接到 Host 的模型流（`/dsh-coedit/rewrite` → `ctx.llm` 流回 token） | ~1 天 | 选中文本 →"改进/翻译/缩短"，流式 + diff 审阅，全套 UI 白送 | Agent 不能用工具、不能跨块多步编辑、上下文只有文档+选区 |
| **S1 工具驱动协同**（本方案主线） | 自建面板 + kit 编辑器 + 块锚 + `doc_*` 工具 + 提议审阅 | 3–4 周 | Agent 能按块改、能多步、能解释、人能逐块接受/拒绝/撤销 | 不能人机同时打字 |
| **S2 实时同写** | Yjs + Host 侧文档会话 + Agent 作为 peer | +3–4 周 | 真并发、Agent 光标可见 | 序列化回写、运维、与 streaming/diff 互斥 |

**推荐：先 S1，并把 S0 作为 M0 的"体感验证"顺带做掉**（S0 的 provider 骨架与 S1 的流式通道是同一份代码）。

### 4.2 组件与数据流

```
┌──────────────────────── DSH Web（浏览器） ────────────────────────┐
│  main 面板: 文档编辑器（Milkdown kit）                             │
│   ├─ ProseMirror doc（运行期权威，含 blockId）                     │
│   ├─ streaming / diff 插件（生成态 / 审阅态）                      │
│   ├─ 自研 $prose: 块锚维护、Agent 光标、块级状态装饰                │
│   └─ 自研 UI: 工具栏、审阅队列、状态条（--dsw-alias-*）             │
│  composer.dock: 选区 → "交给 Agent"                                │
└───────┬───────────────────────────────▲──────────────────────────┘
        │ POST /dsh-coedit/save          │ GET /dsh-coedit/state (轮询/SSE)
        │ POST /dsh-coedit/presence      │ remote.workspaceFiles.changes
        │ remote.session.prompt          │ remote.session.follow
        ▼                                │
┌──────────────────────── DSH Host（Node） ─────────────────────────┐
│  @local/dsh-coedit                                               │
│   ├─ 工具: doc_open / doc_outline / doc_read / doc_patch /         │
│   │        doc_propose / doc_focus                                │
│   ├─ 路由: /dsh-coedit/{save,state,presence,proposal,events}       │
│   ├─ fs: ctx.fs.readText / writeText(替换版本CAS) / watch          │
│   └─ projection: docPresence（人在编辑哪块、agent 在改哪块）        │
└───────┬──────────────────────────────────────────────────────────┘
        │ ctx.fs 读写（workspace 沙箱）
        ▼
   workspace/notes/x.md   ← 唯一真相源
```

### 4.3 三条数据流（v1）

**① 人改 → 文件 → Agent**
`listener.markdownUpdated` → 防抖 600 ms → `POST /dsh-coedit/save {path, baseVersion, markdown}` → Host 做版本 CAS 写入 → Agent 下次 `doc_read` 看到新内容。

**② Agent 改 → 文件 → 人**
`doc_patch`（或 `doc_propose`）→ Host 用 remark 解析、定位、生成新 markdown → `writeText(..., {kind:'replaceIfVersion', version})` → 客户端经 `workspaceFiles.changes` 或 `/state` 感知 `version` 变化 →
- 本地**不脏**：直接 `replaceAll` 应用（用 `computeDocDiff` 只替换变化块，避免整篇重置光标）；
- 本地**脏**（人正在打字/未保存）：**不覆盖**，把"新文件内容"与"当前 doc"做 diff，转入**审阅态**，由人逐块决定。

**③ 状态可见**
客户端把"当前文档、选区所在 blockId、是否脏、是否在审阅"上报 presence → Host 汇总进 `docPresence` 投影 → Agent 的工具描述/`doc_read` 结果里可见（"人在第 3 节编辑，勿动"）。

### 4.4 模式下的人机分工（明确产品语义）

| 时刻 | 人能做什么 | Agent 能做什么 |
|---|---|---|
| 人在打字 | 正常编辑 | 只能 `doc_read` / `doc_propose`（提议不落地） |
| Agent 落地中（打字机动画） | 继续编辑其它块（提交那一刻除外） | 已完成工具调用，正在呈现结果 |
| 选区改写中（真流式） | 只看、可 Esc 取消 | 写入被选中的范围 |
| 审阅态（diff review） | 逐块 accept/reject/retry、批量、撤销 | 只能补充说明，不能改 |
| 空闲 | 任意 | `doc_patch` 直接改（若配置为"直改模式"）或继续提议 |

### 4.5 "流式"的两条实现路线（重要）

DSH 的工具**不支持流式输出**（只有 `agent/assistant-stream` 有 token 级事件），所以"把模型的 token 直接倒进编辑器"不能靠工具实现。两条可行路线：

**路线 A：装饰层打字机 + 单事务提交（默认，推荐）**

```
doc_patch/doc_propose 落地
  → 客户端拿到 { blockIds, markdown }
  → 立即在目标块上挂 Decoration.widget（灰色进度骨架）
  → 按 ~30 字/帧 把文本渲染进装饰（纯视觉，不改文档）
  → 渲染完成后一个事务 replace 目标块（addToHistory）
```

- 观感与流式一致，但**文档只在最后变一次**：人不会被打断，也没有"锁编辑"窗口；
- 不需要 `plugin-streaming`，不引入锁语义；
- 撤销粒度天然是"一次 Agent 操作"，符合直觉；
- 代价：不是"真·逐字生成"，用户知道 Agent 早已写完——在这个产品里这不是缺点（Agent 的思考过程在会话里可见）。

**路线 B：官方 streaming（用于"选区改写"）**

```
用户选中一段 → 点「让 Agent 重写」
  → 客户端 POST /dsh-coedit/rewrite { path, from, to, selectionMarkdown, instruction }
  → Host 用 ctx.llm 的流式接口生成（system prompt 强约束"只输出 Markdown 正文"，
     模型取自当前会话的 modelSelection）
  → token 经 SSE 帧推回客户端
  → 客户端 startStreamingCmd({insertAt:'selection'}) + pushChunkCmd(chunk) …
  → endStreamingCmd({diffReview:true}) 进入审阅
```

> 备选：不做 Host 侧模型调用，直接把"改写意图"作为 `session.prompt` 发给当前 Agent，让 Agent 用 `doc_propose` 返回结果——这样改写也走提议审阅，代价是"流式"消失（变成一次工具调用）。**若不想维护第二套模型调用路径，这是更省的选择。**

- 复用官方流式 + diff 全链路，成本极低；
- 必须接受"改写期间编辑器锁"（`filterTransaction` 拒绝用户输入），所以只用于**用户主动发起、范围明确、时长可控**的改写；
- 这是 S0（零协议 Copilot）的产品形态，也是 v1 里唯一需要锁编辑的地方。

> 结论：**默认协同路径不锁编辑**；锁只出现在"用户明确要求 AI 重写这一段"的短暂窗口里。这比"Agent 一动手就锁住整篇文档"的体验好一个数量级，也避开了 v1.5 自研不锁 flush 的工程量。

---

## 5. 协议设计

### 5.1 文档标识与块锚

```ts
// 自研 $prose：给顶层块分配并维持稳定 blockId（不参与 markdown 序列化）
const blockAnchorPlugin = $prose((ctx) => new Plugin({
  key: blockAnchorKey,
  appendTransaction(trs, oldState, newState) {
    if (!trs.some(t => t.docChanged)) return null
    const tr = newState.tr
    newState.doc.descendants((node, pos) => {
      if (node.isTextblock && node.attrs.blockId === '') tr.setNodeMarkup(pos, undefined, {...})
    })
    return tr.docChanged ? tr : null
  },
}))
```

- 承载属性：用 `$nodeSchema(...).extendSchema(handler)` 给 `paragraph/heading/list_item/blockquote/table` 加 `blockId`（`attrs.blockId = {default:'', validate:'string'}`）。
- 不落盘：`toMarkdown` 不输出（照 `heading.id` 的做法），`parseMarkdown` 读时不带 → 每次打开重新分配，稳定于"本次会话"。
- 兜底寻址：Agent 侧仍是 Markdown 视角，所以工具接受三种 selector，Host 端用 remark 与客户端**同构解析**：

| selector | 形式 | 适用 |
|---|---|---|
| `heading` | `{ headingText, ordinal? }` | 整节替换/追加（最稳） |
| `text` | `{ oldText, occurrence? }` | 段落内小改（类似 Claude Code Edit） |
| `block` | `{ blockId }` | 同会话内 Agent 已 `doc_read` 过的块 |

### 5.2 工具清单

| 工具 | 参数 | 行为 | 审批 |
|---|---|---|---|
| `doc_open` | `path` | 返回 `{ version, title, outline[], blockCount }`；发事件让面板打开 | 否 |
| `doc_outline` | `path` | 只返回标题树（省 token） | 否 |
| `doc_read` | `path`、`selector?`、`mode: outline\|section\|blocks\|full` | 返回结构化 markdown + `version` + `blockIds` | 否 |
| `doc_propose` | `path`、`baseVersion`、`ops[]`、`rationale` | **不写文件**，返回 `proposalId` 并推送客户端进入审阅 | 否 |
| `doc_patch` | `path`、`baseVersion`、`ops[]` | 写文件（CAS）；冲突返回 `CONFLICT` + 当前版本 | **是**（文档脏 / 跨节大改 / 删除时） |
| `doc_focus` | `path`、`selector` | 客户端滚动+高亮，"我在这里" | 否 |
| `doc_comment` | `path`、`selector`、`body` | 挂一条评论装饰（v1.5） | 否 |

`ops` 的形态：

```jsonc
{ "op": "replace_block", "blockId": "b7", "markdown": "## 新标题\n\n正文…" }
{ "op": "insert_after",  "anchor": { "headingText": "背景" }, "markdown": "…" }
{ "op": "delete_block",  "blockId": "b7" }
{ "op": "replace_text",  "blockId": "b7", "oldText": "旧句", "newText": "新句" }
{ "op": "append_section","headingText": "附录", "markdown": "…" }
```

**为什么默认是 `doc_propose` 而不是 `doc_patch`**：提议不动文件、不锁编辑器、可并存多条，人按需接受；直改只留给人明确下令（"你直接改"）或配置开关。这也把"审批"从工具层降到了 UI 层，体验更顺。

### 5.3 版本与冲突

```
Host 读 stat.version → 工具参数 baseVersion
写时 writeText(target, md, {kind:'replaceIfVersion', version})
  ├─ 成功 → 返回 { version: newVersion, appliedBlocks: [...] }
  └─ FS_STALE_VERSION → 返回 { conflict: true, currentVersion, diffSummary }
```

Agent 收到冲突的标准动作：`doc_read` 重读 → 重新定位 → 重试（一次）。工具描述里写清这条，避免模型瞎猜。
人在编辑器侧的并发保护在 4.3② 已覆盖：**脏比不干净**，宁可转审阅也不覆盖。

### 5.4 客户端应用补丁

```ts
// 单事务应用，保留选区、作为一个 undo 组
function applyOps(view: EditorView, ops: Op[]) {
  const tr = view.state.tr
  tr.setMeta('addToHistory', true)
  tr.setMeta('agentPatch', { batchId })      // 便于"撤销这次 Agent 操作"
  for (const op of resolve(ops, view.state.doc)) { /* replace/insert/delete */ }
  view.dispatch(tr.scrollIntoView())
}
```

- 审阅态用官方命令：`startDiffReviewFromDocCmd(targetDoc)` → 人点 accept/reject → `acceptDiffChunkCmd/rejectDiffChunkCmd/acceptAllDiffsCmd`。
- 选区改写（路线 B）用官方命令：`startStreamingCmd({insertAt:'selection'})` → `pushChunkCmd(chunk)` → `endStreamingCmd({diffReview:true})`；取消 `abortStreamingCmd({keep:false})`。
- 两种态都要在 UI 上明显可见（边框 + 状态条），因为编辑器此时**拒绝输入**，用户必须知道原因。

### 5.5 插件自有接口（客户端 ↔ Host）

路由统一挂在 `ctx.webServer.register({ kind:'prefix', path:'/dsh-coedit' })`，默认鉴权（页面 cookie）：

| 方法 / 路径 | 请求 | 响应 | 用途 |
|---|---|---|---|
| `POST /dsh-coedit/save` | `{ path, baseVersion, markdown }` | `{ ok, version }` / `{ conflict, currentVersion }` | 人保存（版本 CAS） |
| `GET /dsh-coedit/state?path=` | — | `{ version, mtime, sessionId, openBy }` | 轮询降级路径 |
| `GET /dsh-coedit/events?path=` | SSE | `change` / `proposal` / `presence` 帧 | 实时推送（推荐） |
| `POST /dsh-coedit/presence` | `{ path, blockId, dirty, reviewing }` | `204` | 供 `docPresence` 投影 |
| `POST /dsh-coedit/proposal` | `{ proposalId, decision, blockIds }` | `{ ok }` | 人接受/拒绝提议，回写会话 |

事件帧示例（SSE `event:`/`data:`）：

```
event: change
data: {"path":"notes/x.md","version":"v13","source":"agent","blocks":["b7","b12"]}

event: proposal
data: {"proposalId":"p-42","path":"notes/x.md","rationale":"补一段风险说明","blocks":["b9"]}

event: presence
data: {"agent":"active","blockId":"b7","label":"改写第 3 节"}
```

改动落点很小：Host 一个 `Map<path, Set<res>>` 维护订阅者；客户端 `EventSource('/dsh-coedit/events?path=…')`。若 SSE 在目标环境不可用，退化为 1.5 s 轮询 `/state`（协议不变）。

---

## 6. UI / UX

### 6.1 面板布局

```
┌ main: doc-editor ─────────────────────────────────────────────┐
│ [文件 ▾] notes/x.md   v12 · 已保存        [直改|建议] · Agent● │  ← 工具条
├───────────────┬───────────────────────────────┬───────────────┤
│ 大纲(可选)     │  Milkdown 编辑器               │ 审阅队列 (n)   │
│ §1 背景        │  ┌─────────────────────────┐  │ ▸ 第 3 节改写  │
│ §2 方案   ←    │  │ …正文…                  │  │   [接受][拒绝] │
│ §3 风险        │  │ ▍Agent 正在写这里        │  │ ▸ 补一段示例   │
│                │  └─────────────────────────┘  │               │
└───────────────┴───────────────────────────────┴───────────────┘
```

- 入口：`sidebar.panellist` 图标；`main` 的 key = `doc-editor`；离开面板不销毁编辑器实例（保留未保存态）。
- 状态条永远显示三件事：**文件版本 / 保存态 / Agent 态**（空闲·读取·生成·等待确认）。

### 6.2 Agent 存在的可见化

| 信号 | 实现 | 说明 |
|---|---|---|
| Agent 光标/选区 | PM `Decoration.widget` + 自研 `$prose`，标签 = Agent 名 + 颜色 | 参考 `yCursorPlugin` 的思路，但不引入 Yjs |
| 正在落地的块 | 左侧 2px 竖条 + 块底微光 | 由"落地中"状态驱动（路线 A 的动画窗口 / 路线 B 的 streaming 窗口） |
| 提议块 | 复用 diff 的 `milkdown-diff-added/removed` 类，重写成 DSH 主题色 | 不重写 diff 逻辑 |
| 全局悬浮 | `shell.overlay` 小卡："Agent 正在改 §3 · 停止" | 面板不可见时也能感知 |

### 6.3 与对话的联动

- 编辑器有选区 → `conversation.composer.dock` 出现 chip：「把选中内容交给 Agent」。点击把选区 markdown + `blockId` 作为上下文片段投进输入框。
- Agent 的工具调用在会话里显示为卡片（`tool/call` 已有渲染通道）："将改写 §3（3 块）" + 「在编辑器中查看」→ 跳到块并高亮。
- 反向：`conversation.session.header.actions` 提供「在编辑器中打开当前文档」。

### 6.4 交互细节（容易被忽略但决定手感）

- **Esc 取消生成**，`Mod+Enter` 接受全部，`Mod+Shift+Backspace` 撤销上次 Agent 批量。
- 审阅态必须有"为什么"：每个提议块上方显示 Agent 的一句话理由（`rationale`）。
- 落地呈现中显示"正在应用第 N/M 块"，按**真实块数**推进，不伪造字数进度。
- 保存失败/冲突用 toast（`workspace.toast`），不要弹模态打断。

### 6.5 主题与可访问性

- 只引用 `--dsw-alias-*`；Markdown 排版（标题层级、行高、代码块）用自有前缀类。
- 深浅色两套都要看（宿主切主题即可验证）。
- 生成/审阅状态必须有 `aria-live` 通告，不能只靠颜色。
- 快捷键不与宿主冲突（`Mod+Enter` 在 diff actions 里已是"接受全部"，保持一致性）。

---

## 7. 里程碑

| 里程碑 | 内容 | DoD（验收） | 估时 |
|---|---|---|---|
| **M0 Spike** | `main` 面板跑起 kit 编辑器；读/写 workspace 一个 `.md`；插件路由鉴权打通；主题适配 | 面板里能编辑并落盘；刷新后内容一致；深浅色正常；gzip 体积 < 250 KB | 2–3 d |
| **M1 单写者直改** | 块锚 + `doc_open/outline/read/patch` + CAS + `workspaceFiles.changes` 同步 + undo 分组 | Agent 能"把 §2 第 2 段改成…"并成功落盘；人改后 Agent 冲突能重试成功；人撤销能回滚 | 5 d |
| **M2 提议审阅** | `doc_propose` + diff review + 审阅队列 + 逐块 accept/reject + rationale | Agent 提议 3 块，人只接受 1 块，其余不影响文档；冲突时转审阅不覆盖 | 5 d |
| **M3 生成观感** | 路线 A：装饰层打字机 + 单事务提交；路线 B：选区改写走官方 streaming + 转审阅 | A：Agent 落地时目标块有渐进呈现、期间人仍能编辑别处、一次撤销可回退；B：选中一段重写可 Esc 取消并能逐块审阅 | 3 d |
| **M4 打磨** | presence、composer chip、会话卡片跳转、i18n、错误态、大文档性能、快捷键 | 10k 字文档编辑不卡；断线/冲突/失败都有明确反馈；中英文完整 | 5 d |
| **M5（可选）实时同写** | Yjs peer + Agent 光标 + 序列化回写 | 两人 + Agent 同时编辑 5 分钟无丢失、能合并回 markdown | 3–4 w |

验收方式：M0–M4 每个里程碑都在真实 DSH 页面里点一遍（浅/深色各一遍），并附一段"Agent 改文档"的录屏或截图；不接受"代码写了就算完"。

### 7.1 M0 快跑清单（按顺序做，每步失败都有退路）

| # | 动作 | 通过标准 | 失败退路 |
|---|---|---|---|
| 1 | 建 bundle 骨架（`package.json` + `cordis.patch.yml` + `index.js` + `client.js`），用 `plugin_manager install_bundle` 装进当前 profile | 设置页能看到插件条目 | 手写 `__ModuleLoader__` 包装不成立 → 检查 `id` 是否等于包名 |
| 2 | `client.js` 注册 `main` 面板渲染一行字，`sidebar.panellist` 加图标 | 点图标能切到面板 | `key` 未透传 → 改用 props 里的 `sessionId` 或全局 store 读 panel id |
| 3 | 面板内 `useRef` + `useEffect` mount `Editor.make().use(commonmark).use(history).use(listener)` | 能输入、能撤销 | CSS 缺失 → 手动引入 `@milkdown/kit/prose/view/style/prosemirror.css` 与基础排版样式 |
| 4 | Host 注册 `POST /dsh-coedit/save`，面板启动时 `fetch` 一次 | 返回 200（不是 401/503） | 401 → 改用 `connection.rpc.handle('/dsh-coedit')` 通道；503 → 说明该部署没有 peer 认证，需 `auth: 'anonymous'` + 自己的来源校验 |
| 5 | 保存回环：监听 markdownUpdated → 600 ms 防抖 → save → 重新 `read` 校验 | 写盘内容与编辑器一致；round-trip 无损 | 有格式漂移 → 记录差异样本，决定"只读原子块"或换 serializer 配置 |
| 6 | 深色模式 + gzip 体积 | 深色下无写死颜色；gzip < 250 KB | 超限 → 关掉 gfm 之外的扩展，或把编辑器改为面板首次可见时动态 `import()` |

前置能力：熟悉 ProseMirror 事务与 Decoration（M1–M3 的核心难点都在这里）+ 一次 DSH client 插件从零到跑通的经历（M0 的验证清单本质是这件事）。若只有前者没有后者，把 M0 加到 4–5 天。

总计：M0–M4 约 **4–5 周**（单人全职）；S0 可压缩到 1 天出 demo，但不要把它当成产品形态——它没有工具、没有块锚，Agent 的能力被浪费掉大半。

---

## 8. 风险与未验证项

| # | 风险 | 等级 | 缓解 |
|---|---|---|---|
| 1 | **streaming/diff 锁编辑**与"协同"预期不符 | 高 | 默认路径不锁（§4.5 路线 A：装饰层 + 单事务）；锁只用于"选区改写"；真要"边写边改"上 v2 Yjs |
| 2 | **Markdown 往返丢失**（外来文件、非 GFM 语法、间距） | 高 | 统一 serializer；未识别结构设为只读原子块；保存前跑 round-trip 断言 |
| 3 | **无块 ID 时的定位漂移**（人改了标题文本） | 中 | selector 组合（heading+text 双匹配）；失败即返回 `NEED_REREAD`，不猜 |
| 4 | **脏覆盖**：Host 写文件时人正在打字 | 中 | 版本 CAS + "脏则不覆盖转审阅"（4.3②） |
| 5 | 大文档性能（序列化 + diff + 轮询） | 中 | 只算变化块；diff 有 `LCS_MAX_CHILDREN=500` 上限；轮询退化为 1.5 s 并只在可见面板启用 |
| 6 | 客户端 bundle 体积 | 低 | 选 kit（150 KB gzip）；按需加载编辑器（面板首次可见时才 `import()`） |
| 7 | slot props / `useSessions()` 字段名未验证 | 中 | M0 首日验证，必要时退回 `ctx.uiWorkspace` |
| 8 | 插件路由在生产鉴权下被拒 | 中 | M0 验证 cookie 是否随 fetch 发送；否则改用 `connection.rpc.handle('/dsh-coedit')` 通道 |
| 9 | DSH 版本耦合（`0.2.2-rc.5` 预发布） | 中 | `engines.dsh` 写 `^0.2.2-rc.5`；锁定内部 API 面（§2 全部为公开 service） |
| 10 | 与宿主 Composer 的 Lexical 双编辑器焦点/快捷键冲突 | 低 | 面板内拦截 `Mod+K` 等；不在全局注册 keydown |
| 11 | Yjs 与 streaming/diff 叠加时事务被丢弃 | 中 | v2 时禁用 streaming/diff，只用 collab + 自研装饰 |
| 12 | Agent 产出超长/恶意 Markdown | 低 | HTML 转义 + 链接消毒已内建；再加单块大小上限 |
| 13 | 构建漏标 external 导致打入第二份 React | 高（一次性致命） | 构建脚本断言产物里不含 `react-dom` 实现；M0 清单第 2 步就验证 hooks 不报错 |
| 14 | 文档状态误入 React state | 中 | code review 铁律（§2.5 硬规则③）；把编辑器实例封装成 `useEditorRef()`，不暴露 setState |

**未验证清单（M0 必须逐条打勾）**：① 插件路由的 cookie 鉴权；② 主页面 CSP；③ `main` 槽 props 契约与当前会话来源；④ 编辑器在 slot 内挂载/卸载的内存与焦点行为；⑤ `workspaceFiles.changes` 的粒度与去抖；⑥ `useProjection` 在 root 槽是否可用（否则 presence 走轮询）；⑦ `ctx.llm` 的流式调用签名与"当前会话模型选择"的读取方式（决定路线 B 是否直连模型）；⑧ 面板内 `Esc`/`Mod+Enter` 与宿主 `shortcuts` 的实测冲突（用 `conflicts` 列表核对）。

---

## 9. 备选方案对比

| 维度 | **Milkdown**（推荐） | TipTap | Lexical | CodeMirror 6 |
|---|---|---|---|---|
| Markdown 保真（往返） | ✅ 一等公民（remark 双向） | ⚠️ markdown 扩展新、边界多 | ⚠️ 需自建 import/export | ⚠️ 文本层保真，WYSIWYG 需自建 |
| 流式写入 | ✅ 官方插件 | 自研 | 自研 | 自研 |
| 逐块 diff 审阅 | ✅ 官方插件 + 组件 | 自研 | 自研 | 自研 |
| 实时协同 | ✅ y-prosemirror | ✅ y-prosemirror | ⚠️ yjs 绑定较弱 | ✅ y-codemirror |
| 体积（本需求子集） | 486 KB / 150 gzip | ≈ 同级 | 更小 | 更小 |
| 与 DSH 已有技术栈 | 无重叠 | 无重叠 | 宿主 Composer 已用（但不可复用实例） | 无重叠 |
| 主要代价 | ProseMirror 心智负担 | 无官方 AI 层，全自研 | 生态偏 React-only | 不是 WYSIWYG |

结论：**要"Markdown 文件 + 流式 + 审阅"，没有第二个能省掉两块官方插件的选择**。Lexical 虽与宿主同源，但宿主那份是 devDependency 内联、不可复用，选它等于从零写 diff/审阅。

---

## 10. 决策记录（ADR 摘要）

| ID | 决策 | 理由 | 反悔成本 |
|---|---|---|---|
| ADR-1 | 底座用 `@milkdown/kit` 而非 Crepe | 体积 150 vs 904 KB gzip；AI 调色板交互不同源；Crepe 的 dark 是独立样式表、不跟 `body[data-ds-dark-theme]` | 中（UI 层重写） |
| ADR-2 | 文件是唯一真相源，编辑器无第二份权威 | 与 DSH `ctx.fs`/沙箱/审批一致；可被其它工具与 Agent 直接读写 | 高 |
| ADR-3 | v1 不做 CRDT | 需求可被"单写者轮换 + 提议"覆盖；CRDT 的运维/回写成本远高于收益 | 低（v2 可加） |
| ADR-4 | 默认 `doc_propose`、直改需显式授权 | 人的可控性优先；审阅 UI 复用官方 diff | 低 |
| ADR-5 | 传输走插件自有 HTTP 路由 + 已生成 Remote，不用 codegen | 本地 bundle 拿不到新的 `@Remote` 类型投影 | 中 |
| ADR-6 | 块锚用运行期 `blockId`（不落盘） | 不污染 Markdown；与外部编辑解耦 | 低 |
| ADR-7 | 默认"打字机动画 + 单事务"，官方 streaming 只用于选区改写 | 工具不支持流式；装饰层观感相同且不锁编辑 | 低 |

---

## 11. 证据索引

**Milkdown（源码 `/tmp/milkdown-src`，版本 7.23.0）**

- 流式命令：`packages/plugins/plugin-streaming/src/streaming-commands.ts:21-84`（start，含 selection/cursor 语义）、`:123-175`（end→diff review）
- 流式锁：`plugin-streaming/src/streaming-plugin.ts:75-90`（`filterTransaction` 丢弃 `docChanged`）
- flush 算法（逐块 diff）：`plugin-streaming/src/flush.ts:19-46`；插入策略 `:56-78`
- diff 锁：`plugin-diff/src/diff-plugin.ts:130-139`
- diff 计算：`plugin-diff/src/diff-compute.ts:22-32`（range/ignoreAttrs、`LCS_MAX_CHILDREN=500`）
- AI 契约：`crepe/src/feature/ai/types.ts:12-31`（`AIProvider`）、`commands.ts:191-264`（`runAICmd` 编排）、`toolbar/config.ts:180-196`（无 provider 则不显示 AI 按钮）
- 协同：`plugin-collab/src/collab-service.ts:60-140`（`bindDoc/setAwareness/connect`、`yCursorPlugin`）
- schema 扩展：`packages/utils/src/composable/composed/$node-schema.ts:23,58`
- 安全：`preset-commonmark/src/node/html.ts:20-30`、`mark/link.ts:43-45`
- 文档：`https://milkdown.dev/docs/guide/ai-feature`、`/docs/api/plugin-streaming`、`/docs/api/plugin-diff`、`/docs/guide/collaborative-editing`、`/docs/guide/interacting-with-editor`

**DSH（`/mnt/disk_01/codes/deepseek-harness`，0.2.2-rc.5）**

- 工具契约：`packages/core/tools/src/contracts.ts:27-125`；`schema.ts:494-540`（`DefineToolOptions`）、`:555`（`defineTool`）
- 会话事件：`packages/core/agent/src/runtime-types.ts:155-184`（`AssistantStreamFrame`）、`:213-271`（`inject/followup/steer/cancel`）
- fs：`packages/fs/fs/src/types.ts`（`FsWriteIntent`、`watch`）
- 路由：`packages/host/webserver/src/index.ts:117-160`（`register/registerUpgrade/tapIndex`）、`:780-796`（`authPolicy/authorize`）
- 鉴权：`packages/host/authentication-token/src/index.ts:35-43`（cookie）
- 客户端插件：`packages/util/package-manifest/src/types.ts:86-96`；`packages/client/modules/src/client/manifest.ts:10-23`
- 插槽：`packages/client/ui-layout/src/client/index.ts:75-114`；`ui-sidebar/src/client/contract/slots.ts:53`
- 会话 props / 投影：`packages/client/ui-session/src/client/index.ts:141-172`；`api/session-controller/src/client/sessions/projection-store.ts:38-46`
- 编辑器先例：`packages/client/ui-conversation/src/client/input/editor/runtime.ts`
- 本工作区可运行先例：`@local/dsh-space` 的 `index.js`（`webServer.register` 路由）+ `client-src/index.jsx`（同源 fetch）
