# Agent 单篇文档直达链接方案（Local Server + DSH）

## 目标

Agent 完成文档创建、读取或提交修改建议后，可以给用户一个指向该篇文档的入口。用户打开后直接进入对应文档审阅页，不必再从文档列表中查找。两个宿主都要支持这一体验，但使用各自能够实际打开的地址形式。入口只负责导航；它不授予 Agent 或链接持有者额外的读取、写入或审阅决策权限。

Local Server 使用本机 HTTP 单篇地址；DSH 使用插件已实现的 `dsh-resource://space/<id>` 资源地址，并通过右侧栏打开。共享 MCP 层保留 `space:<docId>` 作为宿主无关文档身份，不把任一宿主的地址冒充为通用地址。

## 当前差距

- MCP 创建工具返回 `space:<docId>` 引用；建议/读取结果目前也没有统一、明确的单篇打开信息。
- Local Server MCP 初始化时只向共享 MCP server 提供审阅服务根地址。现有 `reviewUrl` 是通用入口，没有文档定位信息。
- 共享 `SpaceApp` 目前以 React 状态选择文档，没有从页面 URL 恢复选中项的入口。
- DSH 插件已经注册 sidebar resource tab，并能通过 `navigation.openDocument` 打开文档；但 MCP 工具结果里的链接在 Agent 对话中是否可点击、是否交给 DSH 导航处理，尚未实机验证。
- 文档引用和 UI 导航已有各自格式：MCP 使用 `space:<id>`，DSH 资源使用 `dsh-resource://space/<id>`。两者应继续保持职责清晰。

## 用户流程

1. 用户明确要求 Agent 创建、审阅或修改指定文档。
2. Agent 仍按 `space:<docId>` 读取目标，不枚举或自行挑选文档。
3. 创建或提交建议后，工具响应包含文档身份和宿主适配的打开信息；Agent 在答复里给出对应入口。
4. Local Server 用户打开单篇 HTTP URL；DSH 用户点击 DSH 识别的资源深链/文档卡片，打开右侧栏对应资源页。
5. 打开后显示正常审阅状态。建议仍待用户在 UI 接受或拒绝。
6. 文档不存在或宿主服务离线时显示明确错误/离线状态；Local Server 可返回文档首页，DSH 可回到 Space 面板。

## 地址与路由

- Local Server 使用本机服务已有随机端口和 loopback origin，构造形如 `http://127.0.0.1:<port>/?document=<encoded-id>` 的地址；参数名在实现时统一定义并写入共享 helper。
- `document` 值只接受合法的文档 ID，经 `URLSearchParams` 编码和解码；禁止把它解释为文件路径、路由片段或任意 URL。
- Local Server 页面启动时读取该参数，加载文档列表后选中匹配 ID；列表中不存在时显示“文档不存在”，不静默跳到另一篇文档。
- 从单篇页返回首页时移除定位参数；首页选择另一篇时同步更新地址。浏览器刷新和前进/后退应恢复正确选择。
- DSH 使用现有 `dshSpaceResourceFor(docId)` 生成 `dsh-resource://space/<encoded-id>`。插件仅把已解析且合法的文档 ID 交给 `openSpaceDocument`，由已注册的 sidebar resource tab 打开；不把该地址发送到 Local Server HTTP 服务。
- 先验证 DSH 对 Agent 回复中的 `dsh-resource://` 链接是否可点击并被插件接管。若 Markdown 链接不受支持，MCP 响应继续提供 `space:<id>`，Agent 结果同时给出该引用，并通过现有文档引用卡片/插件打开能力提供打开入口；不能把纯文本 scheme 宣称为已验证的可点击链接。
- 地址中不放正文、评论、建议内容、token、用户信息或持久授权凭据。链接属于本机导航地址，不能视作访问控制。

## MCP 契约

- 共享响应明确返回 `reference: space:<id>`，作为两个宿主通用的文档身份；在其上按宿主能力附加打开入口：Local Server 使用 `reviewUrl`，DSH 使用 `documentLink`（值为 `dsh-resource://space/<id>`）。
- 在现有 `reviewUrl` 注入处改为文档感知 URL provider：创建工具用返回文档 ID 生成链接；`space_suggest` 用解析后的 `docId` 生成链接；读取和建议查询响应可附相同格式链接。
- DSH 由 MCP/adapter 装配层提供 `documentLink` builder，复用 `dshSpaceResourceFor` 的协议格式。若该运行形态不能把 builder 注入共享 MCP server，则在宿主 MCP 注册层包装结果；不得让共享 transport 依赖 DSH 包。
- 如增加 `space_review_open`，令它只接受可选的用户指定 `space:<docId>`，启动/确认宿主审阅 UI 后返回对应的单篇入口和状态；不提供搜索或枚举能力。先检查现有响应与宿主链接点击行为，只有无法满足“可打开”时才加工具。
- 未配置某宿主 provider 时不生成该宿主的伪链接；保持既有字段兼容。共享 MCP server 不依赖 Local Server 或 DSH 产品代码。
- 两端工具说明/Skill 都要求 Agent 在操作后提供当前宿主的打开入口，同时准确说明“建议待审，正文尚未改变”。

