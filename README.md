# 智联文档空间（CoSpace）

![CoSpace app icon](assets/cospace-icon.svg)

[English](README.en.md) | 中文

CoSpace 让用户在个人文档中审阅 Agent 提出的具体修改：用户可以在 CoSpace 页面新建空白文档，Agent 也可以创建带完整初始正文的新文档；对已有文档的修改必须提出建议，只有用户接受才改变已接受正文。相邻修改可合并为一个审阅单位，实际重叠的提交会被拒绝。

## 当前状态

本仓库是智联文档空间（CoSpace）的私有 npm workspace，包含共享审阅核心、共享服务接口、共享审阅 UI、适配器契约、通用传输层、DSH 插件、Local Server 和 Tauri 桌面应用。DSH 插件位于 `adapters/dsh/`；Local Server CLI 位于 `apps/local-server/`；桌面产品、Node sidecar、Agent 接入和 Tauri 壳统一位于 `apps/desktop/`。共享核心不依赖具体宿主。目录边界和新增接入流程见[适配器接入规范](docs/14-adapter-integration.md)及[系统架构记录](docs/09-host-adapters-architecture.md)。

正文以 Markdown 源文本保存和审阅。Agent 提交带版本和 UTF-16 源码区间的替换建议；段落、标题、列表、表格、链接等 Markdown 结构都通过普通文本替换修改。完整接口、坐标和安全限制见[审阅内核说明](docs/07-review-core.md)。

## 安装与启用

DSH 插件包名为 `dsh-plugin-space`，已发布到 npm。

