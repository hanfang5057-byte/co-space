# 10 · WorkBuddy Connector 开发方案

> 调研基准：2026-11-23。本文根据 WorkBuddy 开放平台官方 Connector 文档、开发者公约及当前仓库实现整理，并持续记录实施与宿主验收状态。平台字段和审核规则可能变化；提审前应以开放平台最新文档和 Connector Meta 工具导出结果为准。Connector 已完成本机实现和 macOS WorkBuddy 验收，尚未提审或上架。

评论由用户复制短提示词、再由 Agent 通过工具读取和处理的跨宿主提案见[评论驱动修改方案](11-comment-driven-revision-plan.md)；本文中的评论能力边界描述当前实现。

## 结论

智联文档空间（CoSpace） 应接入 WorkBuddy 的 **MCP + Skill Connector**，使用 `stdio` 启动本机 Node MCP Server。WorkBuddy 官方 v5.0.0 起可为 stdio MCP 托管 Node.js runtime，因此用户无需预装 Node。Connector 只调用本机 SQLite-backed Space 核心，不需要 WorkBuddy OpenAPI、OAuth、云端账号或上传用户文档。

审阅决策仍由用户在本机浏览器完成。WorkBuddy 会结束工具调用对应的 MCP stdio 进程，因此审阅网页由独立的 WorkBuddy 专属本机 sidecar 提供；MCP 工具按需启动或复用该服务并返回 URL。macOS 使用当前用户 GUI 会话中的临时 launchd job，Linux 使用 `systemd --user` transient service，Windows 使用当前交互用户的临时计划任务；均不设置登录自启。Linux 缺少可用 user systemd 时明确报告本机审阅服务不可用，不退回不可靠的 detached 进程。Sidecar 仅绑定 `127.0.0.1`、使用随机端口和独立随机 token 保护健康检查。每次浏览器请求和 connector MCP 文档服务调用都会刷新 30 分钟滑动空闲期限；连续 30 分钟无活动才关闭并卸载。

## 平台能力与适配判断

| 官方开放能力 | 官方约束/能力 | 对 Space 的决定 |
| --- | --- | --- |
| Connector 接入形态 | 一个 Connector 在 MCP + Skill 与 CLI + Skill 中二选一；WorkBuddy 推荐 MCP 接入 API 服务或私有工具 | 采用 MCP + Skill；本项目没有现成 CLI，也不需要 CLI 的安装/认证编排 |
| MCP 传输 | 支持 HTTP、SSE、stdio；Connector 的 `mcp.json` 只能配置一个 Server | 用单个 stdio MCP Server；本机优先，离线可用 |
| Node runtime | Connector v5.0.0 起可声明 `{ "type": "node", "version": ... }`，WorkBuddy 自动准备 Node；registry 可用 WorkBuddy 内置默认值 | 包声明 Node 24+（与仓库 engines 一致），发布前确认运行时 semver 接受 `>=24`；不要求用户自行安装 Node |
| Skill | MCP 场景可选；标准工具 schema 已提供参数说明，Skill 可补充流程和安全规则 | 提供中英双语 Skill，约束“读取最新版本—逐条提建议—给审阅入口—按用户决策更新状态” |
| Connector 包 | `connector-meta.json`、`mcp.json`、图标、可选 Skills；Token 场景另需 `token-schema.json` | 市场包从构建产物生成；meta 中英文描述/示例齐全，不放密钥 |
| 认证 | 无需认证、省略 `auth_mode`；Token 表单适用于外部服务凭证；server-side OAuth 需要授权服务和 WorkBuddy 团队协作 | 不声明 `auth_mode`，因为首版只访问用户本机数据；不实现 OAuth 或 Token 表单 |
| 本机数据 | stdio 子进程与本机运行时得到官方支持；官方市场核对清单更偏向公网/稳定 MCP 服务 | 将本地 Connector 的审核/上架接受度作为早期验证项；材料如实披露本地文件访问和数据流 |
| 发布 | 入驻/资质认证、提交审核、审核通过后发布；更新要递增版本，重大变更需遵循审核规则 | 完成个人主体权限核实后按 Connector 审核流程提交；不将“可上传”表述为“保证上架” |
| OpenAPI / Buddy 应用 | 开放平台将 Buddy 应用、Connector、Skill 等作为不同资产类型；Connector 是 MCP/CLI 接入面 | 本方案不依赖 WorkBuddy OpenAPI 或 Buddy 应用。无已发现的 Connector 专用会话/对话 API，不做 WorkBuddy 内嵌审阅 UI |

