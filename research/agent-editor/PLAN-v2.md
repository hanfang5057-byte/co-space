# DSH Space v2：聚焦文档 · Milkdown · 多人多 agent 编辑

> 基线：本仓库当前实现（`@local/dsh-space` 0.1.0，36 个 MCP 工具，client.js 1.54 MB）
> 进展：**M1 已实施**（工具 36→30，client.js 1.54 MB→1.43 MB，见文末“实施记录”）
> 版本：v2.0 · 日期：2026-11-21 · 状态：**方案待评审**
> 关系：取代 [PLAN.md](../../PLAN.md) 的表格/幻灯片部分，改动 [UI-DESIGN.md](../../UI-DESIGN.md) 的 3.4–3.6、5.2、5.3 节

---

## 0. 结论

1. **范围收缩是净收益，不是妥协**：表格与幻灯片占了 7 个 MCP 工具、2 个编辑器组件、2 个渲染库（`csv-parse/csv-stringify`、`@marp-team/marp-core`），却是"多人多 agent 协同"最难的三种格式里最不需要的两种。砍掉后剩下的文档链路可以做得深。
2. **Milkdown 换 CodeMirror 不只是"好看的编辑器"**：Milkdown 的 diff 插件让我们第一次能给出"审阅 Agent/他人的修改"的 UI——这是当前版本最缺的一环（现在冲突只能看到 `<<<<<<<` 文本）。
3. **"实时协同"要按 P2P 约束重新定义**：本项目没有中心服务器，Syncthing 的文件同步天然是秒级。能做到的是「**同主机毫秒级 + 跨设备秒级 + 自动合并 + 无法合并才人工审阅**」，而不是 Google Docs 的逐光标实时。方案按这个定义设计，并把"引入 relay 做真实时"明确列为不做（除非你改定位）。

**范围变更**

| 维度 | v1（现状） | v2（本方案） |
|---|---|---|
| 内容类型 | 文档 / 表格 / 幻灯片 | **仅文档**（存量 csv/marp **清理**：移入回收站，不保留） |
| 编辑器 | CodeMirror 6（Markdown 源码） | **Milkdown（WYSIWYG）**，预览/编辑二态消失 |
| 保存 | 手动点保存 | **自动保存**（防抖 + CAS）+ 显式版本 |
| 冲突 | 横幅 → 手动 `diff3` → 仍是文本 | 仅在**分区/强制接管**后发生；自动合并失败才逐块审阅 |
| 多人 | 靠 Syncthing 文件同步 | **编辑权租约**（同一时刻 1 个人 + 其 agent 可写）+ 其余人只读实时看 |
| 多 agent | 各自 CAS 写文件 | **presence + 租约 + 提议/审阅 + 版本历史** |
| MCP 工具 | 36 个 | **30 个**（M1 删 7 增 1）；M5 再补 5 个 `doc_*` → 35 个 |

---

## 1. 现状盘点（代码事实）

### 1.1 架构

```
DSH Host ──(cordis.patch 插入 @local/dsh-space)──► index.js
   │                                                ├─ ctx.inject(['mcpManager']) → 注册 stdio MCP Server(server/main.mjs)
   │                                                └─ ctx.inject(['webServer'])  → /dsh-space-api 路由(server/api.mjs)
   ▼
浏览器 client.js（__ModuleLoader__ 工厂，esbuild 打包，React 来自宿主 module table）
   │  fetch POST /dsh-space-api {method,args}
   ▼
server/core/spaces.mjs ── Syncthing REST（server/syncthing.mjs）──► 本机 Syncthing daemon
   │                                                                    │
   └─ 直接读写 space 目录（atomicWrite） ◄──────── 文件同步 ────────────┘
```

- Host 半只做两件事：注册 MCP Server、注册 HTTP 路由（`index.js:26-38`）。
- 业务逻辑全在 `server/core/*`，MCP 工具面（`server/main.mjs:83-419`）与 HTTP API（`server/api.mjs:62-104`）**是两套手写镜像**——这是 v2 要收敛的技术债之一（见 §6.4）。

### 1.2 编辑闭环（当前）

| 环节 | 实现 | 位置 |
|---|---|---|
| 打开文档 | `rpc('read')` 返回 `{text, html, outline, sha256}` | `client-src/index.jsx:122-145` |
| 编辑 | 切到 `edit` 模式，Markdown 源码进 CodeMirror | `index.jsx:174-181`、`editors/MarkdownEditor.jsx:96-163` |
| 保存 | 手动点按钮，带 `expectedSha256` 调 `write` | `index.jsx:188-210` |
| 预览 | `mode === 'preview'` 时渲染 sanitize 后的 HTML | `index.jsx:538-558` |

问题：**预览与编辑是两条独立链路**（服务端 markdown-it 渲染 vs 客户端 CodeMirror 源码），每次改动都要"保存→重载→看 HTML"，编辑器本身对格式完全不可见。

### 1.3 冲突闭环（当前，有一个隐藏缺陷）

- 写入前 `saveBase()` 把当前版本存到 `<space>/.space/base/<path>`（`server/core/files.mjs:29-39`），冲突时 `diff3Merge(local, base, remote)`（`:226-236`）。
- **缺陷**：`.stignore` 明确排除了 `.space/`（`server/core/spaces.mjs:9`），所以 **base 快照不跨设备**。设备 A 的 base 是 A 自己上次保存的版本，用它去合 B 的修改，合并基经常是错的；"自动合并"因此长期不可靠，只能退化成"— 手动处理冲突"横幅（`index.jsx:418-424`）。
- 这条缺陷是 v2 必须修的根因：**合并基必须共享**（§4.3）。

### 1.4 "多人多 agent" 现状

| 能力 | 现状 |
|---|---|
| 多人 | 只有文件同步；另一台设备改了什么，本机要刷新才看得到（无 push） |
| 多 agent | 多个 DSH 会话/设备各自调用 MCP 工具写文件，靠 `expectedSha256` 互斥；没有"谁在写"的概念 |
| 编辑中感知 | 无（不知道对方/Agent 正在改哪一段） |
| 审阅 | 无（只有冲突文件，且是文本级 `<<<<<<<`） |
| 撤销/历史 | 无（`.space/base` 只保留一份） |

---

## 2. 目标体验

| 场景 | 今天 | v2 |
|---|---|---|
| 打开文档 | 先看 HTML 预览，点"编辑"才见源码 | 打开即 WYSIWYG，光标可直接落 |
| 改一句话 | 点保存 → 等重载 | 停手 600 ms 自动保存，状态条显示"已保存 v12" |
| 对方在同一台机器开同一文档 | 两边互相覆盖，后保存者赢 | 对方默认**只读**并毫秒级实时看到你的改动；点"请求编辑权"才可接管 |
| 对方在另一台设备 | 需要手动刷新，冲突概率高 | 2–5 s 内看到对方改动；编辑权转移后你是只读读者 |
| 两端都改了同一段 | 出现 `.sync-conflict-*`，横幅提示，手点"合并"看到 `<<<<<<<` | 正常不会发生（排他编辑）；只有分区后强制接管才会 → **块级 diff 审阅** |
| Agent 改文档 | Agent 无声写文件，人再刷新才知道 | 1) 编辑器显示"Agent 正在改 §3"；2) 改了哪几块有边框标记；3) 大改用提议（Proposal），人点接受才落地 |
| 想回退 | 无 | 每个版本内容寻址保存，可"回到 v11"，或撤销"这次 Agent 改动" |
| 找东西 | 无搜索 | 后续（不在 v2 范围） |

