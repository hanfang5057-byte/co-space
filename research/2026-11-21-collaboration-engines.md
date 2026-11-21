> **决策记录（2026-11-21）**：已确定采用**方案 A：文件级异步协同**，不引入 CRDT/实时协同。
> 本文件仅作为备选引擎调研存档，不代表当前实施方案。

# 多人协同引擎选型（DSH Space）

> 调研时间：2026-11-21 · 结论：**Yjs 是默认选择；实时协同用 Yjs + Hocuspocus；无中心 P2P 用 y-webrtc，但要接受运维复杂度。**

---

## 0. 先说结论

| 场景 | 推荐 |
|---|---|
| 异步协作（不同时间、离线编辑） | **不需要 CRDT**：Syncthing 文件同步 + `diff3` 三方合并 + 冲突文件即可 |
| 实时多人编辑、可接受一个轻量服务 | **Yjs + Hocuspocus**（自托管，MIT） |
| 实时多人编辑、必须无中心服务器 | **Yjs + y-webrtc**（WebRTC + 信令/TURN），或自建 CRDT update log over Syncthing |
| 结构化 JSON / 表格为主、看重 Git 式历史 | **Automerge / Automerge Repo** |
| 超大文档 / 块树 / 追求性能 | **Loro**（Rust/WASM，生态较新） |
| 已有中心服务、JSON OT | **ShareDB** |
| 想少运维、接受 SaaS | **Liveblocks**（Yjs 兼容，托管服务）或 **Y-Sweet**（可自托管） |

对 DSH Space 的建议：

1. **不要把 CRDT 当作存储格式**。Markdown / CSV / Marp 仍是事实来源；CRDT 只是“实时编辑会话”的内存/临时状态。
2. **先做文件级异步协作**（当前方案），它已经能覆盖大多数“多人先后编辑 + 同步”的需求。
3. 如果确实需要 Google Docs 式实时编辑，再加一个**可选的 Live 模式**：Yjs 文档 + Hocuspocus 服务；会话结束/空闲时序列化回 Markdown/CSV/Marp，再由 Syncthing 同步给离线设备。
4. 如果“无中心”是硬约束，用 y-webrtc；但需要信令服务器 + TURN，且所有协作者必须同时在线，可靠性不如 Hocuspocus。

---

## 1. 为什么“选一个 CRDT 引擎”还不够

多人协同不是只选一个库，它包含 5 层：

```text
编辑器绑定（CodeMirror / Tiptap / 自研表格）
        │
CRDT 文档模型（Yjs / Automerge / Loro）
        │
传输（WebSocket / WebRTC / BroadcastChannel / 自定义）
        │
持久化（快照 / 更新日志 / 对象存储）
        │
身份、权限、在线状态（Presence / Auth / ACL）
```

任何一层缺失，都会变成“看起来能协同，实际会丢数据”。CRDT 引擎只解决第 2 层。

---

## 2. 引擎对比

| 引擎 | 版本（2026-11） | License | 数据模型 | 优势 | 代价 / 风险 |
|---|---|---|---|---|---|
| **Yjs** | 13.6.33 | MIT | Y.Text / Y.Array / Y.Map / Y.XmlFragment | 生态最大；CodeMirror/ProseMirror/Tiptap/Monaco 绑定；awareness；二进制增量；Hocuspocus/y-websocket/y-webrtc 现成 provider | Markdown 并发合并可能产生语法错误；需要自己做 schema/校验/持久化 |
| **Automerge** | 3.5.0（repo 2.6 alpha） | MIT | JSON-like CRDT + change history | 适合结构化文档/表格；Git 式历史；离线合并强 | WASM/内存开销较大；传输/服务端要自己接；repo 仍在 alpha |
| **Loro** | 1.18.0 | MIT | Rich Text / List / Movable Tree / Map | Rust/WASM 性能好；富文本、块树、时间旅行 | 生态比 Yjs 小；provider 较少；团队使用案例少 |
| **ShareDB** | 8.0.0 | MIT | JSON OT | 中心服务简单、成熟；适合表格/结构化数据 | 非 CRDT、非离线优先；需要中心服务器；文本协同要 OT 适配 |
| **Y-Sweet** | 0.9.1 | MIT | Yjs 文档 | 自托管 Yjs 服务，持久化到 S3/文件系统；Rust | 需要部署；不是 P2P |
| **Liveblocks** | 3.25.2（client） | Apache-2.0 client / 商业服务 | Yjs 兼容 | 托管、省运维；Presence/Comments 完整 | SaaS、按量付费；数据出本机 |
| **Univer** | 1.5.x | 核心 Apache-2.0；Pro 协作商业许可 | 表格/文档/幻灯片 | 完整 Office UI + 公式引擎 | 协作能力在 Univer Pro，许可不适合“全开源”目标 |