### 能力边界

Connector 负责向 Agent 暴露受控的 Space 文档工具。它不是 WorkBuddy 内的面板插件，也不会读取或操作 WorkBuddy 对话数据库、账号资料、会话文件或 UI。WorkBuddy 的“连接器”是宿主加载 MCP 工具的产品能力；用户看到的市场 Connector 元数据与其底层 MCP Server 是两个不同层次。

首版提供文档和建议工作流。用户接受/拒绝建议的权力继续留在审阅 UI；Agent 不能代替用户接受建议，也不能直接覆盖已有正文。评论发送至当前 WorkBuddy 对话、会话引用卡片、WorkBuddy 用户身份作者信息均不属于首版。

## 现有代码映射

| 仓库路径 | 现状 | 方案中的用途 |
| --- | --- | --- |
| `packages/review-core/` | 已有 SpaceService、SQLite 持久化和事务语义 | 唯一领域写入路径；保持现有审阅行为 |
| `packages/transport-mcp/server.js` | 已有宿主无关 MCP 工具：列表、创建/读取文档、提交/查询建议 | 复用工具定义和说明；WorkBuddy 运行入口负责 stdio 生命周期 |
| `packages/transport-http/` | 已有宿主无关 HTTP handler | 由 WorkBuddy runtime 适配层绑定 API facade，保持同源请求契约 |
| `packages/review-ui/` | 已有审阅 UI 组件 | 嵌入 `apps/review-web` 的独立页面壳，补齐自动初始化状态、连接状态和待审入口 |
| `adapters/workbuddy/` | 仅有占位 README | 增加 runtime 入口、路径/生命周期适配、Connector 配置和 Skill 源文件 |
| `apps/review-web/` | 预留占位 | 实现独立审阅站点资源；由本机 HTTP 服务提供 |
| 根 `package.json` / 构建脚本 | 目前只包含 DSH 产品构建 | 新增 `build:workbuddy`、`pack:workbuddy`、`verify:workbuddy-package`，隔离输出至 `dist/workbuddy-connector/` |

不得手工改动 `packages/review-core/src/review-core.js` 的行为；新增宿主能力应通过既有 SpaceService、MCP/HTTP facade 和 runtime 装配完成。

## 目标结构与运行模型

```text
adapters/workbuddy/
  runtime/
    entry.js                 # stdio MCP 入口与 sidecar 生命周期协调
    review-daemon.js         # 独立 WorkBuddy 本机审阅服务、launchd 生命周期和空闲回收
    paths.js                 # 固定宿主默认数据目录与环境变量覆盖
    server.js                # loopback HTTP、端口选择与关闭
  connector/
    connector-meta.json      # 市场元信息
    mcp.json                 # 单个 stdio MCP Server；Node 托管声明
    icon.svg
    skills/space-review/SKILL.md
apps/review-web/             # 独立网页入口和静态资源
scripts/build-workbuddy.mjs  # 隔离打包和 Connector 文件校验
dist/workbuddy-connector/    # 生成物，不手工编辑
```