**不做的**：逐光标实时协同（需要 relay/中心服务，违背项目定位）、评论线程、移动端。

---

## 3. 架构变更

新增一层 **live 会话（Host 侧，内存）** + 一个 **同步的 `.live/` 目录**（跨设备协作协议的全部载体）：

```
                        ┌─────────────── DSH Host（每台设备一个）───────────────┐
浏览器 A ──SSE/HTTP──►  │ live 会话层（doc → subscribers, presence cache）      │
浏览器 B ──SSE/HTTP──►  │   ├─ 保存：CAS + 版本写入 + 合并 + 广播               │
                        │   ├─ fs.watch(space root)：Syncthing 落地 → 广播/合并 │
                        │   └─ MCP 工具（doc_*）与 HTTP 共用同一套 core         │
                        └───────┬──────────────────────────────┬────────────────┘
                                │ 直接读写                       │ 读写 `.live/`
                                ▼                               ▼
                       <space>/pages/*.md                <space>/.live/
                       （唯一真相源）                     ├─ versions/<doc>/<sha>.md   ← 内容寻址版本
                                                          ├─ heads/<doc>/<writer>.json ← 各写者指针
                                                          ├─ presence/<device>.json    ← 心跳
                                                          ├─ locks/<doc>/<holder>.json ← 每写者一文件
                                                          └─ proposals/<doc>/<id>.json ← 待审提议
```

三个关键性质：

1. **`.live/` 参与同步**（`.stignore` 目前只忽略 `.space/`，`server/core/spaces.mjs:9`），所以它天然是跨设备的协调面；而 `.space/` 继续只放本机缓存。
2. **每个写者写自己的文件**（presence/heads/locks），因此这些文件**永远不会同步冲突**——这是用文件做协作协议的常用技巧，省掉一整套锁服务。
3. `.live/` 以 `.` 开头，`treeSpace` 已过滤（`spaces.mjs:224`），用户看不到；但 `walk()` 的 `IGNORED` 集合要补上（`util.mjs:5`），否则会被计入空间体积/统计。

---

## 4. 并发模型

分三层，**每一层解决一种延迟尺度的问题**：

### 4.1 同主机（毫秒级）

- Host 维护 `Map<spaceId, Map<docPath, DocSession>>`；每个 session 有订阅者集合（SSE 连接）。
- 任何本机客户端保存 → 立即广播 `{type:'doc-changed', path, version, ops?}`，其他标签页/用户在 <100 ms 看到。
- 不做 OT/CRDT：同主机两个人类同时打字仍可能重叠，交给 §4.3 的合并；但**广播让重叠窗口从"几分钟"缩到"几百毫秒"**，实际体验接近"实时"。

### 4.2 跨设备（秒级）

- Host 对 space 根目录挂 `fs.watch(root, { recursive: true })`（Node ≥ 20 支持 Linux 递归），debounce 300 ms 后：
  - 文件 sha 变化 → 走 §4.3 合并 → 广播给本机所有订阅者。
  - `.live/presence/*` 变化 → 刷新 presence → 广播。
- 不再需要客户端轮询；SSE 断线时回退到 `GET /state` 轮询（1.5 s）。

### 4.3 合并（核心）

**版本存储**：每次成功写入后，把内容按 sha256 存一份 `.live/versions/<doc>/<sha>.md`（内容寻址，重复写同一内容天然去重、不冲突），并更新自己的 `heads/<doc>/<writerId>.json`：

```json
{ "writer": "dev-a", "sha": "9f2c…", "prev": "3a71…", "doc": "pages/x.md", "at": "2026-11-21T11:02:31Z", "by": "human:alice" }
```

**合并基**：收到远端新版本时，沿双方 `heads` 的 `prev` 链回溯求最近公共祖先（LCA）作为 base，再 `diff3Merge(local, base, remote)`（复用 `node-diff3`，`files.mjs:226`）。这修掉了 §1.3 的"base 不跨设备"缺陷——base 现在来自共享的版本库，而不是本机缓存。

**分支处理**：

| 合并结果 | 行为 |
|---|---|
| 无重叠（`conflicts === 0`） | 直接写合并结果，广播 `merged`，UI 无感（最多一句"已合并他人改动"） |
| 有重叠 | **不写文件**；把 `{local, base, remote, merged}` 推给两端客户端 → Milkdown diff 审阅（人就地接受/拒绝；Agent 侧收到结构化冲突） |
| 同一方连续覆盖（对方版本是本地祖先） | 快进（fast-forward），无需合并 |

**给 Agent 的约定**：工具写文件带 `expectedSha256`；失败返回 `CONFLICT` + `{currentSha, baseSha, blocks}`，Agent 重读后重试一次，仍冲突则改用提议。

### 4.4 编辑权租约（排他编辑）

**目标**：同一时刻只有 **1 个编辑者**（一个人 + 他名下的 agent）能写文档；其他人是**只读读者**，但实时看到改动。这把"并发合并"从常态降级为异常路径。

#### 状态机

```
reader ──请求编辑权──► requesting ──赢得租约──► editing ──释放/超时──► reader
                          └────输了────┘                                  
editing ──他人强制接管──► reader（本地改动进 diff 审阅）
```

#### 两阶段获取（over Syncthing）

1. **写意图**：`PUT .live/locks/<docId>/<leaseId>.json`（`leaseId = <deviceId>.<nonce>`，每台设备每次尝试一个文件 → **永不产生同步冲突**）：
   ```json
   { "schema": 2, "leaseId": "dev-a.k9x", "holder": "dev-a", "label": "Alice 的笔记本",
     "doc": "pages/x.md", "mode": "human", "agents": ["sess-7f3"],
     "acquiredAt": "2026-11-21T11:02:31.120Z", "expiresAt": "2026-11-21T11:03:31.120Z" }
   ```
2. **等传播**：调 `space_wait_sync`（已有工具，`spaces.mjs` 的 `waitSync` 基于 completion API）等 1.5–3 s，确保对端能看到；再本地 settle 300 ms。
3. **判定**：读该 doc 下所有**未过期**租约，`winner = min by (acquiredAt, leaseId)`。
   - 自己是 winner → `editing`，开始续租；
   - 否则删掉自己的文件 → 回到 `reader`，显示持有者。
4. **续租**：每 30 s 重写自己的文件（`expiresAt += 60 s`）。只写自己的文件 → 无冲突。
5. **释放**：删除自己的文件（删除也会同步）；关面板/失焦 90 s 自动释放。
6. **超时接管**：持有者租约过期（设备离线/崩溃）→ 任何人可获取；获取前**先把当前内容存一版**（§4.3 的版本库），并标记 `takeover: true`。
7. **强制接管**（UI"强制接管"按钮）：弹窗说明风险 → 存版本 → 写入 `force: true` 的租约。原持有者下次写入会拿到 `LOCKED`，其改动自动转成提议。

