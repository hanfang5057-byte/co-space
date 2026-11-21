# DSH Space UI 设计

> 配套方案：[PLAN.md](PLAN.md) · 版本：v1.0 · 目标：让“空间/页面/同步/邀请”在没有命令行的情况下可完整验证。

---

## 0. 结论

- UI 是 **DSH Web/Desktop 内的一等页面**，不是 iframe 页面、不是独立站点。
- 入口：DSH 侧边栏新增 `Spaces` 图标；点击打开 `main` slot 的 `spaces` 页面。
- 首期（M1）就交付**最小可用 UI**：空间列表、创建空间、页面树、三类内容创建、预览、同步状态、邀请。
- M3 再补完整编辑、冲突解决、搜索、评论、模板库与“Chat about this”。
- 视觉只使用 DSH theme tokens（`--dsw-alias-*`），不引入自有色板；文档预览内容可以有自己的排版样式，但外壳必须跟随宿主。

---

## 1. 信息架构

```text
DSH 侧边栏
└── Spaces（sidebar.panellist，icon）
      └── main: spaces
            ├── Spaces Home
            │     ├── All / My spaces / Shared / Recent
            │     ├── 搜索
            │     └── New space
            └── Space Detail
                  ├── Space Home（可选 README/首个页面）
                  ├── Pages 树（页面 + 子页面）
                  ├── Sheets
                  ├── Assets / Files
                  ├── Members / Invite
                  ├── Sync status
                  └── Conflicts
```

页面内部用视图状态切换，不引入路由库：

```ts
type View =
  | { kind: 'home' }
  | { kind: 'space'; spaceId: string; node?: string }
```

---

## 2. 入口与页面骨架

### 2.1 侧边栏入口

- 注册 `sidebar.panellist`：
  - `id: 'spaces'`
  - `order: 20`（Automation tasks 之后、Settings 之前；以实际宿主顺序微调）
  - `label: () => t('panel')`
  - 图标：24×24 线性图标，使用 `currentColor`；激活态由宿主负责。
- 可选 `sidebar.panellist.trailing`：显示冲突数/待批准设备数的小徽标；没有异常时不显示。
- 点击后由宿主打开 `main` key `spaces`。

### 2.2 主页面骨架

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Spaces                                             [+ New space]   │
│  [All] [My spaces] [Shared] [Recent]                 [Search…]      │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ● Q3 复盘          4 pages · 2 sheets · 1 deck    Synced      │  │
│  │   2 members · updated 2m ago                       [⋯]        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ● 产品设计         12 pages · 3 decks            Offline      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

- 内容最大宽度 960–1120px，左右 `clamp(24px, 4vw, 48px)`，与 Automation/Plugins 页面一致。
- 标题区使用宿主页面模式：`h1` + 右侧主操作；顶部留出桌面窗口安全区。
- 列表为空时显示 EmptyState，不显示空白页。

---

## 3. 页面清单与交互

### 3.1 Spaces Home

**目标**：一眼看到所有空间、同步是否正常、最近活动。

**结构**

- Header：标题 `Spaces`，右侧 `+ New space`。
- Tabs：All / My spaces / Shared / Recent。
  - `My spaces`：`.space.json.createdBy === 本机 deviceId`。
  - `Shared`：他人创建、本机加入的空间。
  - `Recent`：本机最近打开（localStorage/本地设置，不跨设备）。
- 搜索：按空间名过滤；有结果为空时显示“没有匹配的空间”。
- 列表行：
  - 左侧状态点：绿色 synced、蓝色 syncing、黄色 needs attention（冲突/待批准）、灰色 offline。
  - 空间名（主文本），描述（次要文本，最多一行）。
  - 元信息：`N pages · N sheets · N decks`，成员数，最近更新时间。
  - 右侧：同步状态文字徽标；hover 显示 `⋯`（Rename / Delete）。
- 行点击：进入 Space Detail；键盘 Enter 同效。

**状态**