启动顺序：WorkBuddy 根据 `mcp.json` 启动 Node stdio 子进程 → runtime 自动解析并创建固定 Space（显示名“Space”）及 WorkBuddy 默认数据目录 → MCP Server 注册工具 → 用户请求审阅页时启动或复用独立 sidecar → sidecar 在自身进程中创建 SpaceService 和 loopback HTTP Server → 工具返回审阅 URL。整个流程无设置向导；MCP 和 sidecar 使用同一 WorkBuddy 专属 SQLite 数据库，通过现有事务/锁语义协调访问。sidecar 元数据和平台服务清单保存在 WorkBuddy 数据目录内，macOS/Linux 文件权限为当前用户可读写，Windows 任务仅使用当前交互用户和最低权限；各平台均不注册登录自启。健康检查使用随机 token；每次 MCP 文档工具调用与浏览器 HTTP 请求刷新 30 分钟滑动空闲期限；只开放 loopback，随机端口避免与 DSH 固定端口冲突。

HTTP 服务必须仅绑定 `127.0.0.1`（需要 IPv6 时同时验证 `::1`），使用操作系统分配端口，页面/API 同源。对浏览器写操作校验 Host/Origin、限制请求大小、设置 CSP 和 `no-store`，不允许任意文件路径、shell 或 SQLite 查询接口。审阅 URL 仅包含本机 origin、文档 ID 和必要 UI 定位，不含正文、评论、token 或长期授权信息。短期会话防护方案应在页面实现时根据浏览器启动流程确定。

审阅页可展示固定 Space 名称、服务连接状态和数据仅本机存储说明；默认数据目录可在关于/诊断信息中查看，但不要求用户确认或设置。停止 WorkBuddy 可能导致审阅页暂时离线。不能把“localhost”当作身份认证；页面服务关闭时显示明确离线状态而非伪装为最新内容。

### MCP 工具与响应

复用现有工具名、schema 和 Space 参考 ID 格式。审阅 URL 注入点采用 WorkBuddy runtime 的链接提供器/能力适配，不将端口或宿主环境判断写入 review-core。拟新增或扩展的宿主工具：

- `space_review_open`：返回文档审阅页 URL、当前服务状态和简短操作说明；没有目标文档时返回文档首页。Space 和默认目录已经自动初始化，不提供设置页。
- 文档创建、建议提交的响应可附 `reviewUrl`，让 Agent 在每次修改建议后提供直达审阅入口。
- `space_status`：提供服务版本、自动初始化状态和页面服务是否运行；不得向 Agent 不必要地暴露绝对数据路径。

如果实现上保持原公共 MCP tools 全宿主无关，则通过 WorkBuddy adapter 注册额外工具并包装现有响应；如果需要给 `transport-mcp` 增加可选 URL provider 参数，应确保 DSH 默认行为、现有响应兼容且不触及 review-core。无用户可见写操作由 Agent 直接执行；正文接受/拒绝始终由用户在审阅页发起。

Skill 流程须明确：

1. 从 `space:<docId>` 解析文档引用，只按 Space ID 读取，禁止将其当作文件路径。
2. 修改前读取最新 Markdown 和版本；独立变化拆成独立建议，offset/expected 与返回正文严格匹配。
3. 提交后说明“建议待审，正文尚未改变”，提供返回的 `reviewUrl`。
4. 用户在页面决策后，查询 suggestion status；只有状态明确为 accepted 才可称其已应用。
5. 冲突、过期、拒绝或服务离线时如实报告，不自行重试为不同写入，不直接写数据库/文件。

## 文件数据、安装与卸载