**为什么会收敛**：两阶段的"写 → 等 → 读"让并发请求在同一窗口内互相可见，`(acquiredAt, leaseId)` 是**全序**，两端算出同一个赢家，输家主动退出。窗口内若同步尚未到达（分区），两端可能都认为自己是 winner —— 这是分布式锁的固有问题，所以 **CAS + 版本合并必须保留作兜底**，并在重连后按 `acquiredAt` 判胜负、把落败一方的改动送进 diff 审阅。

#### 读者侧

- 编辑器以 `editable: false` 打开，通过 SSE/`fs.watch` 实时接收持有者的保存 → 直接 `replaceAll`（无合并）。
- 顶部条："Alice 正在编辑 · 请求编辑权"；自己请求后显示"等待确认（1/2）…"。

#### Agent 的归属

| 情形 | 行为 |
|---|---|
| 编辑者是本人（租约 `agents` 含本会话或 holder 是本设备） | `doc_patch` 直接写，与人类编辑同等权限 |
| 文档无人持有 | Agent 可取**短租约**（`mode: "agent"`，TTL 30 s）完成单次 patch 后立即释放 |
| 文档被他人持有 | `doc_patch` 返回 `LOCKED{holder, expiresAt}`；改用 `doc_propose`（提议不写文件，仍需人接受） |
| 循环任务/后台 Agent | 一律提议，不抢锁 |

#### 与现有代码的关系

- 当前 `writeFile` 的 `expectedSha256`（`files.mjs:104-119`）保留为最后一道闸；锁只是把"撞车"从常态变成罕见。
- 现有 `.space/base` 的合并思路升级为 §4.3 的共享版本库；锁生效后，合并只在接管/分区时用到。

### 4.5 Presence

`PUT .live/presence/<deviceId>.json`（每设备一个文件，天然不冲突）：

```json
{ "device": "dev-a", "name": "Alice 的笔记本", "doc": "pages/x.md",
  "blockId": "h:背景#2", "mode": "editing", "agent": "dsh-session-7f3",
  "at": "2026-11-21T11:02:31Z", "expiresAt": "2026-11-21T11:02:51Z" }
```

- 心跳 10 s，TTL 20 s；只在文档打开时写。
- UI 只做**块级**提示（"Alice 正在编辑 § 背景"），**不画远端光标**——秒级延迟下的光标会跳，反而不可信。
- 同一 Host 内的用户直接走内存 presence（毫秒级），文件只服务跨设备。

---

## 5. Milkdown 接入

### 5.1 依赖与体积（实测）

| 组合 | raw | gzip |
|---|---|---|
| `@milkdown/kit` + commonmark + gfm + history + listener（本方案） | 456 KB | **140 KB** |
| 再加 streaming + diff（v3 若做"选区改写"） | 486 KB | 150 KB |
| Crepe 全量（不用） | 2725 KB | 904 KB |
| 当前 client.js（CodeMirror + react-data-grid + react-aria） | 1540 KB | — |

**替换后体积预计持平或下降**（去掉 CM6 + RDG ≈ 420 KB raw，加 Milkdown 456 KB），且 `csv-parse/csv-stringify/@marp-core` 从服务端依赖里消失。

### 5.2 组件契约

替换 `client-src/editors/MarkdownEditor.jsx`（现 203 行，CodeMirror 受控）为 `client-src/editors/MilkdownEditor.jsx`，**保持 props 形状不变**，让 `ContentPane` 先零改动跑通：

```jsx
<MilkdownEditor
  value={body}                 // 不含 front matter 的正文
  onChange={(md) => {...}}     // 用户编辑（防抖 600ms）
  readOnly={false}
  decorations={presenceMarks}  // 块级 presence / 提议高亮
  onSelectionChange={(block) => {...}}  // 上报 presence 用
/>
```

实现要点：

- **只创建一次** `Editor.make()`（`useEffect` 空依赖 + `useRef`），值通过 `editor.action(replaceAll(md))` 外部同步；用 `externalChange` 标记防止回环（沿用现在 CodeMirror 的 annotation 思路，`MarkdownEditor.jsx:22,142-149`）。
- **不要在 value 变化时就整篇 replace**：先比较序列化结果，相同则跳过；不同则用 `computeDocDiff`（若引入 diff 插件）只替换变化块，避免光标跳位。
- 卸载时 `editor.destroy()`；面板隐藏时暂停监听但**不要 destroy**（未保存态要留住）。
- React 及 `react-dom*` 已经在构建脚本里 external（`scripts/build-client.mjs:16`），保持不变——这是宿主 module table 的硬要求。

### 5.3 Front matter：删除（已确认）

现有文档由 `createDocumentMarkdown()` 写入 YAML 头（`server/core/markdown.mjs:69-78`）。Milkdown 不认识它，且它带来的元数据（`type/title/created`）**目录里已有等价信息**（文件名、mtime、`.space.json`）。

**决定：直接去掉 front matter，不做保留机制。**

| 变更 | 位置 |
|---|---|
| 新建文档不再写 YAML 头，只保证 `# 标题` + 正文 | `createDocumentMarkdown()` |
| `read` 返回纯正文；删掉 `parseDocument()`/`gray-matter` | `markdown.mjs:36-42`、`package.json` |
| `titleOf()` 改为"首个 H1 → 文件名"（已有 fallback 逻辑，去掉 front matter 分支） | `markdown.mjs:44-49` |
| 存量文档：一次迁移把 YAML 头剥掉并写回（先存版本）；也可以按你的意思**直接移入回收站** | `space_migrate_legacy`（§7） |
| `renderDocument()` 不再需要剥头处理 | `markdown.mjs:84-92` |

好处：少一个依赖（`gray-matter`）、少一类"编辑器看不见但会被改写"的内容、round-trip 断言只需要比较正文。

### 5.4 图片与附件

文档里可能有 `![](assets/xxx.png)`。Milkdown 的 image 节点会直接产出 `<img src>`，需要一个能鉴权的地址：

- 新增 `GET /dsh-space-api/asset?space=&path=`（走 `webServer.register` 的 prefix 路由，同源 cookie 鉴权），返回文件流 + `content-type` + `cache-control: private, max-age=60`。
- 安全：`resolveInside()` 复用现有路径校验（禁止 `..`、绝对路径、软链），只允许 `assets/`、`files/` 前缀。
- 写入侧暂不做上传（`file_import` 已能导入素材），v2 只在编辑器里"显示"。

### 5.5 样式

- 只 import `@milkdown/kit/prose/view/style/prosemirror.css` + 一份自有排版 CSS，全部挂在 `.dsh-space-doc` 容器下，不写 `:root`/`body`/`*`。
- 颜色全部走 `--dsw-alias-*`（宿主 `body[data-ds-dark-theme]` 切换即自动跟随），正文用 `--dsw-alias-label-primary`，代码块 `--dsw-alias-bg-layer-2`。
- 保留现有 `sp-*` 前缀的外部骨架样式；编辑器内部用 `dsh-space-md-*` 前缀，避免和 CodeMirror 时代的类名混在一起。

---

## 6. MCP 工具面重构