| 状态 | 表现 |
|---|---|
| loading | 骨架行（3–5 行），不显示空态 |
| empty | 插画 + “创建第一个空间” + `[Create space] [Join with invite]` |
| error | 行内错误条 + `[Retry]`；保留已缓存列表 |
| daemon 未就绪 | 顶部提示条：“同步引擎准备中…”/“需要下载 Syncthing” + 进度/重试 |
| 有冲突 | 行内黄色徽标 “Needs attention”，点击进入空间冲突视图 |

### 3.2 New Space Dialog

```text
New space
Name        [__________________________]
Description [__________________________]
            [Cancel]            [Create]
```

- 名称必填，1–80 字符；重复名称允许（ID 有后缀），但 UI 提示同名空间。
- 创建后直接进入新空间；首次创建可显示“正在初始化同步…”的过渡态。
- `Personal` 空间由首次启动自动创建，不弹此对话框。

### 3.3 Space Detail

```text
┌ Spaces / Q3 复盘 ─────────────────────────────── ● Synced  [Invite] [⋯] ┐
│ ┌ Pages ─────────────┐ ┌ Page ─────────────────────────────────────┐  │
│ │ ▾ Project overview │ │ Project overview                  [Edit]  │  │
│ │   • Meeting notes  │ │ # Project overview                       │  │
│ │   • Research       │ │                                          │  │
│ │ ▸ Launch plan      │ │ ...rendered markdown...                  │  │
│ │ ─ Sheets (2)       │ │                                          │  │
│ │   • budget.csv     │ │                                          │  │
│ │ ─ Files (3)         │ │                                          │  │
│ └────────────────────┘ └──────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

- 顶部：返回 Spaces、空间名、同步徽标、`Invite`、`⋯`（Rename / Delete / Rescan）。
- 左侧树 240–280px：
  - `Pages`：按目录层级展示；父页面可展开；当前页高亮。
  - `Sheets`、`Assets`、`Files` 分组；可折叠。
  - 右键/`⋯`：New subpage / New sheet / Rename / Delete。
- 主区：当前节点内容。
- 窄屏（<900px）：左侧树变为可收起的抽屉；主区全宽。

**状态**

- 空间不存在/被删除：空态 + 返回列表。
- 同步中：顶部细进度条或徽标 “Syncing…”，不阻塞阅读。
- 冲突：主区顶部黄色横幅 “1 个文件有冲突” + `[Review]`。
- daemon offline：横幅提示 + `[Retry]`；仍可浏览本地文件（只读缓存）。

### 3.4 Page View / Editor

```text
[← Q3 复盘]  pages/project-overview.md        [Preview | Edit]  [Chat about this]  [⋯]
───────────────────────────────────────────────────────────────────────────────
# Project overview

...
```

- **Preview**：服务端渲染的 Markdown HTML（已 sanitize），使用 `.space-prose` 样式；标题层级、表格、代码、任务列表与宿主一致。
- **Edit**（M3a 已实现）：
  - CodeMirror 6 Markdown 编辑器，支持语法高亮、撤销、搜索、Tab 缩进、行内主题 tokens。
  - 保存/取消 + 未保存提示；保存带 `expectedSha256`。
- 顶部显示相对路径，点击可复制。
- `Chat about this`：创建一个带 `space_context` + 当前页面内容的 DSH 会话；按钮在 Preview 和 Edit 都可用。
- 页面不存在：EmptyState “页面不存在，可能已被移动/删除” + 返回树。

### 3.5 Sheet View

- 简单表格：首行为表头，固定表头，斑马纹可选；每页 200 行，底部 “Load more”。
- 列宽按内容估算，最大 320px；长文本截断 + Tooltip。
- 单元格只读（M1）；M3 支持双击编辑、公式文本编辑（不计算）。
- 空表：显示列头 + “Add row”。
- 大表：显示 `Showing 1–200 of N`；不做虚拟滚动（M3 再评估）。

### 3.6 Deck View

- 顶部：幻灯片缩略图横向/左侧列表；当前页预览。
- 预览：Marp 渲染的 HTML/CSS，放在**内容级 sandbox iframe**中（见 5.3）；下方显示演讲者备注（只读）。
- 工具栏：上一页/下一页、页码、`Chat about this`、`Edit`（M3）。
- 空 deck：显示“还没有幻灯片” + `Add slide`（M3）。

### 3.7 Invite / Members

```text
Invite to “Q3 复盘”
──────────────────────────────────────────────
1. Ask them to install DSH Space.
2. Send this invite:

   dshspace:v1:eyJ...
   [Copy invite]