> 版本与许可来自 npm registry；上线前请再次核对目标版本的 LICENSE。

---

## 3. 三种架构

### A. 文件级异步（当前方案，推荐先做）

```text
编辑器/Agent → Markdown/CSV/Marp 文件 → Syncthing → 其他设备
                                      └→ 冲突文件 → diff3 / 人工/Agent 合并
```

- 优点：简单、离线友好、与现有开放文本存储完全一致；不需要服务器。
- 缺点：不是实时；并发编辑会产生 `.sync-conflict-*`；合并粒度是文件。
- 适用：绝大多数“多人先后编辑”的场景。

### B. 实时 + 自托管（推荐用于真正的实时协同）

```text
浏览器 A ──WebSocket──┐
浏览器 B ──WebSocket──┼── Hocuspocus (Yjs) ── 持久化/序列化 ── Markdown/CSV/Marp
Agent    ──WebSocket──┘                         │
                                                └─ Syncthing → 离线设备
```

- **Yjs** 文档模型 + **Hocuspocus** WebSocket 服务；Hocuspocus 负责同步、awareness、持久化钩子、认证。
- 编辑器：CodeMirror 6 + `y-codemirror.next`（Markdown/Marp）；表格自研 grid 或 Tiptap（文档）。
- 持久化：`onStoreDocument` 里把 Y.Doc 序列化为 Markdown/CSV，原子写文件；Yjs 快照另存 `.space/collab/`（不同步）。
- 服务部署：可以跑在空间创建者的设备、NAS、或一台小服务器；不是 P2P，是“一个协作主机 + 多客户端”。
- 适用：团队实时编辑同一页/同一表格；接受一个轻量服务。

### C. 无中心 P2P

```text
浏览器 A ⇄ WebRTC ⇄ 浏览器 B
        ↖ 信令服务器（只交换 SDP/ICE）↗
```

- **y-webrtc**（MIT）提供 Yjs 的 WebRTC provider；需要信令服务器；NAT 严格时需要 TURN。
- 优点：数据不经过业务服务器；离线可用 IndexedDB。
- 缺点：所有协作者必须同时在线；y-webrtc 更新频率低（最近版本 2023）；TURN/信令运维；不适合大文档/多人网状连接。
- 另一种“无中心”做法：把每个设备的 Yjs update 追加到 `collab/<doc>/<device>.log`，用 Syncthing 同步日志，各端重放。延迟取决于文件监听（约 1–10 秒），属于“近实时”，且需要日志压缩/GC。工程量大，不建议首期。

---

## 4. 如果接入 DSH Space，怎么落地

### 4.1 数据模型映射

| 内容 | Yjs 模型 | 序列化 |
|---|---|---|
| Markdown 文档 | `Y.Text`（整篇）或 `Y.XmlFragment`（ProseMirror） | `ytext.toString()` → `.md` |
| Marp 幻灯片 | `Y.Array<Y.Map>`，每页一个 `markdown: Y.Text` + 元数据 | 拼接为 Marp Markdown |
| CSV 表格 | `Y.Array<Y.Map>`（行）+ 每单元格 `Y.Text`；列头单独 `Y.Array` | 生成 CSV |
| 评论 | `Y.Array<Y.Map>`（线程/锚点/解决状态） | 独立 `comments/<page>.json` |
| 在线状态 | Yjs awareness（光标、选区、用户名） | 不持久化 |