- **同设备安装 DSH 插件与 WorkBuddy Connector 是支持的场景，但数据必须完全隔离。** DSH 通过 `adapters/dsh/index.js` 的 `resolveHome()` 解析 `DSH_SPACE_HOME`、宿主 `dshHomePath('space')` 或 `$DSH_HOME/space`（通常为 `~/.dsh/space`）；WorkBuddy 固定使用独立的平台应用数据目录下的 `space/`（macOS/Linux 建议 `~/.workbuddy/space`）。WorkBuddy 不提供 `WORKBUDDY_SPACE_HOME`、目录选择或指向其他宿主的配置入口。DSH 保留既有 `DSH_SPACE_HOME`，但适配器必须拒绝把它解析到 WorkBuddy 保留目录。
- Space 名称固定为“Space”。数据目录自动采用 WorkBuddy 专属默认路径；实现时验证各平台目录约定。页面可展示目录，不提供设置向导。
- 不支持共享目录、共享数据库、跨宿主导入/迁移或自动发现另一宿主数据。WorkBuddy 不读取 DSH 环境变量、不扫描 DSH 目录；两边即使文档 ID 相同，也属于独立数据库且互不可见。
- WorkBuddy runtime 仅能访问自己的固定数据根。初始化时解析真实路径并拒绝符号链接逃逸、与 DSH 保留路径相同或数据库文件别名；建议使用宿主标记文件/目录所有者标识，拒绝打开带有另一宿主标记的目录。DSH adapter 对 `DSH_SPACE_HOME` 做同等所有权检查，防止把 DSH 写入 WorkBuddy 专属目录。不得通过“只是高级设置”保留共享路径入口。
- 两边默认 SQLite 文件不同，因此文档、建议、评论和 operation ID 完全隔离。WorkBuddy loopback 服务使用系统分配端口，不占用 DSH 插件服务器路由。SQLite 的 WAL、`synchronous=FULL`、5 秒 `busy_timeout` 和 `BEGIN IMMEDIATE` 仅在各自数据库内部生效，不构成跨宿主共享的支持理由。
- 数据库升级由共享核心执行。删除 Connector 不自动删除数据；导出/备份、恢复和卸载说明应随包提供。
- npm 包作为 `stdio` command 的分发载体，WorkBuddy 托管 Node runtime；用户不手动安装 Node、不手改 MCP 配置。构建 tarball/ZIP 时只打入 WorkBuddy runtime、共享核心/transports、网页静态产物、meta/mcp/icon/Skill 和运行依赖，不带 DSH 插件、Cordis 配置或 source maps。
- 在平台准入/审核未确认前，构建物可用于本地 stdio 配置与开发者自测；市场提交流程和消费者安装体验需在真实 WorkBuddy 开发者账号验证。

## 阶段计划与退出条件

### 阶段 0：宿主与平台最小验证

- [ ] 在当前 WorkBuddy 版本导入最小 Connector：Node stdio MCP、一个只读工具、一个 Skill。
- [ ] 验证 `runtime: { type: "node", version: ">=24" }` 与 `npx` 或包内启动命令、隔离依赖安装以及首次冷启动耗时。
- [ ] 验证 Connector 私有测试/个人主体提交和市场审核范围；区分“开发者可上传”和“公开上架可通过”。
- [ ] 验证 Connector 连接、断开、WorkBuddy 退出、会话切换时 stdio 进程生命周期和数据目录权限。
- [ ] 在同一设备同时运行 DSH 与 WorkBuddy：确认默认数据库文件不同、两个 MCP 入口独立、WorkBuddy 动态 loopback 端口不冲突；分别创建相同 ID 文档，确认两边互不可见。
- [ ] 负向验证目录隔离：将 DSH 覆盖路径设为 WorkBuddy 专属目录、将 WorkBuddy 固定目录改为符号链接、尝试数据库别名时，两边都必须拒绝启动且保留原数据。
- [x] 在 WorkBuddy 5.11.3 中验证 `http://127.0.0.1:<port>` 链接可见、浏览器可访问 loopback、MCP 工具调用结束后审阅服务仍运行；通过浏览器接受合成建议，并由 WorkBuddy MCP 回读到 `accepted` 状态。
- [ ] 等待 30 分钟无访问，确认 sidecar 关闭并卸载临时 launchd job。
- [ ] 验证一个 Connector 一个 MCP Server 的限制与当前完整 MCP 工具集兼容。

