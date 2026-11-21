# DSH Space 方案（定稿）

> 基于 Syncthing 的、Agent 友好的 P2P 共享空间 DSH 插件
>
> **协同模型：方案 A —— 文件级异步协同**
>
> UI 设计：[UI-DESIGN.md](UI-DESIGN.md)
>
> 版本：v1.0 · 日期：2026-11-21 · 状态：方案定稿，待实施

---

## 0. 摘要与决策

DSH Space 把本地文件夹变成可邀请他人、跨设备 P2P 同步的“空间”，并通过 MCP 工具让 Agent 创建、读取、编辑三类开放文本内容：

| 类型 | 存储 | 库 |
|---|---|---|
| 文档 | Markdown `.md` | `markdown-it` + `gray-matter` |
| 表格 | CSV `.csv` | `csv-parse` / `csv-stringify` |
| 幻灯片 | Marp Markdown `.md` | `@marp-team/marp-core` |

Syncthing 负责文件同步；MCP Server 是能力边界；DSH 插件负责挂载与 UI。没有中心服务器，不使用 MS Office 格式存储，不做实时协同。

**一页决策表**

| 维度 | 决策 | 主要理由 |
|---|---|---|
| 协同 | 文件级异步 + 冲突文件 + 文本合并 | 与文件系统/开放文本一致；无需额外服务；覆盖大多数多人先后编辑 |
| 同步 | Syncthing sidecar + REST API | 成熟、NAT 穿透、TLS、冲突文件、跨平台；不嵌入 Go |
| 存储 | Markdown / CSV / Marp | Agent 可读写、可 diff、可合并、可长期维护 |
| 表格 | CSV 默认；ODS Phase 2 | CSV 通用、纯文本；ODS 补公式/多 Sheet |
| 接入 | 独立 stdio MCP Server + `mcpManager.register()` | 可被 DSH 和其他 MCP 客户端复用；生命周期跟随插件 |
| 发现 | on-demand tool loading | 工具较多，避免每轮 prompt 膨胀 |
| 信息架构 | Space → Page 树 + 模板 + 空间上下文 | 借鉴 Codex Spaces，但不复制其重协同能力 |
| 权限 | 设备级邀请；同空间全量读写 | Syncthing 无页级 ACL；不做伪权限 |
| 平台 | 首期 Linux only | 平台差异只在 Syncthing 二进制与进程/文件写入 |
| 导入/导出 | 不导入 MS Office、不导出 MS Office/PDF | 保持开放文本闭环；附件仅作为素材；ODS 是 Phase 2 存储选项 |
| 主题 | 1 套 `dsh` | 减少设计面，后续可定制 |
| 交付 | M1 = MCP 工具 + 最小 UI；M3 = 完整 UI | 没有 UI 无法真实验证创建、预览、邀请、同步 |

---

## 1. 目标与非目标

**目标**

1. **创建空间**：命名、初始化目录、生成本机设备身份，可邀请他人加入。
2. **添加内容**：创建文档、表格、幻灯片，并能读取、局部编辑、删除、移动。
3. **Agent 友好**：工具有界、输出稳定、可增量编辑、能感知同步与冲突。
4. **P2P 同步**：空间内文件在多设备间自动同步，无中心服务器。
5. **开放格式**：空间内容不锁定在 MS Office 或某个 SaaS。

**非目标（本轮明确不做）**

- 实时多人协同（CRDT/OT）：采用方案 A，不做 Google Docs 式同时编辑。
- 页级 View/Comment/Edit 权限与继承：Syncthing 无法强制，且会造成错误安全感。
- docx/xlsx/pptx 的导入与格式转换；MS Office/PDF 导出（ODS 作为 Phase 2 开放格式存储，不属于导出）。
- 块级 WYSIWYG 编辑器、可视化组件、Sites、常驻 Agent（Dots）。
- 移动端 App、云端托管、组织/租户/审计后台。
- macOS/Windows 首期支持（接口保留，后续补）。

**需求 → 设计映射**

| 需求 | 设计 |
|---|---|
| 创建空间 | 一个 Syncthing folder + `.space.json` + `space_create` |
| 添加文档 | Markdown `.md` + `doc_create`/`file_edit` + `markdown-it` |
| 添加表格 | CSV `.csv` + `sheet_create`/`sheet_update` + `csv-parse` |
| 添加幻灯片 | Marp `.md` + `slides_create`/`slides_update` + `marp-core` |
| Agent 友好 | MCP 工具 + `space_context` + on-demand + 有界输出 + 稳定错误码 |
| P2P 同步 | Syncthing sidecar + REST + 冲突文件 + `space_wait_sync` |
| 邀请他人 | 设备级 invite/join/approve + 空间级信任 |
| 开放格式 | Markdown/CSV/Marp；无 MS Office 存储 |
| 组织内容 | Page 树 + Space Home + 模板 |
| 可见性 | M1 最小 UI（列表/详情/预览/邀请/同步）+ M3 完整 UI；通过 Host WebServer API 取数 |

这些边界的共同原因是：**先把“开放文本 + 文件级同步 + Agent 工具”做扎实**，避免为了对标完整办公套件而引入第二套状态源（CRDT 服务、中心数据库、权限服务）。

---

## 2. 设计思路

### 2.1 空间是同步文件夹，不是数据库

- 一个空间 = 一个 Syncthing Folder；Syncthing 的 folder 配置 + 磁盘文件就是状态。
- 空间元数据只保留最小的 `.space.json`；不建中心数据库、不做内容索引服务。
- 好处：可移植、可直接备份、可用任意编辑器打开、出问题可用文件系统恢复。
- 代价：列表/搜索靠文件系统扫描；大空间需要分页与缓存。

为什么不是自研 P2P 或 git：

- 自研 WebRTC/libp2p 同步：NAT、加密、冲突、移动端都要重做；Syncthing 已经成熟。
- git：适合历史，不适合实时/自动同步；冲突处理对普通用户过重。
- rclone/云盘：需要中心账号，且不是 P2P。

### 2.2 只存开放文本

- 文档 = Markdown；表格 = CSV；幻灯片 = Marp Markdown。
- 好处：
  - Agent 可直接读、写、diff、patch，不需要解析 OOXML；
  - 冲突文件可读，可用 diff3 合并；
  - 文件小、同步快、git 友好；
  - 渲染器全部开源，长期可维护。
