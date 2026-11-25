# 04 · DSH 集成契约

## 入口和职责

评论正文由文档工具读取的流程已接入 DSH；完整领域流程见[评论驱动修改方案](11-comment-driven-revision-plan.md)。宿主能力由[适配器接入规范](14-adapter-integration.md)定义，DSH 只声明并启用其当前宿主可提供的能力。

- 左侧 CoSpace 总入口负责浏览个人文档和打开审阅界面。
- 任意 DSH 对话输入框的加号可选择一个或多个 CoSpace 文件，引用格式为 `space:<docId>`。该入口已在 DSH `0.2.2-rc.5` 中接入（见下）；真实对话内的插入、引用解析和跨会话行为仍待端到端验收，不把入口可用等同于插件接入已验证。
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

## 已接入的宿主接口（0.2.2-rc.5）

实现位置：[DSH 插件入口](../adapters/dsh/index.js)、[宿主 HTTP API](../adapters/dsh/server/host.js)、[MCP 进程入口](../adapters/dsh/server/mcp-entry.js)、[DSH 客户端入口](../adapters/dsh/client/index.jsx)。

| 接入点 | 实现方式 | 当前状态 |
|---|---|---|
| Agent 工具 | `mcpManager.register('space', { transport:'stdio', toolLoading:'eager' })`；工具为 `space_document_create`、`space_document_read`、`space_suggest`、`space_suggestion_list`、`space_comment_complete` | 已注册；不支持文档枚举；MCP stdio 和评论处理契约由 Node 测试覆盖 |
| UI API | `webServer.register({ kind:'prefix', path:'/cospace-api' })`，POST 请求先经 `ctx.connection.requestRejection` 准入，再分发到文档新建、读取、决策、评论、账号名称/头像和发送目标服务 | 已注册；路由准入在 0.1.8 加入并有单元测试；新建文档入口、插件页、详情预览图、侧边栏 CoSpace 入口和空状态已加载 |
| 左侧入口 | Client slot `main`（key `spaces`）与 `sidebar.panellist`（id `spaces`） | 已在 DSH 页面渲染 |
| 输入框多选 | `commandUi.register` 打开原生对话框；`inputTriggers.registerSource` 提供引用编解码，引用格式 `space:<docId>` | 已注册；真实对话中的插入与 Agent 引用解析仍待验收 |
| 发送引用渲染 | `uiConversation.userText.register` 匹配完整 `space:<docId>`；`conversation.user.text.node` 注册文档卡片；只读场景保持卡片但不可点击 | 已在本地构建中渲染卡片 |
| 右侧边栏文档 | `sidebarRightTabs.register` 注册 `dsh-resource://space/**` 资源类型；`sidebar.right.pane.tab` 渲染审阅面板，地址持久化文档 ID | 已打开、刷新后恢复同一文档 |
| 评论处理触发 | 优先使用 UI 当前对话；没有对话时复用最近工作区、必要时创建默认工作区并新建/复用对话，再发送文档引用和简短指令；评论正文只由 Agent 经 MCP 工具读取 | 已接入；单元测试验证会话目标、请求不含评论正文；真实 DSH 宿主会话链路仍待端到端验收 |
| 客户端本地化 | Client `locale` 服务注册 `space` 命名空间（中文 / English） | 已接入；已确认切换 English 后插件页、详情页和面板文案更新，切回中文正常 |
| 评论作者 | Host 读取 `deepseekAccount.getState()` / `getProfile()`，只返回登录状态、显示名和头像 URL；客户端回退到本地化通用作者 | 已接入；未登录或账号插件缺失时不影响评论 |

## 仍需端到端验收

1. 在真实对话中通过 + 选择一个或多个文档后，引用是否按 `space:<docId>` 插入，Agent 是否能解析并授权读取。
2. 从文档请求处理评论时是否正确取得当前对话；无当前对话时新建/复用对话和默认工作区的真实宿主行为；宿主回执、超时、断连后的失败与结果未知如何区分。
3. UI 更新和进程重启后，能否重新读取权威正文、版本和建议状态。
4. 宿主文件/shell 权限及隔离边界，尤其是是否存在绕过 CoSpace 接口的写入。

现有自动化覆盖 MCP stdio、SQLite 事务、建议决策、评论处理触发模拟、重启与并发；这些测试不代替上述宿主内验收。