Your device ID:
   T4OMJAU-...-M3HJOQX   [Copy]

Pending approval
   • 3P66C5V-...  [Approve] [Ignore]

Note: joining gives read/write access to every file in this space.
```

- 入口：Space Detail 顶部 `Invite`。
- 复制成功 toast：“Invite copied”；失败显示可手动选择文本。
- Pending 列表来自 `space_members`；`Approve` 调 `space_approve_member`。
- 成员列表：设备别名 + 设备 ID 缩写 + 连接状态；`Remove` 需确认，提示“不会删除对方已有文件”。
- 不做 View/Comment/Edit 角色选择，只显示“可读写”说明。

### 3.8 Conflict Review

```text
Conflict: pages/report.md
──────────────────────────────────────────────
[This device]  [MacBook]  [Base]
──────────────────────────────────────────────
(选择一侧后预览内容)

[Keep this device] [Keep MacBook] [Try merge] [Open both]
```

- 空间顶部横幅 + 行内标记；`file_conflicts` 数据。
- `Try merge`：调 `file_resolve_conflict merge`；自动合并成功则写入并提示；有冲突块则打开合并结果（带 `<<<<<<<`）让用户/Agent 处理。
- 合并结果编辑：M3 提供简单文本编辑器；M1 可只显示“需要 Agent 协助”，并提供 `Chat about this`。

### 3.9 Sync Status Popover

点击顶部同步徽标：

```text
Synced · 2 peers
──────────────────────────
MacBook       Connected · 100%
Office-PC     Connected · 100%
Need: 0 files
[Rescan] [Daemon status]
```

- 数据来自 `space_sync_status`。
- 有 pending 文件时显示 `Syncing… N files`；失败显示错误与重试。
- `Daemon status` 打开小面板：版本、端口、uptime、`Restart`。

### 3.10 Empty / Error / First-run

| 场景 | UI |
|---|---|
| 首次安装 | Spaces 页面显示欢迎 + “创建空间”；M1 不自动创建 Personal，避免隐式写数据 |
| daemon 二进制缺失 | 顶部条：“需要下载 Syncthing（约 15MB）” + `[Download]`；下载中显示进度；失败给手动路径说明 |
| daemon 崩溃 | 顶部条：“同步已停止” + `[Restart]`；本地文件仍可读 |
| 空间无页面 | 树中 Pages 空态 + “New page” |
| 网络离线 | 同步徽标 “Offline”；本地编辑仍可用；恢复后自动同步 |
| 冲突 | 黄色横幅 + 列表标记；不阻塞其他页面 |

---

## 4. 视觉规范

### 4.1 Tokens

只使用以下 DSH tokens（通过 `var(--dsw-alias-*)`）：

| 用途 | Token |
|---|---|
| 页面/卡片背景 | `--dsw-alias-bg-base`、`--dsw-alias-bg-layer-1`、`--dsw-alias-bg-layer-2` |
| 弹层 | `--dsw-alias-bg-overlay` |
| 边框 | `--dsw-alias-border-l1`、`--dsw-alias-border-l2` |
| 主/次文本 | `--dsw-alias-label-primary`、`--dsw-alias-label-secondary` |
| 品牌/强调 | `--dsw-alias-brand-primary` |
| 状态 | `--dsw-alias-state-success-primary`、`--dsw-alias-state-warn-primary`、`--dsw-alias-state-error-primary`、`--dsw-alias-state-idle-primary` |
| 侧边栏 | `--dsw-specific-sidebar-fill` |

- 不写死颜色；状态点/徽标用状态 token。
- 图标 `currentColor`；图片/插画可用自有色。
- 圆角 8–12px；卡片边框 1px `border-l1`；阴影仅在浮层使用，保持宿主密度。

### 4.2 排版与密度

- 字体继承宿主；正文 13–14px，行高 1.5–1.6。
- 页面标题 24–28px/600；区块标题 15–16px/600；元信息 12px，secondary。
- 间距 4/8/12/16/24/32；列表行高 56–64px；按钮高度 32–36px。
- 中文/英文都按宿主 locale；数字/时间用 `Intl`。

### 4.3 组件库与构建

**结论：React 18 + React Aria Components（headless）+ CodeMirror 6 + react-data-grid；不使用 Ant Design / MUI / Mantine 这类带样式的整套组件库。**

| 需求 | 选择 | License | 说明 |
|---|---|---|---|
| Dialog / Menu / Tabs / Tooltip / Tree / Table | `react-aria-components` 1.x | Apache-2.0 | 一套 headless、可访问的组件覆盖大部分页面需求；样式由我们用 CSS Modules + tokens 写 |
| Markdown/CSV 编辑器 | CodeMirror 6（M3a）/ react-data-grid 7 beta（M3b） | MIT | 当前已打包进 client.js；后续可拆按需 chunk |
| 图标 | 自绘 SVG（12–16 个） | — | 与 DSH 线性图标风格一致；如要加速可用 `lucide-react`（ISC），但需统一线宽/尺寸 |

**不推荐**

- **Ant Design / MUI / Mantine**：组件完整、开发快，但视觉语言与 DSH 差异大，tokens 映射困难，包体大；会出现“插件里长着另一个产品”的问题。
- **shadcn/ui + Tailwind**：复制组件很快，但需要引入 Tailwind 并把 shadcn 的 CSS 变量重映射到 `--dsw-alias-*`；对一个小型插件是额外构建与样式债。
- **`@deepseek-ai/dsh-client-ui-primitives`**：DSH 明确要求第三方插件不要 import Harness Client 包；它们会随版本变化。按钮/菜单/对话框/Tooltip 自建，交互参考宿主即可。
- **整套 UI 框架 + 自定义主题**：短期快，长期维护成本高；本插件页面数量有限，headless + 自有 CSS 更稳。

**构建方式**

- 源码放 `client-src/`（TSX/JSX）；构建产物 `client.js` 随 bundle 发布，DSH 不在安装时编译。
- 使用 esbuild/tsdown 输出 CJS，再包成 DSH 的懒工厂格式：

```js
window.__ModuleLoader__.load({
  id: '@local/dsh-space',
  factory(require) {
    const exports = {}
    // 打包后的 CJS 代码；react/react-dom/@tanstack/react-virtual 由宿主提供
    ;(function (module, exports, require) { /* bundle */ })({ exports }, exports, require)
    return exports
  },
})
```

- `react`、`react-dom`、`@tanstack/react-virtual` 标记为 external（宿主模块表已有）；React Aria 等第三方库打进 bundle。
- `dsh.client.external` 只列“宿主提供的非 baseline 模块”；打进 bundle 的库不要列，避免解析失败。
- 当前 CodeMirror/react-data-grid 已打包进 `client.js`（1.54MB / 374KB gzip）；后续可用 `require.async` 拆 chunk。
- 在 CI 记录 `client.js` 体积；超过预算（例如 500KB gzip 前）时再拆包。

### 4.4 图标

- 侧边栏入口：24×24 线性图标（空间/层叠方块）。
- 内容类型：Page / Slides / Sheet / Image / File，16×16。
- 状态：同步点、冲突三角、离线云、待批准人。
- 所有图标提供 `aria-label` 或可见文字，不只靠颜色。

---

## 5. 渲染与安全

### 5.1 Markdown

- 服务端 `markdown-it` 渲染 → `sanitize-html` → 客户端 `dangerouslySetInnerHTML` 到 `.space-prose`。
- `html: false`，禁止原始 HTML；链接只允许 `http(s)`/相对路径。
- 代码高亮可选；M1 用等宽字体，不做高亮。

### 5.2 CSV

- 服务端返回 `{columns, rows, total}`；客户端渲染 `<table>`。
- 单元格内容按文本渲染，不使用 `innerHTML`；公式只显示文本。
- 超过 200 行分页；不做公式计算。

### 5.3 Deck（Marp）

- 服务端 `marp-core` 渲染 `{html, css}`。
- 客户端用内容级 `iframe sandbox="" srcdoc=...` 展示，原因：Marp 的 SVG/foreignObject 与全局 CSS 可能与宿主冲突。
- iframe 内注入宿主 tokens 的解析值（`getComputedStyle(document.documentElement)`）作为 CSS 变量，保证深/浅色背景与文字可读。
- iframe 只承载幻灯片画布，不是插件页面；页面导航、工具栏、对话框仍在 React 中。
- 禁止 `allow-scripts`；不加载外部资源（图片走 Host 授权 URL 或 data URL）。

### 5.4 不使用 iframe 的场景

- Spaces Home、Space Detail、Page Preview、CSV、对话框、弹层：全部 React 组件，直接继承 theme tokens 与 locale。
- 不把整个插件页面塞进 iframe。

---

## 6. DSH 集成

### 6.1 Client 注册

```js
// client-src/index.tsx 结构示意；构建后包成 window.__ModuleLoader__.load({ factory(require) { ... } })
// React 由 require('react') 从宿主模块表取得；不要 import dsh-client-ui-primitives。
export const name = 'dsh-space-client'
export const inject = ['slots']