- 代价：
  - 无法 100% 复刻 Word/Excel/PowerPoint 的排版；
  - CSV 没有公式/多 Sheet/样式；
  - 幻灯片受 Marp 主题能力限制。
- 取舍：表格能力用 **ODS（Phase 2）** 补齐；版式限制作为接受的取舍，不回到 MS Office 存储。

### 2.3 协同采用方案 A：文件级异步

```text
编辑/Agent → Markdown/CSV/Marp 文件 → Syncthing → 其他设备
                                      └→ .sync-conflict-* → 工具/人工合并
```

- 人类与 Agent 都是编辑者：支持多人先后编辑、离线编辑、跨设备同步；不支持同屏实时看到彼此光标。
- Syncthing 负责传输与冲突文件生成；我们负责冲突检测、展示、解决。
- 文本格式让冲突可读：Markdown 可以用 diff3/2-way merge；CSV 由 Agent 或用户显式选择。
- 写入端用 `expectedSha256` 与 `file_edit` 降低覆盖概率。
- 不引入 CRDT：
  - CRDT 需要额外的传输/持久化/编辑器绑定，会把“文件”变成派生品；
  - 实时协同与“文件即事实来源”冲突；
  - 大多数“多人协作”是异步的，文件级 + 冲突解决已足够。
- 备选引擎的调研存档在 [`research/2026-11-21-collaboration-engines.md`](research/2026-11-21-collaboration-engines.md)，**当前不采用**。

**为什么不用 git 作为同步底座**

git 能提供三方合并与历史，但它不是这个场景的同步层：

- `.git` 不能交给 Syncthing 同步：refs/index/logs 是并发写入的热点，两个设备同时提交会产生 `.git` 内部冲突，严重时仓库损坏。
- git 没有 P2P 传输：需要一个远端（GitHub/Gitea/一台常开设备）或 bundle 交换；这会把“无中心”变成“有中心”。
- git 不解决 CSV/二进制的合并：行级 merge 对插删行很脆弱，二进制附件完全不可合并。
- 提交/推送/拉取对普通用户和 Agent 都是额外工作流，不适合作为默认路径。

**采用 git 的核心收益，而不引入 git 仓库**：维护本地“基线快照”，用三方合并处理冲突（见 6.4）。

### 2.4 MCP 是能力边界，DSH 是宿主

- 能力实现为独立 MCP Server（stdio），可被 DSH、Claude Desktop、Codex 或其他 MCP 客户端复用。
- DSH 插件只负责：解析本机路径、把 Server 注册给 `mcpManager`、承载 UI。
- 为什么不用 DSH 原生工具直接实现：MCP 提供稳定协议边界，便于独立测试、跨客户端复用；DSH 侧仍通过 `mcp__space__*` 获得原生体验。
- 为什么用 `mcpManager.register()` 而不是静态配置：Server 路径/环境随插件安装位置变化，注册式生命周期更可靠；卸载插件即撤下工具。

### 2.5 借鉴 Codex Spaces 的信息架构

Codex Spaces 的核心是“人和 Agent 围绕 Page 工作”：Space 容器、Page 树/子页面、模板、Space Home、共享上下文、局部编辑、评论、视图。我们采用其**信息架构**，不复制其重协同与权限模型：

| 采用 | 落地 |
|---|---|
| Space → Page 树 | `pages/` + 子页面目录；`space_tree` 返回树 |
| Space Home | 可选：用户自己创建 `README.md` 或第一个页面；M1 不预置 |
| 模板 | 文档/表格/幻灯片内置内容模板 |
| 空间上下文 | `space_context` 返回说明 + 页面树 + 最近修改 + 冲突 |
| 视图 | `space_list` 的 `all/owned/shared`；UI 的 All/My/Shared/Recent（M3 加 Trash） |
| 局部编辑 | `file_edit` old/new + `expectedSha256` |
| “Chat about this” | M3 从页面创建带上下文的 DSH 会话 |
| 评论 | M4；MVP 先用对话修改 |

| 不采用 | 原因 |
|---|---|
| 实时多人编辑 | 方案 A；文件级同步，不做 CRDT |
| 页级权限/继承 | Syncthing 无 ACL；加入空间即全量读写 |
| 连接数据源 / Live Pages | 需要 OAuth、外部 API、持续刷新，超出范围 |
| 块级 WYSIWYG / 可视化 / Sites / Dots | 工作量大，且会破坏纯文本存储 |

### 2.6 关键取舍

| 选择 | 放弃 | 原因 |
|---|---|---|
| Markdown/CSV/Marp 存储 | docx/xlsx/pptx | 二进制、Agent 不可直接读、diff/merge 差、库重 |
| Syncthing sidecar | 自研 WebRTC/libp2p、git、rclone | 成熟、NAT 穿透、TLS、冲突文件；无需重做传输层 |
| 文件级异步协同 | CRDT/OT 实时协同 | 保持文件为事实来源；无需第二套服务/状态；多数协作是异步的 |
| CSV 默认 | ODS 默认 | CSV 纯文本、通用、Agent 友好；ODS 补公式/多 Sheet（Phase 2） |
| Marp | Slidev / reveal.js | Node 内可渲染、Markdown 存储、依赖轻；Slidev 需 Vite，reveal 存 HTML |
| Page 树 + 模板 | 扁平文件列表 | 借鉴 Codex Spaces，便于组织项目/会议/研究；对 Agent 仍是普通路径 |
| 文件系统为状态 | 中心数据库/索引 | 可移植、可恢复、无额外服务；列表靠扫描+缓存 |
| MCP Server | DSH 私有工具实现 | 协议边界清晰、可跨客户端复用、可独立测试 |
| Linux only | 同时支持 macOS/Windows | 先交付；平台差异隔离在 3 个模块，后续补 |

---

## 3. 总体架构

```text
┌───────────────────────── DSH Host ─────────────────────────┐
│  Agent ── mcp__space__* ── dsh-mcp-client ──stdio──┐        │
│                                                    ▼        │
│  dsh-space Host Plugin ──register('space')──▶ MCP Server    │
│       │                                          │          │
│       └── UI (Phase 2)                           │ REST     │
└──────────────────────────────────────────────────┼──────────┘
                                                   ▼
                                     Syncthing daemon (sidecar)
                                       │                 │
                                  spaces/*.folder    P2P TLS/relay
                                       │                 │
                                  本机文件          其他设备
```

**组件职责**

