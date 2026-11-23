# 智联文档空间（CoSpace）

![CoSpace app icon](assets/cospace-icon.svg)

CoSpace 让用户在个人文档中审阅 Agent 提出的具体修改：用户可以在 Space 页面新建空白文档，Agent 也可以创建带完整初始正文的新文档；对已有文档的修改必须提出建议，只有用户接受才改变已接受正文。相邻修改可合并为一个审阅单位，实际重叠的提交会被拒绝。

## 当前状态

本仓库是智联文档空间（CoSpace）的私有 npm workspace，包含共享审阅核心、共享审阅 UI、通用传输层及宿主适配器。DSH 插件与 WorkBuddy Connector 提供独立的本机文档空间和审阅界面；两个宿主使用各自的数据目录，不共享文档。

正文以 Markdown 源文本保存和审阅。Agent 提交带版本和 UTF-16 源码区间的替换建议；段落、标题、列表、表格、链接等 Markdown 结构都通过普通文本替换修改。完整接口、坐标和安全限制见[审阅内核说明](docs/07-review-core.md)。

## 安装与启用

- DSH npm 包名为 `dsh-plugin-space`。根目录是私有 workspace，不直接安装或发布；构建发布包后安装 `dist/dsh-plugin/`，或运行 `npm pack ./dist/dsh-plugin` 生成 npm tarball。
- 插件市场索引：`https://raw.githubusercontent.com/hanfang5057-byte/co-space/main/market/index.json`。
- 本地开发时修改源码后，按下方「打包」中的命令构建，再将生成的目录安装到对应宿主。
- 插件声明 `engines.dsh = ^0.2.2-rc.5`；升级 DSH 大版本后需要重新核对兼容性。
- `adapters/dsh/client.js` 是 DSH 客户端生成产物；修改 `packages/review-ui/src/` 或 `adapters/dsh/client/` 后运行 `npm run build:client`，不要手工编辑生成文件。
- React 由宿主提供：构建保持 `react`、`react-dom`、`react/jsx-runtime` 外置，`npm run build:client` 会在发现 React 被打包进 `client.js` 时直接失败；插件不声明自己的 React 依赖。
- 启用后，左侧栏出现 **Space** 入口；对话输入框的 **+** 菜单出现 **Space 文档**。

## 使用入口

- **左侧 Space**：浏览个人文档，阅读正文和待处理建议，逐条接受或拒绝；在渲染正文中选中文字会就地出现「评论」按钮，保存后评论显示在正文右侧批注槽，可删除；修改建议也以另一种颜色的气泡出现在同一批注槽中，正文保持固定最小宽度，窗口不足时横向滚动。
- **新建文档**：左侧文档栏的 **新建文档** 按钮创建默认标题为「未命名文档」、正文为空的文档；标题和正文的后续修改仍由 Agent 提建议完成。
- **输入框 +**：选择一个或多个 Space 文档加入当前对话，引用格式为 `space:<docId>`。
- **对话文档卡片**：发送后的引用显示为一张文档卡片，点击会展开右侧边栏并打开该文档的审阅面板；标签页按文档地址恢复，刷新后仍是同一篇文档。
- **评论驱动修改**：在文档里选中文字，点击选区旁的 **评论**，填写并保存；点击 **让 Agent 处理评论** 后，DSH 向当前对话只发送文档引用和处理指令，Agent 再通过 `space_document_read` 读取评论、提交建议，并以 `space_comment_complete` 记录每条评论的处理结果。WorkBuddy 提供复制短提示词，用户手动粘贴发送；评论正文不进入提示词。评论及建议关联状态保留在审阅页，刷新可查看结果。

## 数据与隐私

- 文档、建议、评论、评论处理结果和 DSH 对话请求记录保存在本机 SQLite；DSH 可用 `DSH_SPACE_HOME` 指定目录，WorkBuddy 使用独立的 `~/.workbuddy/space`。
- 评论处理时，DSH 通过宿主 `sessionController.prompt` 发送引用和简短指令，不发送评论正文；WorkBuddy 的提示词只通过用户剪贴板操作交接。评论作者信息只读取 DSH 宿主账号服务已暴露的名称和头像，不读取或记录令牌、手机号、邮箱等凭据。
- MCP Agent 工具只支持创建和读取明确指定的文档、提交建议、查询建议状态和记录评论处理结果；不提供文档枚举。已有文档正文只能由用户接受建议后改变。