## 架构边界

- 链接生成属于 host/runtime 层；共享 transport 接收可选 provider。`review-core` 不生成 URL，也不因链接改变数据或权限行为。
- Local Server 负责将 `endpoint.url` 与文档 ID 组合为页面地址，并验证最终 URL 仍在自身 loopback origin 下。
- DSH 的 link builder 复用 adapter 的 `navigation.createDocumentLink` / `dshSpaceResourceFor`，打开由 `navigation.openDocument` 及已注册的 sidebar resource tab 处理。
- Local Server 的页面 URL 解析与文档定位属于共享 review UI，通过 adapter 初始值/导航回调或纯路由 helper 实现，避免共享 UI 假定 origin。DSH 不消费 HTTP query 参数；它通过 resource tab 的 `contentId` 恢复文档。
- 保持数据隔离、连接 admission、Host/Origin 校验、CSP、`no-store` 和仅 loopback 监听现状。文档 ID 查询参数不得绕过现有 HTTP admission。

## 实施步骤

1. 先在目标 DSH 版本验证：Agent 的 Markdown 回复是否允许 `cospace://` 链接，以及点击是否触发已注册的 DSH resource tab。记录可用能力和最低兼容版本；若不支持，确定引用卡片/插件动作这一宿主内 fallback。
2. 在共享 MCP 响应定义稳定的 `reference` 与可选宿主打开字段；增加可选 provider 回调，按操作涉及的文档 ID 构造 URL，缺少 provider 时不改变原有结果。
3. 在 Local Server runtime 增加安全的单篇 HTTP URL builder；共享 UI 处理 query 初始定位、刷新、前进/后退、非法/不存在 ID 和返回首页。
4. 在 DSH 装配层提供 DSH resource link builder，确保 MCP 最终结果中的入口可由 DSH 打开；如果 Agent 展示层不可点击，则实现并验收宿主内文档卡片或明确的插件打开动作。
5. 更新 Local Server 和 DSH 的 Skill/工具说明，要求 Agent 在结果中给出实际可用入口，并提醒建议仍需用户决策。
6. 只有当宿主不能可靠呈现现有响应入口时，才评估新增 `space_review_open` 工具；该工具只接受可选的用户指定 `space:<docId>`，启动/确认宿主 UI 并返回状态，不枚举文档。

不得修改 `packages/review-core/src/review-core.js`。本方案的实现应限于 runtime、transport、UI adapter 和文档/Skill。

## 验收

- Local Server 对含空格、Unicode、保留字符的合法文档 ID 生成的地址可正确打开且只定位对应文档；直接打开、刷新、前进/后退和返回首页均符合预期。
- DSH 对相同 ID 生成合法 `dsh-resource://space/<id>` 地址；在目标 DSH 版本中从 Agent 回复/工具结果点击后能打开右侧栏对应文档，或其经验证的宿主内 fallback 可用。
- Agent 工具创建文档、读取指定文档和提交建议后返回当前宿主对应的入口；未配置 provider 时保持原有响应形状。
- 无效/不存在 ID 给出明确反馈，不静默跳到另一篇文档。
- Agent 只能基于用户指定的文档 ID 操作，不能通过新链接能力枚举或选择其他文档。
- 地址不含敏感正文或授权信息；服务仅在 loopback，不能借由查询参数访问任意主机、路径或数据库文件。
- 用户打开建议链接后仍由用户接受或拒绝；Agent 只能通过现有工具查询决定状态。
- DSH 工具响应不包含失效的 Local Server URL；DSH sidebar resource tab、会话文档引用和 MCP 返回入口均按已验证的协议工作。

## 范围说明

此文档定义双宿主行为和验收标准。MCP 响应已开始附加 Local Server `reviewUrl` 或 DSH `documentLink`，Local Server UI 已支持 `?document=<id>` 直达和浏览器历史导航；DSH 客户端对 `dsh-resource://` Markdown 链接的实际点击验收仍需在目标 DSH 版本完成。