| 组件 | 职责 |
|---|---|
| MCP Server | 空间/文件/格式/同步状态/冲突；唯一能力实现 |
| Host Plugin | 定位 `$DSH_HOME/space`、注册 MCP Server、提供 UI HTTP API |
| Syncthing | 文件传输、设备连接、冲突文件、版本目录 |
| DSH mcp-client | 把 MCP 工具映射为 `mcp__space__*`，按需加载 |
| DSH Web UI | Space 列表、Page 树、预览、邀请、冲突（M3） |

**关键数据流**

- 创建：`space_create` → 建目录/元数据 → `POST /rest/config/folders` → scan。
- 编辑：`file_edit`/`doc_*` → 校验路径/哈希 → 原子写 → scan。
- 同步：Syncthing fs watcher → 对端 → `.sync-conflict-*`（如有）。
- 加入：invite token → 加设备 → 建 folder → 创建者批准。
- Agent 进入：`space_context` → 选页面 → `file_read`/`doc_*`。

---

## 4. 内容格式与库

### 4.1 文档：Markdown

```markdown
---
type: document
title: Q3 复盘
created: 2026-11-21T10:00:00+08:00
updated: 2026-11-21T10:30:00+08:00
tags: [q3, review]
---

# Q3 复盘

正文使用 CommonMark + GFM（表格、任务列表、删除线、自动链接）。
图片放 `assets/`，使用相对路径引用。
```

- 能力：创建、追加、按标题读取、字符串替换、outline、HTML 预览。
- 解析/渲染：`markdown-it`（GFM 插件按需）+ `gray-matter`；预览前 `sanitize-html`。
- 不存 HTML 源；HTML 只是渲染结果。

### 4.2 表格：CSV（默认），ODS（Phase 2）

- UTF-8、逗号分隔、RFC 4180、`\n` 换行；第一行默认表头。
- 一个 `.csv` = 一张表；多表用多个文件，或 Phase 2 的 `.ods` 工作簿。
- `=SUM(...)` 按文本保存，不计算公式；真实公式/多 Sheet/格式用 ODS。
- 能力：创建（2D/对象数组）、读取（类型推断/分页）、追加、按 A1 区域更新。
- 库：`csv-parse` / `csv-stringify`。
- ODS Phase 2：ISO/IEC 26300 开放标准；当前 Node 端 ODS writer 会丢公式/样式，届时候选 LibreOffice 转换或自研 writer。`.xlsx` 不进入存储。

### 4.3 幻灯片：Marp Markdown

```markdown
---
marp: true
theme: dsh
paginate: true
title: Q3 复盘
---

# Q3 复盘
DSH Space · 2026 Q3

---

## 关键指标
- 收入 **¥1.2M**，环比 +12%
- 客户数 340

<!-- 演讲者备注：强调增长来自新客户 -->
```

- `.md` + `marp: true`（或 `*.slides.md`）识别为幻灯片；`---` 分页；HTML 注释是备注。
- 库：`@marp-team/marp-core`（Node 内渲染 HTML/CSS，无浏览器）。
- 只提供 1 套 `dsh` 主题（浅色、中文字体栈）；不做导出。
- 取舍：不能自由拖拽/复杂动画；换来可读、可 diff、可批量生成。

### 4.4 Page 树与模板

```text
pages/
├── project-overview.md           # 页面
├── project-overview/            # 子页面
│   ├── meeting-notes.md
│   └── research.md
└── launch-plan.md
```

- 页面 ID = 去掉 `.md` 的相对路径。
- 子页面目录与父页面同名；不强制，但工具默认遵守。
- 文档与幻灯片都可以在 `pages/`；`kind` 由 frontmatter/扩展名判定。
- 内容模板：

| 类型 | 模板 |
|---|---|
| 文档 | `blank`、`project-brief`、`meeting-notes`、`decision-log` |
| 表格 | `blank`、`tracker`、`budget` |
| 幻灯片 | `blank`、`review`、`pitch` |

默认路径（`path` 省略时由标题生成 slug）：

| 工具 | 默认路径 |
|---|---|
| `doc_create` | `pages/<slug>.md`；有 `parent` 时 `pages/<parent>/<slug>.md` |
| `slides_create` | `pages/<slug>.slides.md`；有 `parent` 时同上 |
| `sheet_create` | `sheets/<slug>.csv` |

模板只提供内容骨架，不引入第二套视觉主题。

### 4.5 附件与格式边界

- `file_import` 仅用于图片/PDF/压缩包等附件素材，放 `assets/`/`files/`；不解析、不转换。
- `file_read` 对非文本附件返回 `UNSUPPORTED_FORMAT`。
- 不做 MS Office 导入/导出；空间内预览由 Markdown/Marp 渲染提供。

---

## 5. 空间模型

```text
$DSH_HOME/space/                    # DSH_SPACE_HOME 可覆盖
├── config.json                     # 本机配置
├── runtime.json                    # daemon pid/port/apiKey，0600
├── bin/                            # 缓存的 Syncthing 二进制
├── daemon/                         # Syncthing home
├── logs/
├── trash/                          # 删除的空间
└── spaces/
    └── q3-review-7f3a/
        ├── .space.json
        └── .stignore
        # 其余目录由用户/首次写入按需创建：
        # pages/ sheets/ assets/ files/
```

**`.space.json`**

```json
{
  "schema": 1,
  "id": "q3-review-7f3a",
  "name": "Q3 复盘",
  "description": "Q3 经营分析与下季度计划",
  "createdAt": "2026-11-21T10:00:00+08:00",
  "createdBy": "<device-id>",
  "homePage": null,
  "format": "open-text"
}
```

- `createdBy` 与本地设备 ID 比较，用于 `owned`/`shared` 过滤。
- `.stignore`：`.stfolder`、`.stversions`、`.space/`、`*.tmp`、`~$*`、`.DS_Store`、`Thumbs.db`。
- `.space/` 仅本地缓存，不参与同步。
- 空间 ID：slug + 4 位随机后缀；Syncthing folder ID 与空间 ID 相同；label 可为任意 Unicode。
- 新建空间只创建根目录和隐藏元数据；不预置 `README.md`，也不预置 `pages/`/`sheets/`/`assets/`/`files/` 目录，首次写入时按需创建。

**本机配置 `config.json`**

```json
{
  "spacesRoot": "",
  "syncthing": {
    "binary": "",
    "version": "v2.1.7",
    "guiPort": 0,
    "syncPort": 22000,
    "downloadMirror": ""
  },
  "createPersonalSpace": true,
  "limits": {
    "maxFileBytes": 52428800,
    "maxTextBytes": 2097152,
    "maxCsvRows": 1000
  }
}
```

