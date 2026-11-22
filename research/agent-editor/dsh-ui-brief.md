# Client / Web UI 扩展机制技术简报（DSH `0.2.2-rc.5`）

> 只读调研：`/mnt/disk_01/codes/deepseek-harness/`。未修改文件、未启用插件。

## 0. 结论速览

1. Client 插件 = 一个浏览器 CJS 闭包工厂：`window.__ModuleLoader__.load({id, factory})`，`id` 必须等于包名；工厂返回 `{ inject, apply(ctx) }`。
2. `dsh.client` **只有 4 个字段**：`platform` / `inject` / `immediately` / `external`。不存在 `style` 字段（样式走构建期 CSS 处理）。
3. React 及其余 10 个基线包由宿主 module table 共享，无 import map、无 CDN；跨插件 **value import 被构建期硬闸门拒绝**，协作必须走 Cordis service。
4. 插槽是声明合并的 `SlotMap`，共 **110 个已声明 key**（含 `main`/`shell.bottom`/`shell.overlay`/`sidebar.panellist`/`conversation.composer.dock`）；运行时清单用 `cordis_inspect` 的 client `Slots.listSubTree`。
5. DSH **已有 Lexical 富文本编辑器先例**（Composer 输入框，`lexical@0.49.0`，用 core 不用 lexical-react，且是 devDependency → 被内联进 bundle）。

## 1. Client 插件清单

字段语义（`packages/util/package-manifest/src/types.ts:86-96`）：

| 字段 | 类型 | 语义 | 证据 |
|---|---|---|---|
| `platform` | `string` | 客户端平台标识，Web 取 `web` | types.ts:88 |
| `inject` | `string[]?` | **仅声明式依赖**，用于 Cordis 组装与工厂到达顺序；**不是 Cordis 服务注入** | types.ts:89-90、manifest.ts:63-67 |
| `immediately` | `boolean?` | stage-one 预取标记：在 module-face boot 期即注册工厂（注册屏障） | manifest.ts:68-70、types.ts:91 |
| `external` | `string[]?` | 基线之外的精确 module-table 请求（含 `<pkg>/client` 子路径） | types.ts:92-96 |

入口形态（`templates/decoration/client.js:1-22`）——不是 ESM default export，而是全局加载器回调：

```js
window.__ModuleLoader__.load({
  id: '@local/my-decoration',      // 必须 = package.json name
  factory(require) {
    const React = require('react'); // 来自 module table
    return {
      inject: ['slots'],
      apply(ctx) { /* 注册插槽 */ },
    };
  },
});
```

## 2. 模块加载与打包

- **加载模型**：懒 CJS 表；执行 bundle 只*注册*工厂，materialize 在首次 import 时发生并记忆化（`packages/client/modules/src/client/manifest.ts:1-25`）。
- **共享依赖**（`packages/client/web/src/platform.ts:8-18`）：`react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`、`@deepseek-ai/cordis`、`zod`、`@tanstack/react-virtual`、`dsh-client-store`、`dsh-client-ui-slots`、`dsh-client-ui-primitives`、`dsh-client-ui-dockkit`。**不要 import `dsh-client-ui-primitives`**（practices.md:35）。
- **跨插件闸门**（`packages/client/tsdown.client.ts:1030-1045`）：非基线 `@deepseek-ai/*` value import 直接构建失败 → 只能靠 Cordis 服务协作。
- **样式**：构建期 lightningcss；`x.module.css` → 哈希类名；手写纯 JS 时用内联 `style` 或 React 内联 `<style>`（卸载即移除）。
- **HMR**：`pnpm run dev:web` = build:artifacts + 3 个 watch + `dsh web`；改写 `lib/client.js` 会触发页面重载。

## 3. 插槽系统

- 5 种 kind：`single` / `keyed` / `list`（可 `order`/`label`）/ `hoc` / `chain`。
- 注册到未声明槽 → 抛错；遮蔽按 `priority`，最低者渲染；disposer 递归折叠 child slot。
- 两步注册：`ctx.slots.inject(ownerKey, () => ctx.slots.register(...))`（`ui-renderer/src/client/registry.ts:233`）。

与文档协同相关的槽位：

| 槽位 | kind/scope | 用途 | 证据 |
|---|---|---|---|
| `main` | keyed / root | 中央面板，按 panel id 切换；保留键 `conversation` | `ui-layout/src/client/index.ts:75` |
| `sidebar.panellist` | list / root | 主面板图标行，`id` 必须等于目标 main key | `ui-sidebar/src/client/contract/slots.ts:53` |
| `shell.bottom` | single / root | 三列下方通栏底部面板 | `ui-layout/src/client/index.ts:95` |
| `shell.overlay` | list / root | 全帧浮层，默认可穿透点击 | `ui-layout/src/client/index.ts:106-114` |
| `conversation.composer.dock` | list / session | Composer 卡片下方 | `ui-conversation/src/client/contract/slots.ts:315` |
| `conversation.session.header.actions` | list / session | 会话头部动作 | ui-conversation contract |
| `settings.section` + `settings.section.icon` | list / root | 设置页 | ui-settings contract |
| `workspace.toast` | keyed / root | 通知 | `ui-workspace/src/client/contract/toast.ts:51` |

面板切换：`ctx.layout.selectPanel(MainPanelId | null)`（`ui-layout/src/client/service.ts:23-45`）。

## 4. 与 Agent 会话交互

