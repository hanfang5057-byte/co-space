# 19 · Web 样式与宿主主题契约

本文档是 CoSpace Web 界面的样式规范。它定义共享样式与宿主之间唯一的接口：一组 `--cospace-*` CSS 自定义属性。任何新宿主接入视觉（或既有宿主调整外观）都以本文为准。

适用：`packages/review-ui/`（共享界面）、`adapters/dsh/`（DSH 插件）、`apps/desktop/`（桌面端），以及未来的宿主适配器。

## 1. 目标与非目标

目标：

1. 共享界面只有一份样式；Desktop 与 DSH 不各自 fork CSS。
2. 宿主可以把 CoSpace 融进自己的配色、深浅色、字体与圆角，但**只通过 token**。
3. 宿主之间互不影响：DSH 的规则不可能命中 Desktop 的页面，也不可能命中 DSH 自己的其它插件。
4. 机制不依赖样式加载顺序，不需要 `!important` 参与宿主覆盖。
5. 契约可机器校验，文档与代码不会各说一套。

非目标：

- 不允许宿主改结构（布局、间距、显隐、DOM）。这类需求走共享代码评审，不在宿主侧绕行。
- 不提供组件替换或主题包（skin）机制；token 之外的可调项不存在。

## 2. 三个不变量

1. **单一命名空间**：只有 `--cospace-*` 是公开 token。共享组件不再有 `--space-*` 之类内部变量；样式里读到的颜色、字体、圆角全部来自公开 token。
2. **共享层不声明公开 token 的默认值以外的任何宿主内容**：默认值只出现在 `packages/review-ui/src/theme/base.css` 的一个 `:where(.cospace-theme)` 块里，且只允许这一处出现字面色值。共享组件 CSS 不出现 `#hex` / `rgb()` / 命名色。
3. **宿主规则只写 token、且必须落在 `.cospace-theme` 上**：宿主主题文件里只允许 `--cospace-*: value` 形式的声明，选择器必须包含 `.cospace-theme`。因此宿主既改不到 CoSpace 以外的东西，也改不了 CoSpace 的结构。

## 3. 根标记与 surface

每个渲染 `.space-*` 的根都带：

```html
<div class="cospace-theme space-app" data-cospace-surface="page">
```

| 值 | 位置 | 说明 |
|---|---|---|
| `page` | 左侧主面板（`SpaceApp`） | 完整工作台：桌面 + 纸张 + 批注栏 |
| `sidebar` | 右侧边栏文档（`SpaceSidebarDocument`） | 文档贴着对话，不画独立桌面 |
| `inline` | 对话内的文档引用卡片（`SpaceDocumentReference`） | 消息气泡里的一张小卡 |
| `overlay` | 挂到 `document.body` 的弹层（文档选择器） | 不在任何父根里，必须自带标记 |

标记由 `themeRootProps(surface, options)`（`packages/review-ui/src/theme/index.js`）统一生成，组件不手写类名。嵌套标记是安全的：标记只提供继承输入，宿主规则同样匹配内层，不会把外层主题重置成默认值。

## 4. Token 契约 v1

来源：`packages/review-ui/src/theme/tokens.json`（名称、分组、默认值、说明、版本）。`scripts/check-theme.mjs` 校验 `base.css` 与本表逐项一致。

### 4.1 调色板（宿主必须能设置）