- `spacesRoot` 为空时使用 `$DSH_HOME/space/spaces`。
- `guiPort: 0` 表示自动选空闲端口；实际值写入 `runtime.json`。
- 环境变量可覆盖关键项：`DSH_SPACE_HOME`、`DSH_SPACE_SYNCTHING_BIN`。

**类型判定**

| 判定 | 类型 |
|---|---|
| `pages/` 下 `.md` + `marp: true` 或 `*.slides.md` | slides |
| `pages/` 下其他 `.md` | document |
| `sheets/` 下 `.csv` / `.tsv` | table |
| `.ods`（Phase 2） | workbook |
| `assets/`/`files/` 下图片 | image |
| 其他 | file |

**删除语义**

- `space_delete`：本机移入 `trash/` 并移除本机 folder；**不影响其他设备副本**。
- 页面删除：MVP 直接删除；M4 再评估页面级回收站（是否跨设备同步另行设计）。
- 移除成员：停止后续同步，不擦除对方已有数据。

---

## 6. P2P 同步与成员机制

### 6.1 守护进程

- 每台设备一个 Syncthing 实例，多空间 = 多 folder。
- 首次使用：
  1. `DSH_SPACE_SYNCTHING_BIN`；
  2. PATH 中的 `syncthing`；
  3. 下载官方 Release 固定版本（默认 v2.1.7），校验 SHA-256，缓存到 `bin/`。
- `syncthing generate` 生成配置/证书/API key；启动前把 GUI 地址改为 `127.0.0.1:<free-port>`，写入随机 API key（0600）。
- 启动：

```bash
syncthing serve --home "$DSH_HOME/space/daemon" \
  --no-browser --no-restart --no-upgrade \
  --log-file "$DSH_HOME/space/logs/syncthing.log" --log-level WARN
```

- 启动后通过 REST 配置：关闭 auto-upgrade/crash/usage report；设置监听端口（默认 22000，冲突时选空闲）；保留 global discovery/relay，允许关闭。
- 进程 detached，DSH 重启后复用；`space_daemon` 提供 start/status/stop/restart。
- 健康检查：`GET /rest/noauth/health`；业务调用带 `X-Api-Key`。
- `runtime.json` + `runtime.lock` 防止并发启动。
- M1 不自动创建 `Personal`；首次打开 Spaces 为空态，由用户创建。
- 首期 Linux；二进制/进程差异收敛在 `platform/daemon`。

### 6.2 空间创建

1. 生成 ID，只创建空间根目录，写 `.space.json`/`.stignore`；不预置内容目录和 README，首次写入时再创建对应父目录。
2. `POST /rest/config/folders`：

```json
{
  "id": "q3-review-7f3a",
  "label": "Q3 复盘",
  "path": ".../spaces/q3-review-7f3a",
  "type": "sendreceive",
  "devices": [{ "deviceID": "<local>" }],
  "fsWatcherEnabled": true,
  "rescanIntervalS": 3600,
  "versioning": {
    "type": "staggered",
    "params": { "cleanupIntervalS": "3600", "maxAgeS": "2592000" }
  }
}
```

3. scan。

### 6.3 邀请、加入、批准

Syncthing 要求双方互加设备并共享 folder；邀请对象是**对方的设备**（Device ID），没有账号体系。

```text
A 创建者                          B 加入者
space_invite → token
  {spaceId, name, deviceId(A), createdAt}
                 ───────────────▶ space_join(token)
                                     - 校验 token
                                     - 添加 A 为设备
                                     - 创建同 ID folder（含 A）与标准目录
                                     - 返回 B 的 deviceId
                 ◀───────────────
space_approve_member {deviceId(B)}
  - 添加 B 为设备
  - 将 B 加入 folder.devices
                                     - 同步开始
```

- B 用 token 中的 `spaceName`/`createdAt` 初始化本地 `.space.json`，与 A 的元数据保持一致；同步后以文件为准。
- 批准前没有文件数据交换。邀请 token 泄露不等于可写入：仍需创建者批准设备。
- 设备 ID 用 `GET /rest/svc/deviceid?id=...` 校验，非法 ID 直接拒绝。
- A 也可以先拿到 B 的 Device ID 先批准，B 再加入；两种顺序都支持。
- `space_members` 返回：已共享设备、pending devices、pending folders。
- 成员别名：`space_approve_member` 可传 `name`，仅本地展示。
- **无页级权限**：加入即全量读写；UI/文档明确“只邀请可信设备/同事”。

### 6.4 冲突与合并

**基线快照**

- 每个空间维护 `.space/base/<path>`，保存“最后一次成功同步后”的文件内容；`.space/` 不参与同步，只在本机。只对 Markdown/CSV/Marp 文本文件维护，二进制附件跳过，避免磁盘翻倍。
- `space_wait_sync` 到达 idle 且无冲突时，更新对应文件的基线。
- 基线用于三方合并，弥补 Syncthing 冲突文件没有共同祖先的问题。

**冲突处理**

- Syncthing 生成 `name.sync-conflict-YYYYMMDD-HHMMSS-<device>.ext`。
- `file_conflicts` 返回：原文件、冲突文件、基线文件、时间、设备。
- `file_resolve_conflict`：
  - `keep-local` / `keep-conflict`：选择一方；
  - `merge`：用 `node-diff3` 对 base/local/conflict 做三方合并；`node` 版本只接受无冲突的自动合并，存在冲突块时返回 `merge-conflicts` 与标记文本，由 Agent/用户决定。
- Markdown 三方合并效果好；CSV 仍不自动行合并（插删行会错位），必须显式选择或由 Agent 读取三方后重写。
- 写入端：`file_edit` old/new；整文件写 `expectedSha256`；写后 scan，`space_wait_sync` 等待并更新基线。

**可选：本地 git 历史（不参与同步）**

- 如果团队需要 blame/分支/提交历史，可在空间内 `git init`，并把 `.git/` 加入 `.stignore`；每个设备有独立历史，不通过 Syncthing 共享。
- 这不会自动获得跨设备合并；跨设备仍走“基线 + 冲突文件 + 三方合并”。
- 默认不启用，避免给非开发用户增加提交负担。

### 6.5 同步状态

`space_sync_status` 聚合：

- `/rest/db/status`：state/needFiles/needBytes/inSyncFiles；
- `/rest/db/completion`：每个 peer 完成度/remoteState；
- `/rest/system/connections`：连接状态；
- 冲突文件数。