退出条件：写下实测 WorkBuddy 版本、命令配置、启动/停止生命周期、URL 打开结果、双宿主并行结果和市场范围/审核反馈。若浏览器无法访问 loopback，暂缓审阅网页闭环，保留独立 stdio MCP 文档能力并提出单独客户端启动备选方案。

### 阶段 1：Connector 包和运行时

- [x] 实现 WorkBuddy runtime 装配、数据目录初始化、服务状态，以及独立审阅 sidecar 的启动/复用/空闲回收。
- [x] 编写中英文 Connector meta、MCP stdio 配置、图标及中英 Skill。
- [x] 构建隔离 WorkBuddy 产物；验证 Connector 文件清单、Node 运行版本、依赖和单 MCP server 配置。
- [ ] 对照官方检查清单校验 `source` 全局唯一候选、版本、国际化描述和示例，使用 Connector Meta 工具复核导出格式。
- [x] 实现低权限 MCP 工具错误语义；不暴露任意文件、shell、WorkBuddy 对话或数据库操作。

退出条件：在 WorkBuddy 本地/测试安装中可加载全部工具；失败能显示可读错误；数据库重启后恢复；DSH 产物不受影响。

### 阶段 2：本机审阅网页

- [x] 实现独立审阅页外壳：自动初始化状态、数据目录说明、连接状态、待审首页和文档审阅入口；不提供 Space 名称/目录设置流程。
- [x] 绑定 WorkBuddy 专属 loopback HTTP/API，完成来源校验、请求大小限制、CSP 和服务关闭。
- [x] MCP 返回审阅链接；页面可重新读取服务状态，并在离线时清晰提示恢复 WorkBuddy 服务。
- [ ] 补齐并发冲突、用户拒绝和各平台宿主下保存后 Agent 状态回读的验收。

退出条件：新安装用户无需改配置即可从 WorkBuddy 完成“创建/修改建议—打开审阅—决策—回读结果”；离线/异常不会丢待审数据。

## WorkBuddy 真实宿主验收记录

- WorkBuddy 版本：5.11.3（macOS）；本地 MCP 配置 `cospace-review-local` 指向构建产物 `dist/workbuddy-connector/runtime-package/server.js`，包含本地 bundled Node runtime。
- 宿主结束 MCP 进程后会清理 MCP 子进程树；仅 `detached` 子进程不足以保持审阅页在线。macOS 版本现用当前用户 GUI bootstrap domain 的临时 launchd job 托管 sidecar，不启用登录自启。Linux systemd 与 Windows Task Scheduler 分支已实现，但尚未在各自宿主平台实测。
- WorkBuddy 工具调用返回 loopback URL；浏览器成功加载 `Space 文档审阅` 页面。用该页面接受 synthetic-only 建议后，WorkBuddy `space_document_read` 回读到文档 version 1、正文标记 `wb-connector-accepted`，`space_suggestion_list(status=all)` 回读到 suggestion 1 状态 `accepted`。
- `npm run build --prefix adapters/workbuddy`、`npm run verify --prefix adapters/workbuddy` 通过；`WORKBUDDY_LOOPBACK_TEST=1 node --test adapters/workbuddy/test/runtime.test.js` 在 macOS GUI session 权限下通过（1/1）。30 分钟滑动续期逻辑已实现；真实等待回收、Linux/Windows 宿主验收与公开市场审核仍未完成。

### 阶段 3：发布准备

- [ ] 按官方 Connector 提交清单检查包、功能、运行条件、依赖、数据用途、安全措施和测试方式。
- [ ] 以当前账号实际权限提交审核；记录反馈，整改后递增版本并重提。
- [ ] 审核通过后由开发者在平台发布；本文档/README 准确注明已发布版本和可见范围。
- [ ] 建立版本兼容矩阵、升级/回滚、数据库备份/恢复和卸载保留策略。

## 验收清单

### Agent 与审阅正确性