## 限制

- Markdown 语法不受结构白名单限制；建议必须精确匹配指定版本中的源码区间，重叠修改会被拒绝，用户接受后才更新正文。
- 新建文档默认标题为「未命名文档」、正文为空；创建后不能直接编辑，标题和正文的修改仍须通过 Agent 建议完成。
- 版本变化但引用仍可唯一定位时，评论锚点会自动映射到新位置；无法安全映射的评论进入「位置已失效」分组，保留引用但不绘制正文锚点。
- 评论处理结果通过独立操作记录；需要澄清的评论保留原因及状态。
- 界面文案随 DSH 语言切换（中文 / English）；服务端返回的领域错误消息按原样显示。

## 界面验收数据

`scripts/seed-markdown-ui.mjs` 通过 Space MCP 写入一套 Markdown 审阅测试文档。默认会先清空此前由该脚本创建的 `md-ui-*` 文档（含建议、评论、发送记录和操作记录），再写入一整套新数据；普通文档不受影响：

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
- [多宿主适配器与 WorkBuddy Connector 架构方案](docs/09-host-adapters-architecture.md)：共享架构、独立分发和 WorkBuddy 后续工作的边界。

## 运行检查

需要 Node.js 24 或更高版本：

```sh
npm install
npm run build:dsh
npm run check
```

测试包含真实 MCP stdio、SQLite 存储、建议决策、评论处理模拟、重启、冲突及进程并发；它们不是 DSH 宿主界面的端到端验证。可用 `sh scripts/test-ui.sh` 运行模拟 DOM 的界面测试，该脚本在临时目录安装测试依赖。

## 打包

根目录是私有 npm workspace，不直接发布。DSH 插件和 WorkBuddy Connector 分别构建、校验和交付；修改共享审阅 UI 后，需要分别构建两个适配器。两个公开 npm 包共用 [`release/npm-version.json`](release/npm-version.json) 中的版本。发布前运行 `npm run pack:npm`，它会同步两边的包清单、lockfile 和 Connector 元数据，构建校验后把两个 tarball 放进 `dist/npm-packages/`。

### DSH 插件

在仓库根目录执行：

```sh
npm install                 # 首次安装依赖或依赖变更后
npm run build:dsh
```

`build:dsh` 会先运行 `build:client`，将 `adapters/dsh/client/index.jsx` 和共享审阅 UI 编译为生成文件 `adapters/dsh/client.js`，再组装完整插件到 `dist/dsh-plugin/`。不要手工修改 `client.js` 或 `dist/` 中的生成文件。

校验构建包：

```sh
npm run verify:dsh-package
```

该命令会重新构建 DSH 包、检查包内容和入口，并执行 `npm pack --dry-run`。如需生成 npm tarball：

```sh
npm run pack:dsh
```

`npm run pack:dsh` 会调用统一打包脚本并只产出 DSH tarball。完整发布优先使用 `npm run pack:npm`；tarball 输出到 `dist/npm-packages/`。本地安装或交给 DSH 测试时可使用 `dist/dsh-plugin/`。

### WorkBuddy Connector

在仓库根目录执行：

```sh
npm install --prefix adapters/workbuddy   # 首次安装依赖或依赖变更后
node adapters/workbuddy/build.mjs
```

构建结果位于 `dist/workbuddy-connector/`：

- `market/`：市场上传所需的 Connector 元数据、MCP 配置、图标和 Skill。
- `runtime-package/`：Connector 运行时包，包含 MCP 服务端和审阅页面资源。
- `mcp.local.json`：本机 WorkBuddy 验证用配置，不用于市场上传。

校验构建结果：

```sh
node adapters/workbuddy/verify.mjs
```

WorkBuddy 构建会直接从共享源码生成自己的审阅页面，不依赖 DSH 的 `adapters/dsh/client.js`；因此共享 UI 改动后，两个适配器都要各自重新构建。

`npm run pack:workbuddy` 也调用统一打包脚本，只产出 WorkBuddy tarball；两个包的版本仍会同步。

## 许可证

MIT，见 [LICENSE](LICENSE)。