```json
{
  "space": "q3-review-7f3a",
  "state": "idle",
  "needFiles": 0,
  "conflicts": 0,
  "peers": [
    { "deviceId": "…", "name": "MacBook", "connected": true, "completion": 100, "remoteState": "valid" }
  ]
}
```

`space_wait_sync` 轮询到 idle 或超时，超时返回状态而非报错。

---

## 7. MCP 工具面

### 7.1 设计约束

- Server 名 `space`；DSH 工具名 `mcp__space__*`。
- `toolLoading: on-demand`；Agent 按需加载。
- 输入 zod schema；输出 `content` + `structuredContent`；稳定错误码。
- `space` 接受 ID 或名称；重名报歧义。
- 路径使用相对 POSIX 路径；拒绝绝对路径、`..`、NUL、盘符；限制深度/长度。

### 7.2 工具清单

| 分组 | 工具 | 作用 |
|---|---|---|
| 空间 | `space_list` | 列表；`filter=all/owned/shared` |
| 空间 | `space_create` | 创建空间 |
| 空间 | `space_get` | 详情；可选页面树 |
| 空间 | `space_tree` | Page/Sheet/附件树 |
| 空间 | `space_context` | Agent 上下文包 |
| 空间 | `space_update` | 改名/描述 |
| 空间 | `space_delete` | 本机回收站 + 移除 folder |
| 成员 | `space_invite` | 生成邀请 token |
| 成员 | `space_join` | 加入空间 |
| 成员 | `space_members` | 成员/待批准 |
| 成员 | `space_approve_member` | 批准设备 |
| 成员 | `space_remove_member` | 移除设备 |
| 同步 | `space_sync_status` | 同步状态 |
| 同步 | `space_wait_sync` | 等待同步 |
| 同步 | `space_rescan` | 触发扫描 |
| 文件 | `file_list` | 列目录 |
| 文件 | `file_read` | 读文本/大纲 |
| 文件 | `file_write` | 整文件写 |
| 文件 | `file_edit` | 字符串替换 |
| 文件 | `file_move` | 移动/改名 |
| 文件 | `file_delete` | 删除 |
| 文件 | `file_import` | 导入附件素材 |
| 文件 | `file_outline` | 结构大纲 |
| 文件 | `file_conflicts` | 冲突列表 |
| 文件 | `file_resolve_conflict` | 解决冲突 |
| 文档 | `doc_create` | 创建 Markdown |
| 文档 | `doc_append` | 追加 |
| 表格 | `sheet_create` | 创建 CSV |
| 表格 | `sheet_read` | 读表格 JSON |
| 表格 | `sheet_update` | 按区域更新 |
| 幻灯片 | `slides_create` | 创建 Marp |
| 幻灯片 | `slides_read` | 读幻灯片/备注 |
| 幻灯片 | `slides_update` | 替换/追加页 |
| 守护 | `space_daemon` | 进程管理 |

### 7.3 关键输入

**`space_context`**

```json
{ "space": "q3-review", "maxChars": 8000 }
```

返回结构：

```json
{
  "space": { "id": "q3-review-7f3a", "name": "Q3 复盘", "description": "…" },
  "home": { "path": null, "excerpt": "" },
  "tree": [
    { "path": "pages/project-overview.md", "kind": "document", "title": "项目概览", "children": [] }
  ],
  "recent": [{ "path": "pages/…", "kind": "document", "mtime": "…" }],
  "conflicts": [{ "path": "pages/report.md", "conflictPath": "pages/report.sync-conflict-….md" }],
  "truncated": false
}
```

**`doc_create`**

```json
{
  "space": "q3-review",
  "parent": "pages",
  "title": "Q3 复盘",
  "template": "project-brief",
  "markdown": "# 结论\n\n收入环比 +12%。"
}
```

**`sheet_create`**

```json
{
  "space": "q3-review",
  "path": "sheets/data.csv",
  "template": "tracker",
  "columns": [
    { "key": "month", "title": "月份" },
    { "key": "revenue", "title": "收入", "type": "number" }
  ],
  "rows": [
    { "month": "1月", "revenue": 100000 },
    { "month": "2月", "revenue": 112000 }
  ]
}
```

**`slides_create`**

```json
{
  "space": "q3-review",
  "parent": "pages",
  "title": "Q3 Review",
  "template": "review",
  "slides": [
    { "layout": "title", "title": "Q3 复盘", "subtitle": "2026 · DSH Space" },
    { "layout": "bullets", "title": "关键指标", "bullets": ["收入 ¥1.2M", "客户数 340"], "notes": "强调新客户贡献" }
  ]
}
```

**`file_edit`**

```json
{
  "space": "q3-review",
  "path": "pages/report.md",
  "expectedSha256": "…",
  "edits": [{ "oldText": "收入环比 +12%", "newText": "收入环比 +15%" }]
}
```

### 7.4 错误码

| code | 含义 |
|---|---|
| `SPACE_NOT_FOUND` / `SPACE_AMBIGUOUS` | 空间不存在/名称歧义 |
| `PATH_INVALID` | 路径越界或非法 |
| `FILE_NOT_FOUND` / `FILE_EXISTS` | 文件不存在/已存在 |
| `VERSION_CONFLICT` | `expectedSha256` 不匹配 |
| `EDIT_NOT_APPLIED` | oldText 未唯一匹配 |
| `UNSUPPORTED_FORMAT` | 非文本附件 |
| `SYNC_UNAVAILABLE` / `SYNC_TIMEOUT` | daemon 不可用/等待超时 |
| `LIMIT_EXCEEDED` | 超出大小/行数/页数 |

### 7.5 Server Instructions

```text
Spaces are local folders synchronized by Syncthing between trusted devices.
Native content is open text:
- Documents: Markdown .md
- Tables: CSV .csv
- Presentations: Marp Markdown .md with "marp: true"

Prefer file_edit for small changes; pass expectedSha256 when overwriting.
After writes, use space_wait_sync to confirm peers received them.
If file_conflicts reports entries, resolve them before further edits.
Never store secrets in a space; any approved member can read every file.
```

---

## 8. Agent 工作流

**进入空间**

1. `space_context` 拿空间说明、页面树、最近修改、冲突。
2. 需要结构时 `space_tree`/`file_outline`；需要内容时 `file_read`。
3. 不要盲目 `file_list` 全量扫描。