export function apply(ctx) {
  // M1 文案直接写在组件里；M3 再接 locale 资源。
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: 'spaces',
  }, SpacesPage))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: 'spaces',
    order: 20,
    label: () => 'Spaces',
  }, SpacesIcon))
}
```

- `SpacesPage` 是根页面组件，内部管理 `home/space` 视图与对话框。
- 可选 `sidebar.panellist.trailing` 显示冲突/待批准数量。
- 不 `require` 任何 `@deepseek-ai/dsh-client-ui-primitives`；按钮、对话框、菜单、Tooltip 自建，样式与交互参考宿主。
- 语言资源放 bundle `locale/zh.json`、`en.json`；M1 页面文案先中文，M3 接入 `ctx.locale`。

### 6.2 Host API（WebServer 路由）

页面只通过同一个 `POST /dsh-space-api` 取数据/发命令，不直接读磁盘；路由由 Host Plugin 在 `webServer` 上注册，默认 `required` 认证，浏览器带同源 Cookie。

请求体：`{ "method": "...", "args": { ... } }`；响应：`{ "ok": true, "result": ... }` 或 `{ "error": { code, message } }`。

| method | 作用 |
|---|---|
| `list` | 空间列表 + 统计 + 同步摘要 |
| `get` | 空间详情 + 成员 |
| `tree` | Page/Sheet/Asset 树 |
| `read` | Markdown HTML / Marp HTML+CSS / CSV rows |
| `editSheetCells` | 按行/列增量保存 CSV 单元格 |
| `conflictDetail` | 读取冲突的本机/对端/基线内容 |
| `rescan` | 触发 Syncthing 扫描 |
| `createSpace` | 创建空间 |
| `createDoc` / `createSlides` / `createSheet` | 创建 Page/Slides/Sheet |
| `write` / `edit` | 保存编辑 |
| `invite` / `members` / `approve` | 邀请/成员/批准 |
| `sync` / `waitSync` | 同步状态 |
| `conflicts` / `resolveConflict` | 冲突列表/解决 |
| `daemonStatus` / `daemonStart` / `daemonStop` | daemon 控制 |

- Host API 与 MCP Server 共用 `server/core`，避免两套业务逻辑。
- 客户端刷新：进入页面/空间时拉一次；写操作后刷新对应节点；M1 不做 watch/SSE。
- 错误用稳定 code + 中文文案；不显示原始堆栈。
- 不用 typert Remote：安装 bundle 的客户端与 Host 已通过同源 HTTP 打通，少一套代码生成依赖。

### 6.3 首次渲染与加载

- 先渲染页面骨架（标题、tabs、空列表），再拉数据；不出现全屏 spinner。
- daemon 准备/下载在后台进行；UI 只显示顶部状态条，不阻塞空间列表（本地空间可先读）。
- 所有列表有 skeleton；错误有重试；长操作有按钮 loading 态。

---

## 7. 可访问性与键盘

- 所有可点击行是 `button` 或带 `role="button"`/`tabIndex`；Enter/Space 打开。
- 页面树使用 `role="tree"`/`treeitem` 或等价的 `aria-expanded` 按钮；当前项 `aria-current="page"`。
- 对话框：焦点陷阱、Esc 关闭、关闭后焦点回到触发按钮；标题 `aria-labelledby`。
- 同步状态/冲突变化用 `aria-live="polite"` 通知，不打断输入。
- 颜色不作为唯一状态指示：同步徽标有文字，冲突有图标+文字。
- 对比度使用 tokens 保证；不自定义低对比色。
- 触控目标 ≥36px；窄屏下按钮不换行溢出。

---

## 8. 验证清单（UI 验收）

| # | 场景 | 期望 |
|---|---|---|
| 1 | 首次打开 Spaces | 自动有 Personal 空间或空态；无控制台错误 |
| 2 | 创建空间 | 列表出现；同步徽标从 syncing → synced；重启后仍在 |
| 3 | 创建 Page/Slides/Sheet | 树出现节点；预览正确；文件落盘到 `pages/`/`sheets/` |
| 4 | 编 Page（M1 文本域/M3 编辑器） | 保存后预览更新；sha 变化；Agent 可读到 |
| 5 | 邀请第二实例 | token 可复制；对方 join 后本机 pending；Approve 后成员出现 |
| 6 | 同步 | 对端文件出现；徽标/peer 完成度正确 |
| 7 | 冲突 | 横幅出现；Review 显示 local/remote/base；解决后冲突消失 |
| 8 | daemon 停止 | 顶部“同步已停止”；本地浏览仍可用；Restart 恢复 |
| 9 | 深色/浅色 | 文字、边框、状态色可读；Marp iframe 背景不刺眼 |
| 10 | 窄屏 720px | 树可收起；主区不横向滚动；按钮不溢出 |
| 11 | 卸载插件 | 侧边栏入口与页面消失；无残留监听 |
| 12 | 空/长名称/大量空间 | 省略、tooltip、分页/滚动正常 |

---

## 9. 交付分期

| 阶段 | UI 范围 |
|---|---|
| **M1（必须）** | 侧边栏入口、Spaces Home、New space、用邀请加入、Space Detail + Page 树、三类内容创建、Preview、Sync 徽标、Invite token 展示、基础错误/空态 |
| **M2（已实现）** | Page 编辑保存、CSV 单元格编辑、Marp 预览、冲突 Review、成员批准、同步状态 |
| **M3（完整）** | 模板库、树右键菜单、搜索、Recent/Trash、Chat about this、i18n 完整、可访问性打磨；CodeMirror/react-data-grid 已落地 |
| **M4** | 评论 UI、版本历史、页面链接、ODS 表格、主题扩展 |

> M1 的 UI 不是为了“好看”，而是为了让创建、预览、邀请、同步这些核心路径在真实浏览器中可验证；MCP 工具与 UI 共用同一套 Host core，避免两套实现。