- **DSH Desktop / Web**：打开左侧 **Plugins**，点 **Add plugin**，输入 `dsh-plugin-space` 并确认安装；安装后启用，左侧栏出现 **CoSpace** 入口。
- **命令行**：`dsh plugin add dsh-plugin-space`。命令安装到当前 profile；Desktop 用户优先用界面安装，避免装进另一个 profile。
- **从插件市场发现**：在 **Plugins → Experimental plugins** 开启 **Custom plugin indexes**，再到 **Discover → Add index source** 添加 `https://raw.githubusercontent.com/hanfang5057-byte/co-space/main/market/index.json`（立即更新；若打不开可改用 `https://cdn.jsdelivr.net/gh/hanfang5057-byte/co-space@main/market/index.json`），搜索 CoSpace 安装。
- **离线 / 内网**：从 [GitHub Releases](https://github.com/hanfang5057-byte/co-space/releases) 下载 `dsh-plugin-space-<version>.tgz`，运行 `dsh plugin add ./dsh-plugin-space-<version>.tgz`。
- 插件声明 `engines.dsh = ^0.2.2-rc.5`、Node.js ≥ 24；DSH 升级大版本后需要重新核对兼容性。
- 本地开发时修改源码后，按下方「打包」中的命令构建，再将生成的目录安装到对应宿主。
- `adapters/dsh/client.js` 是 DSH 客户端生成产物；修改 `packages/review-ui/src/` 或 `adapters/dsh/client/` 后运行 `npm run build:client`，不要手工编辑生成文件。
- React 由宿主提供：构建保持 `react`、`react-dom`、`react/jsx-runtime` 外置，`npm run build:client` 会在发现 React 被打包进 `client.js` 时直接失败；插件不声明自己的 React 依赖。
- 启用后，左侧栏出现 **CoSpace** 入口；对话输入框的 **+** 菜单出现 **CoSpace 文档**。

### Local Server 和 Desktop

本次协调版本为 `0.1.9`，三端产品版本已对齐，版本来源仍各自独立。当前发布准备状态：DSH npm `latest` 仍为 `0.1.8`，awesome-dsh-plugin 外部目录也仍指向 `v0.1.8`；DSH `0.1.9` 和 Local Server `0.1.9` tarball 已完成打包验收，但尚未发布到 npm。Local Server 的配置和本地服务命令见 [`apps/local-server/README.md`](apps/local-server/README.md)；请在 `@cospace/local-server@0.1.9` 发布后再使用其中的 `@latest` 命令。

Desktop `0.1.9` 的 macOS arm64 DMG 已生成并通过包校验，目前使用 ad-hoc 签名，未使用 Developer ID 或公证。Windows/Linux 产物需要在对应构建机或 CI 完成验收后再发布；当前 macOS 包不代表已通过 Gatekeeper 的公开分发验收。桌面构建说明见 [`apps/desktop/README.md`](apps/desktop/README.md)。

## 使用入口

- **左侧 CoSpace**：浏览个人文档，阅读正文和待处理建议，逐条接受或拒绝；在渲染正文中选中文字会就地出现「评论」按钮，保存后评论显示在正文右侧批注槽，可删除；修改建议也以另一种颜色的气泡出现在同一批注槽中，正文保持固定最小宽度，窗口不足时横向滚动。
- **新建文档**：左侧文档栏的 **新建文档** 按钮创建默认标题为「未命名文档」、正文为空的文档；标题和正文的后续修改仍由 Agent 提建议完成。
- **输入框 +**：选择一个或多个 CoSpace 文档加入当前对话，引用格式为 `space:<docId>`。
- **对话文档卡片**：发送后的引用显示为一张文档卡片，点击会展开右侧边栏并打开该文档的审阅面板；标签页按文档地址恢复，刷新后仍是同一篇文档。
- **评论驱动修改**：在文档里选中文字，点击选区旁的 **评论**，填写并保存；点击 **让 Agent 处理评论** 后，DSH 向当前对话只发送文档引用和处理指令，Agent 再通过 `space_document_read` 读取评论、提交建议，并以 `space_comment_complete` 记录每条评论的处理结果。评论正文不进入提示词。评论及建议关联状态保留在审阅页，刷新可查看结果。

## 数据与隐私

- 文档、建议、评论、评论处理结果和 DSH 对话请求记录保存在本机 SQLite；DSH 可用 `DSH_SPACE_HOME` 指定目录。
- 评论处理时，DSH 通过宿主 `sessionController.prompt` 发送引用和简短指令，不发送评论正文。评论作者信息只读取 DSH 宿主账号服务已暴露的名称和头像，不读取或记录令牌、手机号、邮箱等凭据。
- MCP Agent 工具只支持创建和读取明确指定的文档、提交建议、查询建议状态和记录评论处理结果；不提供文档枚举。已有文档正文只能由用户接受建议后改变。

## 限制

- Markdown 语法不受结构白名单限制；建议必须精确匹配指定版本中的源码区间，重叠修改会被拒绝，用户接受后才更新正文。
- 新建文档默认标题为「未命名文档」、正文为空；创建后不能直接编辑，标题和正文的修改仍须通过 Agent 建议完成。
- 版本变化但引用仍可唯一定位时，评论锚点会自动映射到新位置；无法安全映射的评论进入「位置已失效」分组，保留引用但不绘制正文锚点。
- 评论处理结果通过独立操作记录；需要澄清的评论保留原因及状态。
- 界面文案随 DSH 语言切换（中文 / English）；服务端返回的领域错误消息按原样显示。

## 界面验收数据

`scripts/seed-markdown-ui.mjs` 通过 CoSpace MCP 写入一套 Markdown 审阅测试文档。默认会先清空此前由该脚本创建的 `md-ui-*` 文档（含建议、评论、发送记录和操作记录），再写入一整套新数据；普通文档不受影响：

```sh
node scripts/seed-markdown-ui.mjs              # 清空旧测试数据并重建
node scripts/seed-markdown-ui.mjs --keep-old   # 保留旧测试数据，追加一套
node scripts/seed-markdown-ui.mjs --clean-only # 只清空，不写入
node scripts/seed-markdown-ui.mjs --dry-run    # 查看将清理和将写入的内容
node scripts/seed-markdown-ui.mjs --only=comments
```

`--only=<key>` 只清理并重建对应 key 的测试文档（例如 `comments`）。

## 文档

- [项目计划](PLAN.md)：当前范围与后续工作。
- [领域模型与一致性](docs/01-domain-model.md)：文档、建议、冲突和事务规则。
- [审阅闭环](docs/02-review-loop.md)：对话、建议、决策和评论处理流程。
- [界面与交互规格](docs/03-ui-spec.md)：正文与建议并排的审阅设计。
- [DSH 集成契约](docs/04-dsh-integration.md)：宿主入口与当前接入状态。
- [导入与导出](docs/05-word-export.md)：Markdown 和可选 Word 导出。
- [交付与验收](docs/06-delivery.md)：实现顺序、验收及风险。
- [审阅内核与验证范围](docs/07-review-core.md)：已实现能力、运行方式和限制。
- [适配器接入规范](docs/14-adapter-integration.md)：核心与适配器单向依赖、能力声明/协商、降级规则和新增步骤。
- [系统架构记录](docs/09-host-adapters-architecture.md)：当前架构和迁移边界。

## 运行检查

需要 Node.js 24 或更高版本：

```sh
npm install
npm run build:dsh
npm run check
```

测试包含真实 MCP stdio、SQLite 存储、建议决策、评论处理模拟、重启、冲突及进程并发；它们不是 DSH 宿主界面的端到端验证。宿主界面仍需在实际支持的 DSH 环境中验收。

## 桌面版开发与打包

桌面版需要 Node.js 24 或更高版本、Rust stable，以及当前平台的 Tauri 系统依赖。运行 `npm run desktop:dev` 启动开发版，运行 `npm run desktop:package` 构建当前平台安装包，最终产物写入 `dist/releases/desktop/<平台>/`。运行 `npm run desktop:smoke` 可检查打包 Node sidecar 的 HTTP 与 MCP 启动。

## 打包

根目录是私有 npm workspace，不直接发布。DSH 插件和 Local Server 是两个独立 npm 包；Desktop 使用各平台安装包。三端产品可协调版本发布，但版本来源和发布步骤独立。发布前按[统一发布流程](docs/16-release-process.md)构建、校验并查看 `dist/npm-packages/` 和 `dist/releases/desktop/` 中的暂存产物；不得从 workspace 根目录发布。

### DSH 插件

在仓库根目录执行：

```sh
npm install                 # 首次安装依赖或依赖变更后
npm run build:dsh
```

`build:dsh` 会先运行 `build:client`，将 `adapters/dsh/client/index.jsx` 和共享审阅 UI 编译为生成文件 `adapters/dsh/client.js`，再组装完整插件到 `dist/dsh-plugin/`，最后刷新 `market/index.json` 和其中的图标。不要手工修改 `client.js` 或 `dist/` 中的生成文件。只运行 `build:client` 不会更新 `dist/dsh-plugin/`，因此不会影响已安装的插件。

品牌名称、简介和图标源文件的唯一来源是 `packages/brand/metadata.json`；共享 UI、DSH 插件包和市场索引均从这里读取。`description` 同时用于插件详情页、npm 包和 market 索引的简介，图标由 `icon` 指定。修改这些品牌字段后运行 `npm run build:dsh`，刷新 DSH 包、市场索引和图标。

市场索引的版本列表不再手工维护。发布前运行 `node scripts/sync-market.mjs`，它从 npm registry 拉取已发布版本、发布时间和 `engines.dsh`，并写入周下载量与 GitHub 星标排序键；`node scripts/sync-market.mjs --check` 只校验现有索引。索引同时发布到 GitHub raw（`https://raw.githubusercontent.com/hanfang5057-byte/co-space/main/market/index.json`）、jsDelivr 镜像（`https://cdn.jsdelivr.net/gh/hanfang5057-byte/co-space@main/market/index.json`）和 GitHub Pages（`https://hanfang5057-byte.github.io/co-space/market/index.json`）；落地页由 Pages 部署发布。

已把本地插件以 `link:` 方式安装到 DSH profile 时，用监听模式开发：

```sh
npm run dev:dsh
```

该命令监听 `packages/`、`adapters/dsh/`、`assets/`、`docs/`，保存后自动重新构建 `dist/dsh-plugin/` 并打印本次构建戳；DSH 的 client-hmr 约 0.5 秒内热替换插件客户端，通常无需刷新页面（若页面控制台出现 `client-hmr: /plugins/events closed`，刷新一次即可）。

校验构建包：

```sh
npm run verify:dsh-package
```

该命令会重新构建 DSH 包、刷新市场索引、校验索引格式与品牌字段、检查包内容，并执行 `npm pack --dry-run`。如需生成 npm tarball：

```sh
npm run pack:dsh
```

`npm run pack:dsh` 产出 DSH tarball 到 `dist/npm-packages/`。本地安装或交给 DSH 测试时可使用 `dist/dsh-plugin/`。

### DSH 插件发布

以下步骤仅涵盖 DSH 插件。Local Server 与 Desktop 的发布步骤以及三端协调发布时序见[统一发布流程](docs/16-release-process.md)。

1. 更新 `release/npm-version.json` 和 `adapters/dsh/package.json` 的版本号。
2. 运行 `npm run pack:dsh` 构建并校验发布包。
3. 发布到 npm：`npm publish ./dist/dsh-plugin`。
4. 运行 `node scripts/sync-market.mjs`，提交刷新后的 `market/index.json`。
5. 创建并推送 `vX.Y.Z` 标签，再在 GitHub Release 中附上 `dist/npm-packages/dsh-plugin-space-X.Y.Z.tgz`。

## 许可证

MIT，见 [LICENSE](LICENSE)。