> 文档用 `Y.Text` 最简单；但 Markdown 语法在并发编辑时可能被破坏。更稳的是 ProseMirror/Tiptap 的 `Y.XmlFragment`，再序列化为 Markdown（会有格式损失）。MVP 建议源码编辑（CodeMirror + Y.Text），WYSIWYG 后续。

### 4.2 Agent 如何参与

- Agent 的 MCP 工具默认写文件；在 Live 模式下应改为：
  1. MCP server 作为 Yjs 客户端加入同一文档；
  2. 读取当前 `Y.Text`，与目标内容做 `diff-match-patch`；
  3. 把 diff 作为 Yjs transaction 应用，而不是覆盖整个文件；
  4. 等 Hocuspocus 持久化钩子写回文件。
- 这样人类正在输入时，Agent 的修改不会把对方刚写的内容冲掉。
- 如果 Agent 只写文件、不进 CRDT，实时编辑器需要监听文件变化并做三方合并，复杂度更高；不建议。

### 4.3 文件与 CRDT 的双向同步（最难的部分）

- Live 会话期间：以 Y.Doc 为准，定期/关闭时写文件。
- 离线设备修改文件后重新加入：需要把文件 diff 合并回 Y.Doc（以最后一次快照为 base 做三方合并），否则会覆盖。
- 建议：
  - 每个文档记录 `baseSha256` 与最后快照；
  - 加入会话时先比较文件哈希；不一致则提示“文件已被离线修改，选择合并/覆盖”；
  - 冲突无法自动合并时，保留 `.sync-conflict-*` 并阻止静默覆盖。
- 这是 Live 模式的主要风险，需要单独测试。

### 4.4 权限与身份

- CRDT 引擎本身没有权限模型。
- 沿用空间级信任：加入空间 = 可编辑全部内容；Live 服务用空间 token 认证。
- 不做页级 View/Comment/Edit；如未来要做，需要独立的权限服务，且 Syncthing 侧仍无法阻止直接读文件。

### 4.5 推荐依赖

```json
{
  "yjs": "^13.6.33",
  "@hocuspocus/server": "^4.9.0",
  "@hocuspocus/provider": "^4.9.0",
  "y-codemirror.next": "^0.3.6",
  "@codemirror/state": "^6.7.6",
  "@codemirror/view": "^6.x",
  "diff-match-patch": "^1.0.5"
}
```

可选：

- `y-indexeddb`（浏览器离线缓存）
- `y-protocols`（awareness）
- `@hocuspocus/extension-database`（持久化）
- `@automerge/automerge` + `@automerge/automerge-repo`（如果转向结构化 JSON）
- `y-webrtc`（如果必须 P2P）

---

## 5. 决策建议

1. **M1–M4 不做实时协同**：先把文件级同步、Page 树、Agent 工具、冲突解决做扎实。
2. **M5 可选 Live 模式**：Yjs + Hocuspocus，按空间开启；默认关闭。
3. **不要用 CRDT 替换 Markdown/CSV/Marp 存储**：保持开放文本为事实来源，CRDT 只是会话层。
4. **如果用户坚持“无中心”**：先评估 y-webrtc + TURN 的运维成本；多数团队最终会接受一个轻量 Hocuspocus/Y-Sweet 服务。
5. **如果表格是核心**：再评估 Univer Pro（协作是商业许可）或自研 Yjs 表格；CSV 场景不需要完整表格引擎。

---

## 6. 参考

- Yjs：<https://github.com/yjs/yjs> · <https://docs.yjs.dev/>
- Hocuspocus：<https://github.com/ueberdosis/hocuspocus> · <https://tiptap.dev/docs/hocuspocus>
- y-webrtc：<https://github.com/yjs/y-webrtc>
- Y-Sweet：<https://github.com/jamsocket/y-sweet>
- Automerge：<https://automerge.org/> · <https://github.com/automerge/automerge-repo>
- Loro：<https://loro.dev/> · <https://github.com/loro-dev/loro>
- ShareDB：<https://github.com/share/sharedb>
- Liveblocks：<https://liveblocks.io/>
- Univer：<https://github.com/dream-num/univer>
- CRDT 对比（2026）：<https://www.pkgpulse.com/guides/yjs-vs-automerge-vs-loro-crdt-libraries-2026>