**创建内容**

- 文档：`doc_create`（template + markdown）。
- 表格：`sheet_create`（columns/rows + template）。
- 幻灯片：`slides_create`（slides + template）。
- 子页面：`parent` 指向父页面路径。

**修改内容**

- 小改：`file_edit` old/new，带 `expectedSha256`。
- 大改：`file_write` 整文件，带 `expectedSha256`。
- 写后：`space_wait_sync`；有冲突先 `file_conflicts`/`file_resolve_conflict`。

**典型流程**

```text
space_create {name:"Q3 复盘"}
space_context
doc_create {parent:"pages", title:"项目概览", template:"project-brief"}
doc_create {parent:"pages/project-overview", title:"会议纪要", template:"meeting-notes"}
sheet_create {path:"sheets/budget.csv", template:"budget"}
slides_create {parent:"pages", title:"Q3 Review", template:"review"}
space_wait_sync
space_invite → 把 token 给对方
```

**有界输出**

- `file_read` 默认 ≤20k 字符，超出返回 `truncated`/`outline`/`offset`。
- `sheet_read` 分页；`space_tree` 深度限制。
- 所有读取返回 `sha256`/`mtime`/`bytes`。

---

## 9. DSH 插件集成

### 9.1 Bundle 结构

```text
dsh-space/
├── package.json
├── cordis.patch.yml
├── index.js                  # Host plugin
├── client.js                 # Client 构建产物（M1 最小 UI）
├── client-src/               # React 源码（构建前）
├── server/
│   ├── main.mjs              # MCP stdio
│   ├── platform.mjs          # 二进制/平台
│   ├── daemon.mjs            # Syncthing 生命周期
│   ├── syncthing.mjs         # REST client
│   ├── spaces.mjs
│   ├── files.mjs
│   ├── markdown.mjs
│   ├── slides.mjs
│   ├── tables.mjs
│   └── tools/
├── locale/{en-US,zh-CN}.json
├── docs/{DETAIL.md,preview.svg}
├── icon.svg
└── THIRD_PARTY_NOTICES.md
```

### 9.2 Manifest 与依赖

`package.json` 关键字段：

```json
{
  "name": "@local/dsh-space",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true, "inject": [] }
  },
  "engines": { "dsh": "^0.2.2-rc.5" },
  "files": ["index.js", "client.js", "server", "locale", "docs", "icon.svg", "cordis.patch.yml", "THIRD_PARTY_NOTICES.md"]
}
```

MCP Server 运行时依赖：

```json
{
  "@modelcontextprotocol/server": "^2.4.0",
  "zod": "^4.2.0",
  "markdown-it": "^15.0.3",
  "gray-matter": "^4.0.3",
  "sanitize-html": "^2.18.2",
  "@marp-team/marp-core": "^4.4.0",
  "csv-parse": "^7.0.3",
  "csv-stringify": "^6.9.0",
  "node-diff3": "^4.0.0"
}
```

客户端构建依赖（预构建，不进 profile 运行时）：

```json
{
  "@codemirror/state": "^6.7.6",
  "@codemirror/view": "^6.43.15",
  "@codemirror/commands": "^6.11.1",
  "@codemirror/language": "^6.13.1",
  "@codemirror/search": "^6.7.2",
  "@codemirror/lang-markdown": "^6.5.2",
  "react-data-grid": "7.0.0-beta.47",
  "react-aria-components": "^1.22.1",
  "esbuild": "^0.25.0"
}
```

- `react`、`react-dom`、`@tanstack/react-virtual` 由 DSH 平台模块表提供，构建时 external；CodeMirror 6 与 `react-data-grid` 打进 `client.js`（当前 1.54MB / 374KB gzip），后续可拆按需 chunk。
- React Aria 等第三方库打进 `client.js`；不使用 Ant Design/MUI/Mantine。
- 客户端构建与 DSH 懒工厂格式见 [UI-DESIGN.md](UI-DESIGN.md) 4.3。

不引入 officeparser/docx/exceljs/pptxgenjs；Office 能力不在本轮范围。

### 9.3 Patch 与 Host Plugin

```yaml
- insert:
    - id: dsh-space
      name: '@local/dsh-space'
```

```js
import { join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-space'

export function apply(ctx) {
  const home = ctx.get('dshHomePath')?.('space')
    ?? join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'space')
  const server = fileURLToPath(new URL('./server/main.mjs', import.meta.url))

  const env = { DSH_SPACE_HOME: home }
  if (process.versions.electron) env.ELECTRON_RUN_AS_NODE = '1'

  ctx.inject(['mcpManager'], (scope) => {
    scope.mcpManager.register('space', {
      transport: 'stdio',
      command: process.execPath,
      args: [server],
      env,
      toolLoading: 'on-demand',
      failOnStartupError: false,
    })
  })
}
```

- `register()` 生命周期跟随插件；卸载即撤下工具。`space` 名称与已有 MCP server 冲突时注册失败，日志提示改名。
- 没有 `mcpManager` 的 profile 下插件保持静默（`ctx.inject` 不会激活），不阻塞 DSH 启动。
- 独立运行：`DSH_SPACE_HOME=... node server/main.mjs` 可接其他 MCP 客户端。
- `env` 显式传 `DSH_SPACE_HOME`，因为 mcp-client 会清洗 `DSH_*`。
- `failOnStartupError: false`：二进制缺失不应阻塞 DSH 启动。
- 卸载插件不会自动停止 detached 的 Syncthing；用 `space_daemon stop` 停止，或在文档中提示。

### 9.4 UI

完整页面、线框、状态、交互、tokens 与验收清单见 **[UI-DESIGN.md](UI-DESIGN.md)**。架构要点：

- 入口：`sidebar.panellist`（id `spaces`）+ `main` key `spaces`；不把整个页面放进 iframe。
- 页面：Spaces Home、New space、Space Detail（Page 树 + 内容区）、Page/Sheet/Deck 预览、Invite、Conflict Review、Sync 状态。
- M1 最小 UI：列表、创建空间、Page 树、三类内容创建、预览、同步徽标、邀请 token；保证真实浏览器可验证。
- M2 已实现：页面编辑、CSV 单元格编辑、冲突 Review/合并、成员批准、同步状态。
- M3 完整 UI：模板库、搜索、Recent/Trash、`Chat about this`、完整 i18n/可访问性。
- 视觉只用 `--dsw-alias-*` tokens；控件自建，不 import Harness Client 包；Marp 预览用内容级 sandbox iframe，其余全部 React。
- Host 通过 WebServer 注册 `POST /dsh-space-api`（same-origin、默认 required auth）给 UI 调用，与 MCP Server 共用 `server/core`；不用 typert Remote，避免安装 bundle 的代码生成依赖。
- UI 组件：React Aria Components（headless）+ CodeMirror 6 + react-data-grid + 自绘图标；样式用 CSS Modules + `--dsw-alias-*` tokens，不 import `dsh-client-ui-primitives`。