### 6.1 删除（7 个）

`sheet_create`、`sheet_read`、`sheet_update`、`sheet_edit_cells`、`slides_create`、`slides_read`、`slides_update`。

### 6.2 新增（6 个）

| 工具 | 输入 | 行为 |
|---|---|---|
| `doc_blocks` | `space, path, heading?, limit?` | 返回块列表：`{anchor, kind, lines, text, sha}`，`anchor = {heading, index}`；Agent 靠它精确寻址，不必整篇读 |
| `doc_patch` | `space, path, expectedSha256, ops[]` | 按锚点/文本做**行区间**替换（不是整篇写）；冲突返回 `CONFLICT + currentBlocks` |
| `doc_propose` | `space, path, expectedSha256, ops[], rationale` | **不写文件**；写 `.live/proposals/<doc>/<id>.json` 并推送，等人接受 |
| `doc_presence` | `space, path?` | 返回当前谁（人/Agent/设备）在编辑哪个文档哪一块 |
| `doc_versions` | `space, path, limit?` | 版本列表（sha/时间/作者/摘要），供"回滚"与"撤销某次 Agent 改动" |
| `space_cleanup_legacy` | `space, dryRun?` | 列出/清理空间内的 `.csv` 与 Marp 幻灯片（移入回收站，不硬删） |

`doc_restore` 可作为 `doc_versions` 的配对（`doc_restore(space, path, sha)`），实现留到 M6。

### 6.3 保留与改造

- `space_*` 全部保留。
- `file_*` 保留（附件/批量操作用），但 `file_read`/`outlineFile` 删掉 table/slides 分支（`files.mjs:67-99`）。
- `doc_create`、`doc_append` 保留；`doc_append` 改为**复用 `doc_patch` 的块定位**（追加到指定 heading 之后），而不是纯文本拼接。
- 冲突三件套（`file_conflicts`/`file_conflict_detail`/`file_resolve_conflict`）保留，但语义升级：`resolveConflict` 的 `merge` 改用共享 base（§4.3），并新增 `action: 'review'` 把冲突交给 UI 的 diff 审阅。

### 6.4 收敛"两套镜像"

现在 MCP 工具（`server/main.mjs`）与 HTTP 方法（`server/api.mjs`）各写一遍。v2 把两者都改成对 `server/core/commands.mjs` 里**一张命令表**的薄封装：

```js
export const commands = {
  'doc.blocks': { input: z.object({...}), run: (ctx, args) => docBlocks(ctx, args) },
  'doc.patch':  { input: z.object({...}), run: (ctx, args) => docPatch(ctx, args) },
  // …
}
```

MCP 侧按 `key → mcp 名（doc.blocks → doc_blocks）` 自动注册，HTTP 侧 `method` 直接用 key。约省 300 行重复代码，也让"工具即 API"不再漂移。

### 6.5 Server instructions 更新

删掉 CSV/Marp 两行（`main.mjs:71`），补：

- `doc_blocks` 先读块再改，优先用 `doc_patch` 而不是 `file_write`（整篇写会丢别人的改动）。
- 大改（>3 块或删除）用 `doc_propose`，让人确认。
- 动手前看 `doc_presence`：有人在编辑同一块时，等或换块。
- 不要碰 `.live/` 下的文件。

---

## 7. 删除清单（逐文件）

| 文件 | 处理 |
|---|---|
| `server/core/tables.mjs`（118 行） | 删除 |
| `server/core/slides.mjs`（121 行） | 删除 |
| `server/core/content.mjs`（84 行） | 删 6 个 sheet/slides 函数，保留 `createDocumentFile`/`appendDocumentFile` |
| `server/core/files.mjs` | 删 table/slides 分支（`:71-78`、`:96-100`）；`fileKind` 判定收敛为 document/image/file |
| `server/core/markdown.mjs` | 删 `renderDocument` 里的 slides 语义；新增 `splitFrontMatter()`（供 §5.3） |
| `server/core/spaces.mjs` | `folderStats` 的 counts 改为 `{documents, assets, files}`（`:79-91`）；`spaceContext` 的 recent 过滤去掉 slides/table（`:256-261`） |
| `server/core/util.mjs` | `IGNORED` 增加 `.live`（`:5`）；`fileKind` 去掉 table/slides |
| `server/main.mjs` | 删 7 个工具 + import；instructions 更新 |
| `server/api.mjs` | 删 6 个 dispatch case（`:78-84`） |
| `client-src/editors/CsvGridEditor.jsx`（99 行）、`rdgStyles.js` | 删除 |
| `client-src/editors/MarkdownEditor.jsx` | 替换为 `MilkdownEditor.jsx` |
| `client-src/index.jsx` | 删 `sheetEdits`/`changeCell`/`addSheetRow`/`SheetEditor`/slides iframe；`ContentPane` 去掉预览/编辑切换（`:464-498`）；`Preview` 只留文档分支（`:538-558`） |
| `scripts/generate-rdg-styles.mjs` | 删除；`build-client.mjs` 去掉这一步 |
| `package.json` | 去 `csv-parse`/`csv-stringify`/`@marp-team/marp-core`/`@codemirror/*`/`react-data-grid`；加 `@milkdown/kit`（7.23.x） |
| `locale/{zh,en}.json` | 描述改为"文档空间"，去掉表格/幻灯片 |
| `docs/DETAIL.md`、`UI-DESIGN.md` §3.5/3.6/5.2/5.3、`PLAN.md` §4.2/4.3 | 修订或标注废止 |
| `icon.svg` | 若含表格/幻灯片隐喻则重画（可选） |

**存量文件处理（按你的决定：清理而非保留）**

1. **扫描**：`space_cleanup_legacy({ space, dryRun: true })` 返回 `{ files: [{path, kind, bytes, title, action}], total, bytes }`——`.csv`、`marp: true` 的 `.md`、带 front matter 的 `.md`、以及由此产生的 `.sync-conflict-*`。
2. **清理**：`dryRun: false` 时按 `action` 处理——
   - `strip`（带 front matter 的 `.md`）：剥掉 YAML 头写回，正文保留；
   - `trash`（`.csv` / Marp / 冲突文件，以及 `deleteMarkdown: true` 时的全部 `.md`）：**移动**到 `<spacesRoot>/../trash/legacy-<spaceId>-<ts>/`（复用 `deleteSpace` 的 trash 布局，`spaces.mjs:284`），保留原相对路径；不 `rm`，不碰 `.live/versions`。
3. **UI**：首次打开含旧格式的空间时给一次横幅提示（"检测到 3 个旧格式文件（表格/幻灯片），已不提供编辑。要移到回收站吗？"），提供"查看清单 / 移到回收站 / 稍后"；不做静默删除。
4. **幂等**：清理后再次扫描返回 0；回收站目录不参与同步（在 spacesRoot 之外）。
5. **不设历史包袱**：已确认存量 Markdown 也可以整批移入回收站（`deleteMarkdown: true`）；仓库侧同步删掉 `CsvGridEditor.jsx`、`rdgStyles.js`、`tables.mjs`、`slides.mjs`、`gray-matter` 与对应依赖；研究遗留 `research/wysiwyg-spike/node_modules` 在定稿后清理。