| Token | 默认值 | 用途 |
|---|---|---|
| `--cospace-surface-canvas` | `#f1eee7` | 应用底色 / 桌面 |
| `--cospace-surface-paper` | `#fffdf8` | 文档纸张 |
| `--cospace-surface-raised` | `#fffdf9` | 卡片、控件、菜单、弹窗 |
| `--cospace-surface-rail` | `#f8f5ef` | 批注栏与次级填充 |
| `--cospace-scrim` | `rgba(24,24,27,.38)` | 弹窗遮罩 |
| `--cospace-text-primary` | `#25262b` | 正文与标题 |
| `--cospace-text-secondary` | `#656b77` | 次要文字 |
| `--cospace-text-on-accent` | `#ffffff` | 强调色/危险色上的文字 |
| `--cospace-border` | `#e4ded3` | 常规边框与分隔线 |
| `--cospace-border-strong` | `#d8d0c2` | 强调边框、滚动条 |
| `--cospace-accent` | `#315acb` | 唯一的操作色：主按钮、链接、焦点、选中 |
| `--cospace-comment` | `#b45309` | 评论锚点与批注 |
| `--cospace-suggestion` | `#0f766e` | 建议锚点与插入标记 |
| `--cospace-danger` | `#a62835` | 删除、失败、破坏性操作 |
| `--cospace-success` | `#17683b` | 接受、保存、发送成功 |
| `--cospace-shadow` | `#2a241b` | 阴影基色（规则里按百分比混入透明） |

### 4.2 字体与几何（可选，均有默认值）

| Token | 默认值 | 用途 |
|---|---|---|
| `--cospace-font-ui` | 系统栈 | 界面字体 |
| `--cospace-font-reading` | 系统栈 | 文档阅读字体；宿主可映射内容字体 |
| `--cospace-font-size` | `14px` | 界面基准字号；纸张自带更大的阅读字号 |
| `--cospace-radius-control` | `8px` | 按钮、输入框 |
| `--cospace-radius-card` | `12px` | 卡片、批注、纸张 |
| `--cospace-radius-dialog` | `16px` | 弹窗与浮层 |

规则：

- 颜色派生（评论 15% 淡色、阴影 8% 等）在组件里用 `color-mix(in srgb, var(--cospace-*) N%, transparent)` 现算，不再引入第二层变量；宿主改一个基色，所有派生色一起跟随。
- 改名或删除 token 属于破坏性变更，见第 8 节；只加不删是常规变更。

## 5. 宿主接入

### 5.1 只映射 token（推荐，DSH 采用）

在宿主自己的样式表里写一份 token 映射，选择器用 `.cospace-theme`：

```css
/* adapters/dsh/client/theme.css（节选） */
.cospace-theme {
  --cospace-surface-canvas: var(--dsw-alias-bg-base, #f1eee7);
  --cospace-text-primary: var(--dsw-alias-label-primary, #25262b);
  --cospace-accent: var(--dsw-alias-brand-primary, #315acb);
  --cospace-font-reading: var(--dsh-font-family-text, system-ui, sans-serif);
}
.cospace-theme[data-cospace-surface='sidebar'] {
  --cospace-surface-paper: var(--dsw-alias-bg-layer-1, #fffdf8);
}
```

完整示例见 `adapters/dsh/client/theme.css`。它只做两件事：映射 DSH 的 alias token、给不同 surface 换少量值。**不写任何非 token 的声明。**

### 5.2 没有样式注入能力的宿主（JS 通道）

有的 WebView 无法可靠注入样式表。此时给根组件传 `theme`，或让适配器对象带 `theme`：

```jsx
<SpaceApp adapter={adapter} theme={{ tokens: { accent: '#7c3aed' } }} />
// 或：adapter.theme = { tokens: { ... } }
```

`themeStyle()` 把 token 转成内联自定义属性（优先级最高），非法 token 或非法值会抛出 `TypeError`。DSH 不需要这条路径，但它保证“主题能力对任何宿主开放”。

### 5.3 禁止事项

- 不得在 `:root` / `html` / `body` 上写 `--cospace-*`（DSH 的暗色块除外：`body[data-ds-dark-theme] .cospace-theme` 是允许的写法，因为选择器仍落在标记上）。
- 不得写 `--cospace-*` 之外的声明（例如 `padding`、`display`、`background`）——那属于结构定制。
- 不得使用 `!important` 覆盖共享样式。
- 不得读取 `--cospace-*` 之外的内部变量；共享层已不再有内部变量。