---

## 10. 安全与平台

| 风险 | 处理 |
|---|---|
| 路径穿越/符号链接 | `realpath` 校验在空间根内；拒绝符号链接/绝对路径/`..` |
| 超大文件/读取 | 单文件 50MB、文本 2MB/20k 字符、CSV 1000 行 |
| daemon 暴露 | GUI 仅 127.0.0.1；API key 0600；不开放公网 |
| 未授权设备 | 邀请 + 双方批准；不做 auto-accept |
| 无隐私分级 | 同空间成员可读全部文件；不要放密钥 |
| 传输 | Syncthing TLS + 设备 ID；relay 端到端加密 |
| 静态数据 | 不加密，依赖磁盘加密 |
| Agent 越权 | 工具只操作空间根；空间删除走回收站，文件删除/成员移除需 `confirm` |
| 依赖供应链 | 锁版本；Syncthing 二进制 SHA-256；MPL-2.0 notices |
| 预览 XSS | Markdown 禁用原始 HTML；`sanitize-html`；Marp sandbox iframe |
| CSV 公式注入 | 存文本；未来外导时提示/转义 |
| MCP Server 绕过 DSH sandbox | 只在 `$DSH_HOME/space/spaces` 内操作；不暴露任意路径工具 |

### 10.1 平台边界

| 模块 | 平台内容 | 处理 |
|---|---|---|
| `platform.mjs` | Linux/arch → Syncthing 资产、下载、解压、权限 | 首期只实现 Linux |
| `daemon.mjs` | detached/PID/SIGTERM/端口/健康检查 | 抽象接口 |
| `files.mjs` | 路径/符号链接/原子 rename/文件锁 | POSIX 相对路径 |
| `index.js` | Electron `execPath` | `ELECTRON_RUN_AS_NODE=1` |

其余（MCP SDK、Markdown/CSV/Marp、空间模型、工具、UI）均为纯 JS，与平台无关。首期只测 Linux。

---

## 11. 里程碑

### M0：可行性验证（已完成）

- Syncthing v2.1.7 启动、REST、创建 folder、双实例同步、冲突文件。
- Marp 中文渲染；Markdown/CSV 库验证。

### M1：Agent 工具 + 最小 UI

- Bundle/MCP Server/daemon。
- `space_create/list/get/tree/context`、`file_*`、`doc_*`、`sheet_*`、`slides_*`、同步状态。
- Page 树、模板、on-demand、错误码。
- **最小 UI**：侧边栏入口、Spaces Home、New space、用邀请加入、Space Detail + Page 树、三类内容创建、Markdown/Marp/CSV 预览、同步徽标、Invite token 展示。
- 验收：在真实浏览器中创建空间/页面/表格/幻灯片，预览正确；Agent 也能完成同一流程；重启后仍在。

### M2：P2P 与成员

- 邀请/加入/批准/移除；成员别名；pending。
- 冲突列表/解决；Conflict Review UI；`space_wait_sync`。
- 验收：双实例配对、双向同步、冲突可解决、断网重连追平。


> 2026-11-21 Univer 评估：实际跑通 Docs/Sheets 1.6.0，但无 1.6 Slides；Office/CSV 导入导出依赖 Pro 后端与商业 License；快照 JSON 与开放文本/三方合并冲突；主包约 6.7MB/1.69MB gzip。结论：不替换当前 open-text 内核。详见 [评估报告](research/2026-11-21-univer-evaluation.md)。

### M3：完整 Web UI

- 文档 CodeMirror 6 与表格 react-data-grid 已落地（M3a/M3b）；剩余模板库、搜索、Recent/Trash。
- `Chat about this`；完整 i18n/可访问性/窄屏；搜索与 Recent/Trash。
- 验收：M2 已能完成创建/编辑/邀请/同步/冲突解决；M3 补模板、搜索、历史与 i18n。

### M4：协作增强

- 评论（锚定文本/线程/解决）；全文搜索；版本历史/恢复；页面链接；ODS 高级表格。
- 验收：评论可同步；搜索/恢复可用。

---

## 12. 验证

**单元**：路径/ID/Markdown/Marp/CSV/原子写/哈希/模板。

**集成（单 daemon）**：临时 home → 创建空间 → 写三类文件 → 读取校验 → 冲突模拟 → 删除/回收站。

**P2P（双 daemon）**：两个 home/端口/静态地址 → invite/join/approve → 双向同步 → 并发冲突 → 断网重连。

**DSH**：安装 bundle → 新会话 `mcp__space__*` → Agent 工作流 → UI 入口/页面可用 → 卸载无残留。

**UI**：按 [UI-DESIGN.md](UI-DESIGN.md) 第 8 节 12 个场景逐项验收（首次、创建、三类文件、邀请、冲突、daemon 停止、深浅色、窄屏等）。

**平台**：首期 Linux；macOS/Windows 后续。

---

## 13. 风险

| 风险 | 应对 |
|---|---|
| Syncthing 下载失败 | `DSH_SPACE_SYNCTHING_BIN`/镜像/手动下载提示 |
| Syncthing v2 行为变化 | 固定 v2.1.7；REST 封装；升级前集成测试 |
| 文本表达力不足 | 明确边界；ODS Phase 2；不做 MS Office 导出 |
| CSV 无公式/多 Sheet | ODS Phase 2；否则 Agent 计算 |
| 文件级冲突 | 基线快照 + 三方合并 + 冲突工具 + UI 提示 + `expectedSha256` |
| 无页级权限 | 空间级信任；UI 明确提示 |
| 插件体积 | 只引入必要库；不引入 Office 解析/导出引擎；安装后在 CI 记录体积 |
| DSH 接口变化 | `engines.dsh` 锁定；只依赖稳定 `mcpManager.register` 与 `webServer.register` |
| UI Host API | 使用 WebServer `POST /dsh-space-api`；路由默认 required auth，浏览器同源 Cookie 认证；M1 已实测 |
| 客户端构建 | 预构建 `client.js`；React/React-DOM external；CodeMirror/react-data-grid 打包（1.54MB/374KB gzip）；后续按需拆 chunk |
| 无法实时协同 | 明确非目标；异步 + 冲突解决 |