---

## 8. 里程碑

| 里程碑 | 内容 | DoD | 估时 |
|---|---|---|---|
| **M1 收缩** | 删表格/幻灯片（代码、依赖、工具、UI、文案）+ `space_cleanup_legacy` | 工具面 30 个；`npm ls` 无 marp/csv/RDG；存量 csv/marp 可 dry-run 列出并移入回收站、可恢复；现有空间不报错 | 4–6 d |
| **M2 Milkdown** | 替换编辑器 + 自动保存 + front matter 分离 + 图片路由 | 打开即所见即所得；600 ms 自动保存；保存 10 次后 front matter 字节不变；`assets/*.png` 正常显示；bundle ≤ 1.4 MB | 5–7 d |
| **M3 实时** | live 会话层（SSE）+ `fs.watch` + 版本存储 + 只读实时跟读 | 两个标签页同文档互见 <100 ms；跨设备 5 s 内出现；读者侧文档随持有者保存实时更新 | 6–8 d |
| **M4 编辑权** | 租约（两阶段获取/续租/释放/接管）+ presence + 冲突 diff 审阅 | 第二个人打开即只读并能实时跟读；请求编辑权 3 s 内出结果；断网接管后进入逐块审阅；强制接管不丢内容 | 6–8 d |
| **M5 Agent 协同** | `doc_blocks/doc_patch/doc_propose/doc_presence/doc_versions` + 命令表收敛 | Agent 能定位块改一段；并发被 CAS 挡住并重试成功；提议在 UI 出现、接受后落地；`doc_versions` 能回滚 | 6–8 d |
| **M6 打磨** | 版本历史 UI、恢复、撤销"这次 Agent 改动"、i18n、a11y、窄屏 | 10k 字文档不卡；键盘可达；中英文完整 | 4–6 d |

总计 **5–6 周**（单人）。M1 与 M2 可以并行（不同人）。

**验收必须真机**：两个 Syncthing 实例 + 两个浏览器 + 一个 Agent 会话，跑通"人改 / Agent 改 / 撞车 / 审阅 / 回滚"五条路径，不能只看单测。

---

## 9. 风险

| # | 风险 | 等级 | 缓解 |
|---|---|---|---|
| 1 | Milkdown 首次保存会规范化存量 Markdown 格式 | 低（已接受） | 明确不做兼容：存量文档可整批移入回收站；新文档从头就是 WYSIWYG 产物 |
| 2 | front matter 被吃掉 | 高 | §5.3 的分离方案 + 单测（保存 10 次字节不变） |
| 3 | **合并基仍错**（版本链断裂，如设备重装） | 中 | 找不到 LCA 时退回"整篇 diff 审阅"，绝不静默覆盖 |
| 4 | `fs.watch` 在部分平台/网络盘丢事件 | 中 | 事件 + 30 s 周期扫描双保险；SSE 断线回退轮询 |
| 5 | presence 心跳文件导致 Syncthing 频繁同步/耗电 | 中 | 只在文档打开时写；心跳 10 s；TTL 20 s；文件 <300 B |
| 6 | 租约死锁/抢占震荡 | 中 | TTL 90 s（Agent 30 s）+ 续租 + 强制接管按钮（先存版本）+ CAS 兜底 |
| 6b | 分区时两端都自认持有编辑权（分布式锁固有） | 中 | 重连后按 `acquiredAt` 判胜负，落败方改动进 diff 审阅；文件层 CAS 保证不丢数据 |
| 7 | 同主机多标签页依赖 SSE，连接数失控 | 低 | 每标签页一条 SSE，Host 侧订阅按 `sessionId` 归并；上限 32 |
| 8 | 大文档（>200 KB）编辑卡顿 | 中 | 首屏分块渲染（Milkdown 无虚拟化）；超过阈值提示"超大文档，切源码模式" |
| 9 | 存量 `.live` 协议未来要改 | 低 | `presence`/`heads`/`proposals` 都带 `schema: 2` 字段，读时忽略未知字段 |
| 10 | 两台设备时钟不一致影响租约/presence | 中 | 一律用 `expiresAt` 相对本机时钟换算 + 容忍 ±60 s；冲突时以 holder id 决胜 |
| 11 | 清理旧格式时误删用户内容 | 中 | 只移不删（进 spacesRoot 之外的回收站）+ dry-run 先列清单 + UI 二次确认 + 提供恢复说明 |
| 12 | 分级策略误判（本该提议的直改了） | 中 | 阈值写进工具描述；`doc_patch` 命中阈值外条件时**强制转提议**并返回 `PROPOSED`，而不是报错 |

---

## 10. 已确认的决策（2026-11-21）

| # | 决策 | 采用 | 对方案的影响 |
|---|---|---|---|
| 1 | 实时性目标 | **同主机毫秒 + 跨设备秒级**，不引入 relay | §4 三层并发模型成立；不做逐光标、不画远端光标，只做块级 presence |
| 2 | Agent 默认行为 | **分级**：≤3 块且非删除 → `doc_patch` 直改；大改/删除 → `doc_propose` 待人接受 | §6.2 两个工具都要；§8 M5 增加"分级策略"配置与阈值说明 |
| 3 | 存量表格/幻灯片 | **清理**（移入回收站，不硬删） | §6.2 新增 `space_cleanup_legacy`；§7 存量处理改写；M1 增加 dry-run 与 UI 横幅 |
| 4 | Front matter | **删除**，不做保留机制 | §5.3 改写；去掉 `gray-matter`；存量 `.md` 剥头或整批清理 |
| 5 | 多人编辑 | **引入编辑权租约**：同一时刻 1 人 + 其 agent 可写，其余只读实时看 | §4.4 改写；M4 增加租约状态机与 UI 状态；Agent 工具增加 `LOCKED` 语义 |

**分级策略的具体阈值**（写进 `tools` 描述，Agent 侧可读）：

```text
直改（doc_patch）：≤3 个块、不删除整节、总长度 ≤ 2000 字符、目标块无他人 presence、无活跃租约
提议（doc_propose）：超过任一条 → 生成 proposal，等人接受
```

---

## 附：与前一版调研的关系

- 编辑器与 DSH 扩展点的通用结论见 [PLAN.md](PLAN.md)（Milkdown 能力模型、锁编辑语义、React 生态兼容性 §2.5）。
- 本文件是其"落到当前仓库"的具体化：**范围收缩 + 复用现有 CAS/base/diff3 内核 + 用 `.live/` 文件协议补上 presence/版本/提议**。
- 前一版推荐的"装饰层打字机 + 单事务"在这里不必要：本项目文档改动走工具（整块落地），没有 token 级流，不需要 streaming 插件。

---

## 实施记录

### M1 收缩（2026-11-21 完成）

**已删除**