- [ ] `space:<id>`、Unicode、超长但合法文档、无效 ID 的处理稳定。
- [ ] 创建文档有幂等 `operationId`；对已有文档仅提交建议、不覆写正文。
- [ ] offset、expected、baseVersion 不匹配时返回明确冲突/无效错误。
- [ ] 建议提交时附审阅 URL；URL 无敏感数据且文档 ID 转义安全。
- [ ] 用户接受/拒绝后，Agent 查询得到同一状态；工具和 Skill 不诱导 Agent 越权决策。

### 运行、数据和安全

- [ ] WorkBuddy 管理的 Node 运行时冷启动、断开、重启和退出均已记录。
- [ ] 默认端口安全分配；端口冲突可恢复；HTTP 只监听 loopback。
- [ ] DSH 与 WorkBuddy 解析到不同且受所有权保护的数据目录和独立服务端口/路由；双宿主均运行不互相改变数据。
- [ ] 共享目录、共享数据库、跨宿主数据导入/迁移均不受支持；目录别名、符号链接逃逸及跨宿主路径配置会被拒绝。
- [ ] 跨站网页不能触发写操作；拒绝非预期 Host/Origin；响应不缓存；请求体有限。
- [ ] MCP stdout 只输出 MCP protocol frames；日志写 stderr，且不包含正文、评论、token 或完整本地敏感路径。
- [ ] 无外网时可操作已有本机空间；退出/杀进程后建议和决策可恢复。
- [ ] 用户数据目录可识别、可迁移且卸载不误删。

### Connector 分发

- [ ] 一个 Connector 元数据仅配置一个 MCP Server；Node runtime、命令/参数、超时字段经平台验证。
- [ ] meta 有中英文名称/描述/示例、唯一 `source`、SemVer 和与已用字段匹配的 `minWorkbuddyVersion`。
- [ ] 包无凭证、无 DSH 文件、无生成 source map，卸载说明不暗示会自动清除用户数据。
- [ ] WorkBuddy 加载、工具发现、Skill 注入、链接打开、工具结果、断开和重连经真实宿主验收。
- [ ] 市场审核、上架和受众可见范围只有在后台状态确认后才记为完成。

## 官方资料与依据

以下资料于 2026-11-23 查阅；版本/运营规则以平台实时页面为准。

1. [WorkBuddy 开放平台：连接器开发文档](https://open.workbuddy.cn/docs/connector) — Connector 形态、元数据、MCP/CLI、stdio Node runtime、Skill、认证、文件格式、检查清单和发布流程。
2. [WorkBuddy 开放平台概述](https://open.workbuddy.cn/docs) — 开发者入驻、资质、创建资产、审核与发布流程；Connector 与 Buddy 应用等为不同开放能力。
3. [WorkBuddy 开放平台开发者公约（试行）](https://open.workbuddy.cn/docs/developer-agreement) — 资产材料、主体资质、审核、名称/图标/描述和运营规范。

### 证据边界

- 官方 Connector 文档支持 stdio 和 WorkBuddy 托管 Node runtime，但未承诺其进程可在 Connector 工具空闲后持续托管浏览器审阅 HTTP 服务；阶段 0 实测决定最终启动模型。
- 官方文档讲的是 Connector 市场资产和 MCP/CLI 接入；没有在所查 Connector 规范中找到可供本 Connector 使用的 WorkBuddy 会话、消息、侧栏 UI 或对话 OpenAPI。因此不把其他类型资产或 WorkBuddy 内部能力推断为 Connector API。
- 官方通用 MCP 清单要求远程 MCP 可稳定访问；本项目选择本机 stdio，与该远程服务项不完全同类，须向平台确认本地文件型 Connector 的审核与市场发布范围。
- 本机 HTTP 审阅页、浏览器链接呈现、开发者账号具体权限和 Connector 审核结果都不是公开规范保证的行为，不能仅凭文档宣布通过。