## 6. 深浅色

共享样式**不读取** `prefers-color-scheme`：颜色完全由宿主 token 决定。因此：

- 只有浅色的宿主（当前 Desktop）不需要任何暗色分支，也不会被系统偏好意外改暗。
- DSH 把 alias token 映射过来后，暗色自动跟随（alias token 自身随主题切换）；只有身份色与阴影需要显式暗色值，见 `theme.css` 末尾的 `body[data-ds-dark-theme] .cospace-theme` 块。
- 第三方 DSH 主题只要改 alias token，CoSpace 自动跟随，无需为本插件单独适配。

## 7. 校验与测试

`node scripts/check-theme.mjs`（也被 `test/theme-contract.test.js` 调用，`npm run check` 覆盖）执行：

1. `base.css` 的默认块必须是 `:where(.cospace-theme)`，每个公开 token 恰好声明一次且与 `tokens.json` 默认值一致；不得出现清单外的 `--cospace-*`。
2. `space.css` 不得出现字面色值（`tokens.json` 的 `artwork.colors` 是唯一例外，用于 Agent 身份头像）；不得读取非公开 token；不得声明 `--space-*`；顶层选择器必须被 CoSpace 类作用域化。
3. `!important` 只允许出现在已知债务位置（嵌入编辑器、控件重置、减少动效、批注浮层），白名单只能缩小。
4. 宿主主题文件：只允许 `--cospace-*` 声明；选择器必须含 `.cospace-theme`；不得写 `!important`。
5. `SpaceApp` / `SpaceSidebarDocument` / `SpaceDocumentReference` 必须通过 `themeRootProps()` 生成根属性，保证标记与 surface 不会漏加。

视觉验收（改动样式时必须附截图）：

| 场景 | Desktop | DSH |
|---|---|---|
| 浅色 | 默认外观 | 跟随 DSH 调色板 |
| 暗色 | 不适用（保持浅色） | 面板 / 右栏 / 对话卡片 / 弹层一致 |
| 右栏 | — | 无独立桌面，贴合 DSH 栅格 |
| 窄宽度 | 维持现有批注栏行为 | 同左 |
| 第三方 DSH 主题切换 | — | 自动跟随 alias token |

## 8. 版本与变更流程

- `THEME_CONTRACT_VERSION`（当前 `1`）随 `tokens.json.version` 一起发布，并由测试断言两者一致。
- 新增 token：只做加法，版本不变；同时补 `tokens.json`、`base.css`、本文档表格。
- 改名或删除：版本 +1，并保留一个发布周期的别名（在 `base.css` 里把旧名映射到新名），到期删除；文档记录迁移。
- 宿主主题文件只依赖公开 token，因此宿主一侧不需要跟随内部重构。

## 9. 迁移记录（v1 建立时）

- 旧的 `--cospace-surface` / `--cospace-text` / `--cospace-muted` / `--cospace-warning` / `--cospace-link` / `--cospace-background` 已由更明确的名字取代（见第 4 节），没有保留别名：旧值原本只被 DSH 的错误映射使用。
- 共享样式内部的 `--space-*` 变量层已删除；组件直接读 `--cospace-*`。
- 文档选择器弹层改为携带 `.cospace-theme` + `data-cospace-surface="overlay"`，不再重复声明一套 token。
- 首页（home）原本有一套暖色私有调色板（`--space-home-*`），已并入共享 token：主操作色统一为 `--cospace-accent`，暖色仅保留在纸张/桌面的默认值里。这是一次有意的视觉收敛。
- 危险色统一为 `--cospace-danger`（原 `#a62835` / `#dc3545` / `#b91c1c` 三色合并）。
- 已知债务：`space.css` 中仍有少量 `!important`，集中在 Milkdown 编辑器覆盖与控件重置；白名单在 `scripts/check-theme.mjs`，只允许缩小。