标准 props（`ui-session/src/client/index.ts:141-172`）：`useSession`（selector hook over `SessionSnapshot`）、`sessionId`、`useProjection`、`useAccess(action)`；`GlobalStandardProps` 另有 `useSessions`/`useSessionRetainInfo`/`useSessionAccess`。

- 读 Host 计算值：`useProjection(key, selector?, eq?)`（`session-controller/src/client/sessions/projection-store.ts:38-45`）。Host 用 `ctx.sessionProjections.register({key, stateSchema, init, apply, stateVersion, wire:{viewSchema, view}})`，`view` 的 `Object.is` 不变即抑制下发。
- 流式：实时 token 读 `agent/assistant-stream`；持久节点等 `turn/end`/`assistant/message`/`tool/result`；不要 poll `agent/status`。
- 发消息 / 触发 Host action：`ctx.remote.commands.execute(sessionId, line, attachments)`；`ctx.remote.session.*`（`cancel`/`rename`…）；`ctx.uiWorkspace.startSession(workspaceId?, {prompt, whenDraftExists})`、`ctx.uiWorkspace.openSession(id)`。
- user-actions：一个操作只实现一次 Host service method，UI 与 Agent 工具共用；权限类动作只给用户。

## 5. 主题与组件

- token 前缀 `--dsw-alias-*`（`ui-theme/src/styles/design-platform.css:177+`）：`--dsw-alias-bg-base`、`--dsw-alias-bg-layer-1/2/3`、`--dsw-alias-border-l1..l4`、`--dsw-alias-label-*`、`--dsw-alias-brand-primary` 等。
- 用法：纯 CSS 变量；不要字面色；深色模式由主题层切换，插件无需自实现。
- 不要 import Harness 组件库：照 `src/*.tsx` 抄 markup/CSS/行为，类名改到自己的前缀。

## 6. 富文本编辑器集成先例

- `lexical@0.49.0` + `@lexical/{headless,utils,text,plain-text,history}`；位置 `packages/client/ui-conversation/src/client/input/editor/`（`runtime.ts` 479 行）。
- 形态：`createEditor()`（Lexical core）+ 自建 React 绑定；宿主是 contenteditable 组件，不是 React root。
- 这些包声明在 **devDependencies**，按 purity 规则**被内联进 client bundle** → 插件完全可以打进自己的编辑器库，但不能指望从 module table 拿到。

## 7. 权限与安全

- Client 插件拿不到 Node API；`require` 是 module table 同步查询。
- Host 能力只能走 RPC：`ctx.remote.*`，由 `useAccess(action)` 判定。
- 主页面 CSP 未验证；文档预览走严格 CSP 沙箱。
- 禁止替换 app root、禁止读别的插件 DOM/CSS 猜位置；所有 timer/listener/样式必须在 `apply` 内注册并返回清理。

## 8. 最小可运行示例

```jsonc
{
  "name": "@local/doc-collab",
  "type": "module",
  "exports": { ".": "./index.js", "./client": "./client.js",
               "./locale/*.json": "./locale/*.json", "./icon": "./icon.svg" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true,
                "inject": ["@deepseek-ai/dsh-client-ui-layout",
                           "@deepseek-ai/dsh-client-ui-session",
                           "@deepseek-ai/dsh-client-ui-conversation"] }
  }
}
```

```js
window.__ModuleLoader__.load({
  id: '@local/doc-collab',
  factory(require) {
    const React = require('react');
    const PANEL_ID = 'doc-collab';
    function EditorPanel(props) {
      const sessions = props.useSessions();
      return React.createElement('div', { style: { height: '100%' } });
    }
    return {
      inject: ['slots', 'locale', 'remote', 'uiWorkspace'],
      apply(ctx) {
        ctx.slots.inject('main', () => ctx.slots.register(
          { name: 'main', key: PANEL_ID, locale: 'doc-collab' }, EditorPanel));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 30,
            label: () => 'Document' }, () => null));
      },
    };
  },
});
```

## 未验证 / 风险点

1. `cordis_inspect` 的 client provider 全部超时（页面未连接）——槽位清单与 token 名来自源码声明。
2. `useSessions()` 快照精确字段名未逐行确认（诊断里写作 `sessions.current`）。
3. `ctx.slots.register` 在 `main`（keyed/root）的 props 契约：`key` 是否透传为 prop 未逐字确认。
4. 主页面 CSP 未验证。
5. 无 `immediately` 时的加载时机未测。
6. 第三方把 TSX 编译到 loader 格式的工具链未验证——最稳是手写 `__ModuleLoader__.load` 包装 + 自打包。
7. `dsh.client` 没有 `style` 字段。
8. Lexical 是宿主 devDependency（内联），**不是共享单例**。

## 推荐槽位与挂载方式

1. `main`（keyed，key = 面板 id）——主编辑区。
2. `sidebar.panellist`（list，`id` = main key）——入口。
3. `conversation.session.header.actions`——"在编辑器打开 / 让 Agent 改这段"。
4. `shell.overlay`——"Agent 正在编辑 X 区域"。
5. `conversation.composer.dock`——编辑上下文 chip。
6. `settings.section`——插件配置页。

挂载：面板组件内 `useRef` + `useEffect` mount/destroy 编辑器；编辑器库内联进 bundle；只引用 `--dsw-alias-*`；数据流 编辑内容 → Host → projection → `useProjection`。