| 项 | 证据 |
|---|---|
| 服务端内核 | `server/core/tables.mjs`、`server/core/slides.mjs` |
| 服务端函数 | `content.mjs` 的 6 个 sheet/slides 函数；`files.mjs` 的 table/slides/slides-outline 分支 |
| Front matter | `markdown.mjs` 去掉 `gray-matter`、`parseDocument`；`createDocumentMarkdown` 不再写 YAML 头 |
| MCP 工具 | `sheet_*`(4) + `slides_*`(3) → 36 个降为 30 个 |
| 客户端组件 | `CsvGridEditor.jsx`、`rdgStyles.js`、`SheetEditor`、幻灯片 iframe 预览、表格预览与相关 CSS |
| 依赖 | `@marp-team/marp-core`、`csv-parse`、`csv-stringify`、`gray-matter`、`react-data-grid`（共移除 45 个包） |
| 构建 | 删除 `scripts/generate-rdg-styles.mjs`；`build:client` 单步 |
| 文案 | `locale/{zh,en}.json`、`docs/DETAIL.md`、`THIRD_PARTY_NOTICES.md` |

**已新增**

- `server/core/legacy.mjs`：`scanLegacy` / `cleanupLegacy`（`strip` 剥 front matter、`trash` 移入 `<spacesRoot>/../trash/legacy-<spaceId>-<ts>/`，先备份再改写）。
- MCP `space_cleanup_legacy`（默认 `dryRun: true`）+ HTTP `legacyReport` / `cleanupLegacy`。
- `util.fileKind` 新增 `legacy` 类型（CSV/TSV/ODS/Marp），`IGNORED` 增加 `.live`，`findConflicts` 跳过 `.live`。
- 空间统计改为 `{ documents, legacy, assets, files }`，树排序去掉 `sheets`。

**验证**

- `node --check` 全量服务端通过；`npm run build:client` 通过，`client.js` 1,433,099 B（原 1,540,300 B）。
- legacy 冒烟（临时空间）：`scan` 报 3 项（1 strip / 2 trash）；`dryRun` 无副作用；执行后 `old.md` 正文保留且无 front matter，CSV/Marp 移入回收站并可在 trash 中找回。
- 未验证：真实 Syncthing 双设备链路（需要第二个实例）；MCP Server 在 DSH 里的实际工具列表刷新。


### M2 Velvet（Milkdown）实施记录（2026-11-21）

