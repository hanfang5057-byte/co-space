# 04 · DSH 集成契约

## 入口和职责

评论正文由文档工具读取的流程已接入 DSH；完整领域流程见[评论驱动修改方案](11-comment-driven-revision-plan.md)。宿主能力由[适配器接入规范](14-adapter-integration.md)定义，DSH 只声明并启用其当前宿主可提供的能力。

- 左侧 CoSpace 总入口负责浏览个人文档和打开审阅界面。
- 任意 DSH 对话输入框的加号可选择一个或多个 CoSpace 文件，引用格式为 `space:<docId>`。该入口已在 DSH `0.2.3-alpha.2` 中接入（见下）；真实对话内的插入、引用解析和跨会话行为仍待端到端验收，不把入口可用等同于插件接入已验证。
- 用户发送文件和修改要求后，Agent 通过受控能力读取对应正文、版本、待处理建议，并逐条提交具体建议；接受和拒绝由用户在 UI 发起。
- 选区评论保存在文档侧；用户主动触发后，Agent 从 `space_document_read` 返回中读取评论并提交建议。对话请求只携带指定文档引用和简短指令，不携带评论正文。

## 能力契约（MCP 工具与 UI API）

| 能力 | 输入与结果 |
|---|---|
| 新建空白文档 | 用户在 CoSpace 页面新建；默认标题「未命名文档」、正文为空；不能覆盖已有文档 |
| 创建文档 | Agent 可提供完整初始正文；已有文档不能覆盖 |
| 读取文档 | 用户明确指定的文档 ID；返回已接受正文、版本、待处理建议和评论。MCP 不提供文档枚举 |
| 提交建议 | 文档、基于版本、定位、原内容、替换内容及可选说明；返回建议 ID 或明确错误 |
| 查询建议 | 返回建议及状态，供 Agent 处理冲突和用户决策结果 |
| 用户决策 | 文档、建议 ID、接受或拒绝、操作 ID；按 [01](01-domain-model.md#事务与恢复) 原子执行 |
| 评论处理 | Agent 在用户明确要求后调用 `space_document_read` 读取评论；提交建议后调用 `space_comment_complete` 记录评论处理结果和建议关联 |

处理请求以 `space:<docId>` 开头且只出现一次，附简短处理指令；评论正文和 ID 不进入对话消息。

`OVERLAPPING_SUGGESTION` 返回冲突建议 ID 和可用定位；`VERSION_CONFLICT` 要求读最新版本；`ANCHOR_STALE` 禁止猜测应用。Agent 可以创建并写入新文档初始正文；接口不提供修改已有文档已接受正文的操作。若宿主还暴露文件或 shell 工具，应核实权限边界；插件不能声称能拦截所有绕行方式。

## 已接入的宿主接口（0.2.3-alpha.2）

实现位置：[DSH 插件入口](../adapters/dsh/index.js)、[宿主 UI API](../packages/host-api/src/index.js) 与 [HTTP 传输](../packages/transport-http/http-handler.js)、[Agent 工具规格](../packages/transport-mcp/handlers.js)、[DSH 客户端入口](../adapters/dsh/client/index.jsx)。

| 接入点 | 实现方式 | 当前状态 |
|---|---|---|
| Agent 工具 | `ctx.tools.register` 原生注册全部 12 个 `space_*` 工具，与 MCP 门面共享同一份规格（`createToolSpecs`）；行为指南经 `systemPrompt.section` 进入系统提示 | 已注册；激活时同步可用，无就绪探测；不支持文档枚举；MCP 门面契约由 Node 测试覆盖（stdio 入口仅作测试靶） |
| UI API | `webServer.register({ kind:'exact', path:'/cospace-api', auth:'required' })`；宿主在分发前完成 Host/Origin 与浏览器凭据准入（无法判定时 503），handler 不重复判定准入；通过后分发到空间/文档列表、文档新建、读取、更新、删除、建议决策、评论增删、协作说明读写、账号名称/头像和发送目标服务 | 已注册；路由准入由宿主承担并有单元测试；新建文档入口、插件页、详情预览图、侧边栏 CoSpace 入口和空状态已加载 |
| 左侧入口 | Client slot `main`（key `spaces`）与 `sidebar.panellist`（id `spaces`） | 已在 DSH 页面渲染 |
| 输入框多选 | `inputTriggers` 的 `@` 菜单按标题/ID 过滤并插入引用；`/space` 命令打开基于 `SpaceDialog` 的多选弹窗（`shell.overlay`）；引用格式 `space:<docId>`，两处共用同一套插入与通知逻辑 | 已注册；真实对话中的插入与 Agent 引用解析仍待验收 |
| 发送引用渲染 | `uiConversation.userText.register` 匹配完整 `space:<docId>`；`conversation.user.text.node` 注册文档卡片；只读场景保持卡片但不可点击 | 已在本地构建中渲染卡片 |
| 右侧边栏文档 | `sidebarRightTabs.register` 注册 `dsh-resource://space/**` 资源类型；`sidebar.right.pane.tab` 渲染审阅面板，地址持久化文档 ID；面板顶部与主页面共用 `SpaceSurfaceHeader`（`surface="sidebar"` 紧凑变体），共用更多工具菜单（含风格偏好）、缩放和发送；风格偏好经同一个 `useDocumentPreferences` 控制器读写 | 已打开、刷新后恢复同一文档；标题栏共用已接入，DSH 内视觉实测待做 |
| 评论处理触发 | 优先使用 UI 当前对话；没有对话时复用最近工作区、必要时创建默认工作区并新建/复用对话，再发送文档引用和简短指令；评论正文只由 Agent 经文档工具读取 | 已接入；单元测试验证会话目标、请求不含评论正文；真实 DSH 宿主会话链路仍待端到端验收 |
| 客户端本地化 | Client `locale` 服务注册 `space` 命名空间（中文 / English） | 已接入；已确认切换 English 后插件页、详情页和面板文案更新，切回中文正常 |
| 自主审阅入口 | 客户端适配器提供 `prompts.mcpReady`，审阅页显示「让 Agent 起草 / 让 Agent 审阅」；点击后把 `autonomousReviewPrompt` 文本复制到剪贴板，不直接发送消息。原生工具在激活时同步注册，`mcpReady` 是静态能力声明，不再探测 | 已接入；复制与降级有单元测试，真实会话未验收 |
| 右栏文档动作 | `sidebar.right.tab.menu.item` 注册「复制文档引用 / 复制文档链接 / 在 CoSpace 中打开 / 导出 Markdown / 导出 Word」；面板标题显示文档维度的待处理数量 | 已注册；菜单与导出待 DSH 内实测 |
| 工具卡片 | 客户端 `tool.call.toolview` 按原生工具名（`space_document_read` 等）接管渲染：文档读取显示标题/版本/待处理与评论数，提交建议显示原文到替换内容的 diff，建议列表显示待处理与总数 | 已注册；解析与回退有单元测试 |
| 审阅决策卡 | 宿主 `actionCards.register` 注册 `cospace-review`，并用 `skillProvider` 发布模型技能 `cospace-review-card` 教会围栏格式；客户端 `actionCards.register` 渲染 body，「全部接受」经宿主 `act` 复用 `decide` 逐条接受（操作 ID 可重放） | 已注册；决策循环与技能内容有单元测试，真实会话卡片待验收 |
| 评论作者 | Host 读取 `deepseekAccount.getState()` / `getProfile()`，只返回登录状态、显示名和头像 URL；客户端回退到本地化通用作者 | 已接入；未登录或账号插件缺失时不影响评论 |

## 本地开发安装

本地联调时，DSH profile 的依赖用 `link:` 指向本仓库的 `dist/dsh-plugin`，不指向仓库根目录：根目录是私有 workspace，没有可直接加载的包入口。因此改完 `adapters/dsh/` 或 `packages/` 后必须先 `npm run build:dsh`（持续开发用 `npm run dev:dsh` 监听重建），再在 DSH 中重新加载插件；只运行 `npm run build:client` 仅重写 `adapters/dsh/client.js`，不会更新 `dist/dsh-plugin/`。验证干净安装时使用 `npm run pack:dsh` 暂存的 tarball，而不是链接目录。

## 仍需端到端验收

1. 在真实对话中通过 + 选择一个或多个文档后，引用是否按 `space:<docId>` 插入，Agent 是否能解析并授权读取。
2. 工具调用卡片在真实对话中的渲染与回退；右栏菜单的复制/导出在 DSH 桌面与 Web 两种运行时的行为。
3. 模型是否按技能输出 `action-card` 围栏，以及决策卡接受后的状态回灌。
4. 从文档请求处理评论时是否正确取得当前对话；无当前对话时新建/复用对话和默认工作区的真实宿主行为；宿主回执、超时、断连后的失败与结果未知如何区分。
5. UI 更新和进程重启后，能否重新读取权威正文、版本和建议状态。
6. 宿主文件/shell 权限及隔离边界，尤其是是否存在绕过 CoSpace 接口的写入。

现有自动化覆盖共享工具契约（MCP stdio 测试靶）、SQLite 事务、建议决策、评论处理触发模拟、重启与并发；这些测试不代替上述宿主内验收。