---

## 13. 实现状态

已落地并实测：

- Bundle：`@local/dsh-space` 安装到当前 Web profile，`fiberPhase: active`。
- Host plugin：注册 MCP Server（M1 33 个、M2 35 个工具）+ `POST /dsh-space-api`（WebServer，same-origin + required auth）。
- MCP Server：空间创建/列表/树/上下文、Markdown/CSV/Marp 创建读取编辑、文件读写/移动/删除、邀请/加入/批准/移除、同步状态/等待、冲突列表/合并、daemon 控制。
- UI：侧边栏 Spaces 入口；Spaces Home；创建空间；用邀请加入；Page 树；文档/幻灯片/表格创建与预览；同步徽标；邀请 token 对话框；空态/错误/加载。
- 真实浏览器验证（临时 3081 实例）：创建空间 → 创建 Markdown/CSV/Marp → 预览 → 邀请对话框；截图与 DOM 文本已检查。
- P2P 验证：两个独立 home/daemon → 创建空间 → invite → join → approve → 固定本地地址 → 文档 2 秒内同步到对端。
- 冲突工具验证：构造 `.sync-conflict-*` 与 `.space/base`，`file_conflicts` 能列出，`merge` 返回 local/base/remote 标记；自动合并路径待继续测试。

尚未完成（按计划属于 M2/M3）：

- Page 编辑保存 UI、CSV 单元格编辑、冲突 Review/合并 UI、成员 pending 批准 UI。
- 模板库、搜索、Recent/Trash、`Chat about this`、完整 i18n、可访问性打磨。
- `Personal` 自动创建（M1 先空态，避免隐式写数据）；`space_watch`/SSE；页面拖拽排序。
- 下载 Syncthing 的 GitHub 路径已实现但未在当前网络实测；M1 验证使用本地 v2.1.7 二进制。
- 插件卸载不会自动停止 detached daemon；需 `space_daemon stop`。


### M2 已完成（2026-11-21）

- 页面/Marp 编辑器：预览/编辑切换、保存、取消、未保存提示、`expectedSha256` 冲突保护。
- CSV 表格编辑：按单元格增量保存（`sheet_edit_cells`），支持追加空行；不重写未修改行。
- 冲突处理：空间顶部横幅；Review 对话框展示本机/对端/基线三方内容；保留本机/保留对端/尝试合并；冲突解决后自动刷新。
- 成员与设备：成员列表、连接状态、待批准设备批准、邀请 token 复制；Sync 状态对话框含 peer 完成度与重新扫描。
- 新增 MCP 工具 `sheet_edit_cells`、`file_conflict_detail`（共 35 个）。
- 真实浏览器验证：页面编辑保存、CSV 单元格保存、冲突 Review/保留本机、成员对话框、同步对话框。


### M3a/M3b 已完成（2026-11-21）

- 文档编辑：CodeMirror 6（`@codemirror/state/view/commands/language/search/lang-markdown`），Markdown 语法、行号/高亮、撤销、搜索、Tab 缩进、DSH tokens 主题。
- 表格编辑：`react-data-grid@7.0.0-beta.47`，单元格编辑、列宽调整、单页滚动；CSV 仍按单元格增量保存。
- 组件代码：`client-src/editors/MarkdownEditor.jsx`、`CsvGridEditor.jsx`；`rdgStyles.js` 由构建脚本从依赖生成。
- 真实浏览器验证：CodeMirror 编辑并保存 Markdown；react-data-grid 编辑 `收入/100` 并保存 CSV。
- 体积：client.js 1.53MB raw / 371KB gzip；尚未拆按需 chunk。
- 限制：react-data-grid 仍是 beta；CodeMirror 搜索面板未做 DSH 主题；表格一次编辑当前页最多 200 行。

## 14. 默认执行项

以下无异议时按默认执行：

| 项 | 默认 |
|---|---|
| 平台 | Linux only |
| 首次空间 | M1 空态，手动创建；`Personal` 自动创建延后评估 |
| 成员展示 | M2 支持本地别名；M1 仅显示 Device ID |
| 评论 | M4 |
| 实时协同 | 不做（方案 A） |
| 表格高级格式 | ODS Phase 2，触发条件：需要公式/多 Sheet/格式 |
| 幻灯片主题 | 仅 `dsh` |

---

## 附录 A：可行性验证

- Syncthing v2.1.7：`generate` → patch GUI/API key → `serve`；`POST /rest/config/folders` 200；`db/status` 显示本地文件；第二实例互加设备后 2 秒内同步到对端；并发修改生成 `.sync-conflict-*`；`pending/folders` 可见；`noauth/health`、`db/completion`、`svc/deviceid` 可用。
- 文本栈：`markdown-it` + `gray-matter` 处理中文/GFM；`@marp-team/marp-core` 4.4 在 Node 渲染中文幻灯片并提取备注；`csv-parse`/`csv-stringify` 处理中文/引号/CRLF。
- 早期 Office 库（docx/exceljs/pptxgenjs/officeparser）验证过，但因“开放文本存储 + 不做 MS Office 导入/导出”的决策不引入。

## 附录 B：参考资料

**Codex / ChatGPT Spaces**

- <https://learn.chatgpt.com/docs/space>
- <https://learn.chatgpt.com/docs/space/pages>
- <https://learn.chatgpt.com/docs/space/collaboration>
- <https://learn.chatgpt.com/docs/space/agents>
- <https://help.openai.com/en/articles/20001549-getting-started-with-space-in-chatgpt>

**技术**

- Syncthing：<https://docs.syncthing.net/> · <https://github.com/syncthing/syncthing>
- Syncthing REST：<https://docs.syncthing.net/rest/config.html>
- Marp：<https://marp.app/> · <https://github.com/marp-team/marp-core>
- markdown-it：<https://github.com/markdown-it/markdown-it>
- CSV RFC 4180：<https://www.rfc-editor.org/rfc/rfc4180>
- ODS：<https://www.oasis-open.org/committees/office/>
- DSH MCP client/manager：仓库内 `packages/mcp/mcp-client/README.md`、`packages/mcp/mcp-manager/README.md`

**备选（不采用）**

- [协同引擎调研存档](research/2026-11-21-collaboration-engines.md)