| 项 | 结果 |
|---|---|
| 编辑器 | `client-src/editors/MilkdownEditor.jsx`：`@milkdown/kit` + commonmark + gfm + history + listener，单实例挂载、外部值 diff 落盘、`onSelectionChange` 上报章节 |
| 主题 | `client-src/editors/milkdownTheme.js`：全部作用域在 `.dsh-md`，只用 `--dsw-alias-*` |
| 交互 | 去掉预览/编辑二态；600 ms 防抖自动保存 + `Mod+S` 立即保存；保存冲突就地提示 |
| 图片 | `GET /dsh-space-api/asset?space=&path=`，同源 cookie 鉴权，仅 image/*，`nosniff` + CSP；客户端在载入/保存时做相对路径 ↔ 绝对 URL 的双向转换 |
| 依赖 | 移除 `@codemirror/*`（12 个包）、`react-data-grid`；新增 `@milkdown/kit@7.23.0`；client.js 1,432,996 → **1,504,282 B** |
| 验证 | `npm run build:client` 通过；浏览器内 asset 200/404/400 均符合预期 |

### M3 实时与编辑权实施记录

| 项 | 结果 |
|---|---|
| 文件协议 | `.live/{versions,heads,base,locks,presence,proposals}`，每写者一文件 → 自身不产生 `.sync-conflict-*` |
| 版本库 | `recordVersion()` 内容寻址快照 + `heads/<writer>` + 共享 `base` 指针；`mergeTexts()` 用 diff3 |
| 编辑权 | 两阶段获取（写自己的租约 → 等待 → 全序判定），TTL 90 s、30 s 续租、释放即删；`LOCKED` 结构化错误 |
| 实时 | `GET /dsh-space-api/events`（SSE）+ `fs.watch`（递归）+ 20 s tick；前端 EventSource 在空间打开期间常驻 |
| Presence | 每 10 s 心跳，含文档与最近章节；SSE 每 5 s 广播一次快照；界面显示"N 人在看"与只读横幅 |
| 验证 | 浏览器内：A 拿租约 / B 被拒 / B 释放后成功；SSE 首帧 `: connected` + `event: ready` |

### M4 Agent 工具实施记录

| 项 | 结果 |
|---|---|
| 新工具 | `doc_blocks`、`doc_patch`、`doc_propose`、`doc_proposals`、`doc_resolve_proposal`、`doc_versions`、`doc_restore`、`doc_presence`（工具面 38） |
| 块模型 | `parseBlocks()`：按行扫描、识别围栏代码、标题分节；`blockId = section:index` |
| 补丁 | `applyOps()` 支持 replace_block/delete_block/insert_after/insert_before/replace_text/append_section，行区间自底向上拼接 |
| 冲突 | 写前 `expectedSha256` 校验；失败返回 `VERSION_CONFLICT + currentSha256 + blocks` |
| 租约联动 | `doc_patch` 在他人持锁时返回 `LOCKED{holder, label, expiresAt}`；持有者可传 `holder`，Agent 同设备自动继承 |
| 收敛 | 以 `server/core/contract.mjs` 声明"工具 ↔ HTTP 方法"映射，`scripts/contract-check.mjs` 断言 38 工具 / 50 方法 / 48 case 无漂移（比整表重写风险更低，达到同一目标） |
| 验证 | `scripts/smoke.mjs` 14 项全过（租约竞争、presence、块补丁、过期写冲突、提议接受、版本恢复、锁拦截） |

### M5 打磨实施记录

| 项 | 结果 |
|---|---|
| 撤销 | 「撤销上一步」= 恢复上一个非当前版本；「历史」对话框展示版本、作者、大小并支持恢复 |
| 只读读者 | 无编辑权时以只读 Milkdown 渲染（不是 `<pre>`），SSE 推送下实时跟读 |
| 可访问性 | 保存态 `aria-live`、冲突 `role="alert"`、提议区 `role="region"`、状态按钮均带可读文本 |
| 文案 | `locale/{zh,en}.json`、`docs/DETAIL.md`、`THIRD_PARTY_NOTICES.md` 更新；版本号 0.2.0 |

### 已知缺口（明确记录，未在本次完成）

1. **浏览器 UI 未做最终目测**：插件重载（`plugin_manager set_plugin`）之后当前浏览器会话返回 `403 forbidden`，需要重新打开 `dsh web` 打印的带 `?token=` 的 URL 才能继续界面验收。
2. **块级 presence 只到"章节"**：客户端上报的是光标所在标题文本，不是 `blockId`（PM 位置与 Markdown 偏移没有同构映射）。要精确到块，需要在客户端复用 `parseBlocks` 并建立位置映射。
3. **合并只在接管/分区时用到**：正常编辑由排他租约保护；`mergeTexts` 已实现并有单测式冒烟，但"自动合并且无提示"的端到端场景还没在双设备上跑过。
4. **命令表是契约 + 断言而非单一注册表**：MCP 与 HTTP 仍是两段代码，靠 `contract-check` 防漂移；若后续工具继续增长，建议真正合并为一张表。
5. **`doc_patch` 的 ops 没有 JSON Schema**（MCP 侧用 `z.array(z.any())`），模型只能靠描述与错误信息学形状——后续应补 discriminated union schema。
6. **人类保存路径 (`write`) 不校验租约**：只靠 `expectedSha256` 的乐观并发。UI 已按租约把编辑锁成只读，但服务端没有二次校验；要"服务端强制排他"，需要在 `write` 前检查 `.live/locks`。
7. **研究遗留 `research/wysiwyg-spike` 已删除**（169 MB，Milkdown 选型已完成），`research/univer-spike` 保留（172 KB，评估存档）。


### M2.5 编辑器能力补齐（2026-11-21 追加）

首版只挂了 `kit` 的最小预设（commonmark + gfm + history + listener），所以看起来"简陋"——不是 Milkdown 不支持，而是**没有启用**它的交互插件。补的内容：

| 能力 | 实现 | 代价 |
|---|---|---|
| 格式工具栏 | 自研 13 个动作：正文/H1–H3、加粗、斜体、删除线、行内代码、无序/有序列表、引用、代码块、表格、分隔线、链接、撤销/重做 | 0（复用 preset 命令） |
| 工具栏图标 | 内联 SVG（替代 `B`/`•`/`❰` 之类文字字形） | 0 |
| 当前格式高亮 | `readFormat()` 读 marks + 祖先节点，`aria-pressed` 同步 | 0 |
| 任务清单 | 自研 `taskCheckbox` 装饰器（`Decoration.widget` + 直接事件），点击切换 `checked` | +5 KB |
| 空文档占位 | `:has(> p:only-child > br.ProseMirror-trailingBreak:only-child)` + `data-placeholder` | 0 |
| 编辑手感 | `plugin/cursor`（拖放/间隙光标）、`plugin/indent`（Tab）、`plugin/clipboard`（Markdown 复制粘贴）、`plugin/trailing`（文末可点空白） | +7 KB |
| 版式 | 正文列宽 860 px 居中、表格最小列宽、选择色、链接下划线厚度 | 0 |

**刻意没启用**（体积/维护成本不划算）：

- `component/list-item-block` / `component/table-block` / `component/code-block`：三者会把 `@milkdown/components` 的整条依赖拖进来（实测 +300 KB），且它们的 CSS 只存在于 Crepe 主题里，需要自己复刻 `.milkdown-*` 类名；任务清单用 5 KB 的装饰器已经够用。
- `plugin/slash`（斜杠菜单）：headless，需要自建弹层 UI；留到有真实需求再做。
- 语法高亮：会再引入 highlight.js/Prism 及主题，当前用等宽字体 + 底色。

体积：`client.js` 1,504,290 → **1,540,210 B**（+36 KB）。截图见 `research/agent-editor/screenshots/editor-before.png` 与 `editor-toolbar.png`。

**验证方式**：先在独立 harness（真实 Chrome，esbuild 打包同一组件）验证工具栏、格式态、加粗、任务勾选、空文档占位符、撤销；随后在 **DSH 真实面板**里完成端到端验证（见下）。

### 真实面板联调（2026-11-21）

在用户真实打开的 DSH 页面里跑通：

| 场景 | 结果 |
|---|---|
| Spaces 入口与空间列表 | 正常；计数显示 `2 文档 · 1 位成员`、`4 文档 · 2 旧格式 · 1 位成员` |
| 打开文档 | 只读首先呈现，横幅"这篇文档还没人在编辑"，按钮为「开始编辑」 |
| 取得编辑权 | 点击后约 1.2 s 授权，横幅消失、工具栏出现、状态变「已保存」 |
| 自动保存 | 输入文字后 0.7 s 内落盘，状态回到「已保存」，`read` 能看到正文变化 |
| 工具栏 | 「加粗」作用于选中文本，文件里出现 `**用于**` |
| 任务清单 | 点击复选框，文件里变成 `[x]`，复选框高亮 |
| 多标签页排他 | **用户在另一个标签页持有 `pages/333.md` 的租约**，我的标签页自动只读；同一设备不同标签页是不同 holder，互斥生效 |
| presence | 自己的设备不计数（"N 人在看"只显示他人），心跳 10 s |

**期间修复的 bug**（只有真机才能发现）：

1. **编辑器根节点被 React 复用成工具栏**：`readOnly` 为真时组件返回的树结构少一个兄弟节点，授权后 React 按位置复用 DOM，把 Milkdown 的 `.milkdown` 塞进了 `.dsh-md-toolbar`（实测工具栏高 373 px、编辑器嵌在其中）。改为**单一稳定树**（工具栏始终渲染，只读时 `hidden`），并给宿主 `flex:1; overflow:auto`。
2. **工具栏按钮在重构中被删掉**：导致客户端插件 `apply` 后渲染抛错、点击 Spaces 无反应。已恢复并加入构建后检查。
3. presence 把本机算进"N 人在看"：改为按 `device` 过滤。

截图：`research/agent-editor/screenshots/editor-dsh-panel.png`（真实面板）、`editor-before.png` / `editor-toolbar.png`（harness 前后对比）。


### 工具栏 2.0（2026-11-22）

首版只接了 13 个动作，命令面还有一大半没用。补齐后：

| 分组 | 动作 |
|---|---|
| 段落 | 正文 / 标题 1–6（`wrapInHeadingCommand(0..6)`） |
| 行内 | 加粗、斜体、删除线、行内代码、链接、插入图片（URL/相对路径）、清除格式 |
| 块 | 无序列表、有序列表、任务清单、增加缩进、减少缩进、引用、代码块、插入 3×3 表格、分隔线 |
| 表格（仅光标在表格内出现） | 上方/下方插入行、左侧/右侧插入列、删除选中行列、左/居中/右对齐 |
| 视图 | 撤销、重做、字数（不含空白） |

共 **33 个动作**（7 个标题 + 18 个常驻 + 8 个表格上下文）。实现细节：

- 任务清单切换是自己写的：对选中的 `list_item` 翻转 `checked`（`null ↔ false`），Markdown 保持 `- [ ]` 形态。
- 缩进/减少缩进调用 `sinkListItemCommand` / `liftListItemCommand`，payload 是 `schema.nodes.list_item`。
- 清除格式对选区内所有 mark 调 `removeMark`。
- 图片走 `insertImageCommand`（先弹 URL；上传是后续项）。
- 表格对齐 `setAlignCommand('left'|'center'|'right')`，会正确序列化成 `:---:`。
- 工具栏状态除了 `markdownUpdated`/`selectionUpdated` 外，还监听 `document.selectionchange`，否则在表格单元格之间点击时高亮会滞留。

**哪些"看起来缺"的功能是不会加的**（Markdown 表达不了，写进去就破坏"开放文本"契约）：字体、字号、字色、背景高亮、下划线、段落对齐、行距、首行缩进、上标/下标、分栏。要做这些等于要么往 `.md` 里写 HTML，要么换存储格式（HTML/JSON/富文本数据库）——这会推翻当前"文件即真相源、任何编辑器可打开"的前提，属于产品决策而不是补功能。

**期间修掉的三个 bug**：

1. `runInCtx(fn)` 被写成"返回执行函数"，导致缩进/任务/清除格式点了没反应（`onClick` 拿到的是函数不是执行结果）。
2. 工具栏状态在表格内不刷新：补 `document.selectionchange` 监听。
3. 任务清单里的嵌套列表被 flex 布局挤到同一行：改为 `grid-template-columns:20px 1fr`，嵌套列表落到内容列下一行。

体积：`client.js` 1,539,722 → **1,546,395 B**。截图：`screenshots/editor-toolbar-table.png`。

**验证**（真实面板）：表格上下文组出现（8 个按钮）；插入行（2→3 行）；`###` 标题降级；任务清单 `[ ] ↔ 无`；加粗 `**加粗**我。`；清除格式回到 `加粗我。`；表格居中序列化为 `| :-: |`；字数 29 字；缩进产生嵌套列表且布局正确。


### 切换到 Crepe（2026-11-22）

按"整体切换成 crepe，移除冗余代码"执行：自研工具栏、任务清单装饰器、主题 CSS 全部删除，编辑面交给 Crepe。

| 项 | 结果 |
|---|---|
| 组装方式 | `new CrepeBuilder({ root, defaultValue })` + 逐个 `addFeature`（不用 `new Crepe({ features })`：`Crepe` 静态引入所有 feature，关掉的 AI/LaTeX 也会进包） |
| 启用 | Cursor、ListItem、LinkTooltip、ImageBlock、BlockEdit（拖拽手柄 + 斜杠菜单）、Placeholder、Toolbar（选中气泡）、Table、CodeMirror、TopBar |
| 关闭 | LaTeX（KaTeX 字体无法单文件分发）、AI（编辑由 Host 工具驱动，不用它的指令调色板） |
| 主题 | `scripts/generate-crepe-styles.mjs` 构建时把 Crepe `common/*.css` 按 `@import` 内联、拼 `frame` 变量、再叠 `client-src/editors/dsh-crepe.css`，产出 JS 字符串模块（单文件 bundle 无法带 CSS sidecar） |
| 深浅色 | `--crepe-color-*` 映射到 `--dsw-alias-*`，跟随宿主主题；**不加载** `frame-dark.css`（无法跟随 `body[data-ds-dark-theme]`） |
| 删除 | `milkdownTheme.js`、`taskCheckbox.js`、18 按钮自研工具栏与 16 个 SVG 图标 |
| 保留 | `MilkdownEditor.jsx` 只剩桥接：单实例挂载、外部值无回声同步、只读切换、最近标题上报（presence 用） |

**体积**：`client.js` 1,546,395 → **3,123,158 B（2.98 MB 原始 / 678 KB gzip）**；低于全量 Crepe 估算的 904 KB gzip，因为按需 addFeature 去掉了 AI/LaTeX 与 barrel 其余代码。

**踩到的坑与修复**：

1. `Crepe` 类静态引入全部 feature → 5.7 MB；改 `CrepeBuilder` + 按需 `addFeature` 后 3.1 MB。
2. 主题 `@import` 需解析相对与裸路径（`@milkdown/kit/...`、`prosemirror-virtual-cursor/...`），并跳过 `latex.css` 与 `katex`（字体 URL 会 404）。
3. `--crepe-color-outline` 映射到 DSH 的 alpha 边框色后，Crepe 再 `color-mix(..., transparent 90%)`，表格线几乎不可见 → 改映射 `--dsw-alias-label-tertiary`，并显式给表格/分隔线/引用 32%–45% 边框色。
4. CodeMirror 自带浅色调色板：深色模式下代码块仍是白底 → 用 `--dsw-alias-*` 覆盖 `.cm-editor/.cm-gutters/.cm-activeLine/.cm-cursor`。
5. **租约续期未回写状态**：`leaseRenew` 成功后客户端仍用旧 `expiresAt`，90 秒后把自己判成只读（实际仍持锁）→ 回写 `setLease`，并抽 `leaseIsMine()` 让头部与编辑器用同一判定。
6. `SpaceDetail` 漏了 `mine` 参数（只传给了 `ContentPane`），整个 Spaces 面板渲染崩溃、点入口无反应 → 补参数。

**验证（真实面板）**：只读态隐藏顶栏与气泡；取得编辑权后顶栏 45 px 出现；输入自动保存；选中文本弹出 `.milkdown-toolbar`（44 px）；输入 `/` 弹出 `.milkdown-slash-menu`；表格边框可见；浅色/深色截图正常。截图：`screenshots/crepe-light.png`、`crepe-dark.png`。


### Crepe 能力补齐（2026-11-22 下午）

问题："是否打开了 crepe 全部能力？"——**没有**。12 个 feature 开了 10 个，且其中 3 个只吃了默认配置。本轮把默认配置的坑和两个真实缺口补上。

| feature | 状态 |
|---|---|
| CodeMirror / ListItem / LinkTooltip / Cursor / BlockEdit / Toolbar / Table / TopBar / Placeholder / ImageBlock | ✅ 开 |
| LaTeX | ❌ KaTeX 的 CSS 引用 20+ 个 woff 字体，单文件 bundle 发不出去；走 CDN 又违背离线/隐私前提 |
| AI | ❌ 需要 provider endpoint + key，而且它是"选中文字让 LLM 润色"的交互，与 Host 工具驱动的编辑重复 |

本轮补的配置与缺口：

1. **占位文案中文化**：Crepe 默认是英文 "Please enter…"，改为「开始写…（输入 / 插入块，或直接粘贴图片）」。
2. **图片上传真正可用**：新增 `uploadAsset`（HTTP-only）：base64 → 校验扩展名 + magic number（png/jpeg/gif/webp，拒绝 SVG）→ 落盘 `assets/<名字>.png`（保留中文名，重名自动 `-2`）→ 返回相对路径。客户端 `onUpload` 走 Host，插入时用带鉴权的 asset URL，保存时回写相对路径。
3. **图片 URL 回写修复**：Markdown 序列化器会把 URL 里的 `&` 转义成 `\&`，旧正则匹配不到，导致绝对 URL 被写进 `.md`。改为先还原 `\&`，再用 `URLSearchParams` 解析并校验 `space`，最后写回 `assets/…`。
4. **远端变更兜底**：`fs.watch` 在本机对原子写入（`.tmp` + rename）完全静默，SSE 从来不发 `fs-change`；代码注释里承诺的"polling fallback"其实只发了 tick。补成每 5 s 对整棵文件树做 `mtime:size` 快照 diff，变化后广播 `fs-change`；客户端据此 400 ms 防抖刷新目录树与计数。验证：通过 API 新建文档后，面板 5 s 内自动出现（之前必须重进空间）。

体积：3,124,494 → **3,125,054 B**（+0.6 KB）。

**验证**：上传接口 200 且 `image/png`、重名 `image-2.png`、伪造内容 `UNSUPPORTED_FORMAT`、SVG 被拒；拖拽 1×1 PNG 进编辑器 → 保存为 `![1.00](assets/拖拽图片.png)`（相对路径，无绝对 URL 泄漏）；新建文档 5 s 内出现在树中。

**已知小瑕疵**（Crepe 自身的取舍，未改）：图片缩放比例写在 `alt` 里（`![1.00](...)`，其他编辑器里会显示成 alt 文本）；Crepe 顶栏按钮没有 `aria-label`（无障碍缺口，快捷键可用）。
