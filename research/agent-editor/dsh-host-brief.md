# Host 侧扩展机制技术简报（DSH `0.2.2-rc.5`）

> 版本基准：`apps/cli/package.json` → `0.2.2-rc.5`。全部结论来自官方 `dsh-doc` skill 参考文档 + 源码 + 本机 `cordis_inspect` 的实时 provider 目录。未修改任何文件、未安装插件、未动 profile。

---

## 1. 插件 / bundle 的目录结构与 manifest

**结论**：一个 bundle = 一个普通 npm 包 + `package.json` 的 `dsh.bundle.patch` 指向一份 Loader patch YAML。Host-only 形态**不需要**依赖、构建脚本或打包工具。

**证据**：`references/host-plugin.md:9-27`；patch 方言见 `references/composition-reference.md:7-20`；模板 `templates/decoration/package.json`。

```json
{
  "name": "@local/doc-coedit", "version": "1.0.0", "private": true, "type": "module",
  "exports": { ".": "./index.js", "./client": "./client.js",
               "./locale/*.json": "./locale/*.json", "./icon": "./icon.svg" },
  "files": ["index.js", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg"],
  "engines": { "dsh": "^0.2.2-rc.5" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true,
                "inject": ["@deepseek-ai/dsh-client-ui-conversation"] }
  }
}
```

- **patch 方言**（`composition-reference.md:7-20`）：`insert: [rows]` 追加；带 `id` 无 `insert` 则**覆盖**该行，且 `config` 是整体替换、不深合并（必须重述全部字段）；`group: true` + `name: cordis:group` 让 `config` 成为可被 insert 的子列表；`cordis:include` 载入外部 YAML；`!!js` 只在 `config` / `disabled` 内求值；行字段为 `id`、`name`（包说明符）、`config`、`disabled`、`inject`、`intercept`、`isolate`。
- **`engines.dsh`**（`dsh-version.md:5-11`）：装了它则**只有它**决定兼容性，DSH peer 依赖被忽略；预发布必须原样写在左边界 —— 对 `0.2.2-rc.5` 用 `^0.2.2-rc.5`。
- **`exports` 约定**：运行时 `.` 必须有；`./client` 供 Web 半；`./locale/*.json` 供 `meta.title/description/detail`；`./icon` 供图标（≤256 KiB，禁软链出包）。

---

## 2. Host 入口（`index.js`）的导出形态

**结论**：三种互斥形态（`host-plugin.md:62-67`）——① `export function apply(ctx, config)` + 可选 `export const inject = [...]` + 可选 `export const Config`；② 默认导出一个 Service class。**没有** `start`/`stop`/`dispose` 钩子：所有注册都是**上下文拥有的 effect**，资源必须在 `apply` 内用 `ctx.effect` / `ctx.on` 注册并返回清理函数。

```js
export const name = 'doc-coedit'                    // Loader 诊断名
export const inject = ['tools', 'fs', 'sessionProjections']   // 硬依赖；缺失则该行不激活
export const Config = z.object({ pollMs: z.number() })        // @deepseek-ai/schemastery 的 z
export function apply(ctx, config) { /* 一切注册都在这里，返回清理 */ }
```

**证据**：`references/host-plugin.md:62-67`（两种导出，禁止混用、`Config` 在激活时校验该行 `config`）；真实插件范例 `packages/context/time-context/src/index.ts:44-63`（`export const name` / `export const inject = ['agents','sessionProjections']` / `export const Config: z<Config> = z.object({...})`）。可选服务用 `inject` 或 `ctx.inject([...], cb)`，否则在缺该服务的 profile 里会抛错（`practices.md:20`）。

⚠️ 注意 `z` 有两个来源：**Config 用 `@deepseek-ai/schemastery`**，**projection / 状态 schema 用 `zod`**（`time-context/src/index.ts:10-11` 同时导入两者）。零依赖的纯 JS bundle 可以不声明 `Config`，直接从 `apply` 的 `config` 参数取默认值。

---

## 3. 工具（Tool）定义形状

**结论**：用 `defineTool()` 声明，注册进 `ctx.tools`。`register(definition, { when })` 的 `when` 是**按每个模型步骤**求值的可见性条件——这就是官方的"按需/条件加载"。

**证据**：`packages/core/tools/src/contracts.ts:27-103`（`ToolDefinition`）、`:116-125`（`ToolRegistrationOptions.when`）、`:106-113`（`ToolActivationContext`）；`src/schema.ts:494-540`（`DefineToolOptions`）、`:501`（`deferLoading`）；`packages/core/tools/README.md` 的 "Register a tool" 与 "Conditional tools"。

```ts
ctx.tools.register(defineTool({
  name: 'doc_propose_edit',
  description: 'Propose a textual edit to the open document.',
  parameters: {                                  // 隐式 open object 根；逐属性 required: true
    path:   { type: 'string', required: true, description: 'Absolute path' },
    oldText:{ type: 'string', required: true },
    newText:{ type: 'string' },
  },
  output: { schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
            render: (_a, v) => [{ type: 'text', text: JSON.stringify(v) }] },
  timeoutMs: 10_000,
  isConcurrencySafe: () => false,
  async execute(args, exec) { return doEdit(args, exec.signal) },  // 只回 canonical JSON 值
}), { when: ({ agent, modelSelection, signal }) => hasOpenDoc(agent) })
```

- **参数 DSL**：`string|number|integer|boolean|null|array|object|json|oneOf`，必填是**属性级** `required: true`（`schema.ts:25-104`），不是 JSON Schema 的 `required: []` 数组。
- **返回值**：`execute` 只返回 `output.schema` 声明的丢真 JSON 值；模型看到的内容由**纯函数** `output.render(args, value) → ContentBlock[]` 产生；`presentCall/presentResult` 是纯展示投影（会话回放时会重跑，故必须无副作用、不得抛错）。`projectContent` / `finalizeContent` 是内容后处理钩子（`contracts.ts:41-62`）。
- **错误约定**：普通失败**不结束回合**；参数校验失败自动变成普通错误结果（`ToolArgsError`）。策略层用 `tools/pre-execute`（waterfall，返回 `allow|deny|cancel|ask`，`contracts.ts:375-379`）与 `tools/post-execute`（`accept|block`，`:386-389`）；`tools/result` 只观察最终结果。
- **需用户批准**：**没有声明式字段**。唯一官方路径是 pre-execute 返回 `{ kind: 'ask', reason, displayReason: { en, zh } }`，由 `ctx.approval.request(req): Promise<ApprovalOutcome>` + `user-approval` 应答者落地。**只读标注**：定义里也没有 readonly 位——只能靠 `guard`/`when`/restrict 或 sandbox policy 表达。
- **流式**：**工具不支持流式输出**。流式只属于 `agent/assistant-stream`。
- **分组 / 按需加载**：三层——`deferLoading: true`（请求"延迟加载定义"，`:201`）、`when` 条件（按步剔除声明与派发）、`ctx.tools.restrict({allow,deny})` 按 Agent 收窄。`resolve({agent,modelSelection,signal})` 产出 step 拥有的 `ResolvedToolSet`，再传给 prompt assembly 与该批 `ctx.tools.execute()`。

---

## 4. Agent / Session 事件与注入

**结论**：**会话日志是唯一真相源**（`practices.md:7`）。Host 侧订阅走 Cordis 事件总线（`ctx.on('event', fn)`，按声明模式 emit / serial / parallel / waterfall / bail 派发）；派生状态**不要**自己订阅 `session/event` 重扫，而应注册 `ctx.sessionProjections` 单元。

**关键事件（`cordis_inspect` host `Event.listEvents`）**：

| 事件 | 模式 | 签名要点 |
|---|---|---|
| `session/event` | emit | `(session: Session, event: SessionEvent)` 提交后即发、fire-and-forget |
| `session/flush` | parallel | 耐久检查点，调用方 await 全部 |
| `agent/created` | serial | `{ agent, source, signal }`，创建完成前依次 await |
| `agent/assistant-stream` | emit | `{ agent, frame: AssistantStreamFrame }` |
| `tools/pre-execute` / `tools/execute` / `tools/post-execute` / `tools/result` | waterfall/emit | 见 §3 |
| `turn/end`、`assistant/message`、`tool/result` | 会话事件 | 耐久（可等等待） |

`AssistantStreamFrame`（`packages/core/agent/src/runtime-types.ts:155-184`）= `{type:'start', attemptId, revision, turn, step}` | `{type:'chunk', attemptId, revision, index, time, chunk: StreamChunk}` | `{type:'end', ..., outcome: {kind:'committed', eventType, seq} | {kind:'abandoned'}}`。`StreamChunk` 含 `text-delta`/`reasoning-delta`/`tool-call-delta`/`block-end`/`usage`/`finish` —— 思考与 token 流都在这里。

**Session 事件 payload（`SessionEventMap`，经 inspector 取得）**：`turn/start {turn}`、`turn/end {turn, reason}`、`step/start|end`、`user/message`、`assistant/message {turn, step, message, stream: AssistantStreamRecord[], usage?, interrupted?}`、`tool/call {callId, name, arguments}`、`tool/result {message, error?, meta?}`、`request/header`、`request/context`。**todo / plan 不是事件类型**，而是各插件通过 `sessionProjections` 注册的投影单元（`plan-mode`、`todo` 包）——聚合状态请读投影而不是解析消息。

**回放**：`Session.snapshotEvents(from, toExclusive)` / `eventAt(seq)` / `deriveMessages()`；冷读路径 `sessionProjections.restore(checkpoint, events, baseSeq, header, inheritedEventCount)` / `hydrate(...)`。

**向运行中 Session 注入 / 打断**（`runtime-types.ts:213-271`）：

```ts
agent.followup(msg)   // 排队为下一回合的普通 prompt，并唤醒 driver
agent.steer(msg)      // 提交给最近一个 step；空闲则开新回合
agent.inject(msg)     // 只排队模型可见上下文，不唤醒（会记 agent/inbox/spliced，进入下一个被接纳的 step）
agent.cancel({ kind: 'user' }, { keepInbox })  // 打断当前活动
await agent.whenIdle()
```

拿到 Agent：`ctx.agents.get(id)` / `ctx.agents.list()`；`agent.session`、`agent.ctx`（Agent 作用域）、`agent.status`。

---

## 5. 文件与工作区能力

**结论**：`ctx.fs` 是抽象文件系统 seam（`fs-local` / `fs-sandbox` / ssh 后端可换），**有 watch**，**有版本守卫**；工作目录由独立服务 `ctx.workingDirectory` 管；客户端另有 `remote.workspaceFiles` 一族（含 `changes` 流）。

**证据**：`dsh-doc` + `cordis_inspect` host `Service.listService{service:'fs'}`；`packages/fs/fs/src/types.ts`。

```ts
const target = await ctx.fs.resolve(path, { cwd, signal })   // → FsTarget{targetKey, displayPath}
await ctx.fs.readText(target, signal)                        // 整文件 UTF-8
await ctx.fs.streamText(target, signal)                      // AsyncIterable<string>
await ctx.fs.readByteRange(target, { offset, length }, signal)
await ctx.fs.listDir(target, signal)                         // 直接子项，稳定名字序
await ctx.fs.stat(target, signal)                            // FsInfo{version,type,size?} | undefined
await ctx.fs.writeText(target, content, expected?, signal?, sandboxPolicy?)  // 原子
await ctx.fs.editText(target, { oldString, newString, replaceAll }, { version }?, signal?)
await ctx.fs.patchText(target, hunks, { version }?, signal?)
await ctx.fs.deleteFile(target, { version }?, signal?)
const close = await ctx.fs.watch(target, (err?) => {...}, signal)   // 就绪后 resolve，返回异步 close
```

- **路径解析**：`resolve` 是 async（远程后端需往返），相对路径对 `opts.cwd` 解析；返回的 `targetKey` 当作不透明标识，跨 OS 能力要用 `processPath(target)`。
- **版本守卫**：`FsWriteIntent = {kind:'createIfAbsent'} | {kind:'replaceIfVersion', version}`；过期报 `FS_STALE_VERSION`，失配报 `FS_PATCH_MISMATCH`。
- **对协同编辑极有价值**：`fs/write-intent`、`fs/edit-intent`、`fs/delete-intent` 是 **single-slot waterfall**（`(target, actor, next)`），`fs/observed` 记录观测；可用来把 Agent 的写入意图拦下来先给人确认，或做冲突检测。
- **工作目录**：`ctx.workingDirectory.get(session)` / `ensure(agent)` / `set(agent, path)` / `defaultDirectory`；客户端读文件用 `remote.workspaceFiles.read|readBytes|stat|list|search(sessionId, path, ...)` 与 `changes(sessionId, path, signal)` 流（Host 用 sandbox policy 解析 workspace root，客户端不自报根）。

---

## 6. 服务发现与依赖

**结论**：依赖 = `inject` 数组（硬依赖，缺失即不激活）或 `ctx.get('name')`（软依赖，需判 undefined）；也可 `ctx.inject([...], cb)` 分段激活。

**`cordis_inspect` 可查的 provider**（本机实测目录）：

- host：`Service.listService`（省略 `service` 得紧凑能力目录；给 key 得完整方法签名 + 引用类型声明）、`Event.listEvents`、`Config.listConfigs`（分页条目目录 / 单条 JSON Schema，含 `packageDir`）、`Runtime.getVersion`、`Tool.listTools`（当前 Agent 可见工具）。
- client：`Service`、`Event`、`Builtin`、`Slots.listSubTree`、`Theme.listTokens`。

常见服务（均为 inspector 实测存在）：`tools`、`fs`、`sessions`/`sessionProjections`、`agents`、`agentLoop`、`commands`、`systemPrompt`、`approval`、`userQuestions`、`actionCards`、`webServer`、`webApp`、`connection`、`typert`/`typertGateway`、`clientModules`、`workingDirectory`、`workspaceFiles`、`workspaceRegistry`、`workspaceController`、`storageDomain`、`credentials`、`configEditor`、`timer`、`terminalController`、`subagents`、`jobs`、`skills`。

- **logger**：`ctx.logger.info/warn/...`。
- **持久化配置**：**禁止**自己读写 profile 的 `cordis.patch.yml`；用
  ```js
  const entry = ctx.fiber.entry, editor = ctx.get('configEditor')
  await editor.edit(entry, current => ({ ...current, field: value }))   // `configuration.md:5-10`
  ```
  普通字段改动会重启该插件；`.volatile()` 字段原地生效、用 `config.field.get()` 读。
- **自有持久数据**：`ctx.storageDomain` + `defineDomain({name, version, tables})` / `domainTable(schema)`（`packages/storage/storage-domain`），同步读、耐久写、带变更事件。
- **密钥**：`ctx.credentials.modifyRecord(key, mutate)`，不要放 config。
- **MCP / 调度**：存在 `mcp-manager/status` 与 `schedule/changed` 事件；其 service key 我未逐个确认（见 §9）。

---

## 7. 给"编辑器插件"的职责切分与 Host→Client 通道

**Host 侧必须承载**：Agent 可调用的 tool；`ctx.fs` 的读写与 `watch`；`fs/*-intent` 拦截；`sessionProjections` 单元（纯同步 fold，`stateVersion` 变更时 bump）；`agent.inject/followup/steer/cancel`；`ctx.actionCards.register(kind)` 的人类决策。

**必须交给客户端 UI**：一切渲染（React 组件进 slot）、主题令牌、locale、焦点/快捷键；**不得**由 Host 供 HTML 页嵌 iframe（`practices.md:33`）。

**官方推送通道（按对本地 bundle 的可用性排序）**：

1. **Session 投影 + 客户端订阅（首选，无需代码生成）**
   Host：`sessionProjections.register({ key, stateSchema, init, apply, stateVersion, wire: { viewSchema, view, summary? } })` → `Promise<ProjectionHandle<S>>`；`apply` 纯同步、忽略的事件返回同一引用即零成本，`view()` 返回值不变则抑制发布。
   客户端：在 slot props 的选择器里读该 key（框架负责增量与回放）。CLI 侧对应 `remote.session.projections/observeProjections/events/observeEvent/follow/state/observeState/wait/control`（`packages/api/session-controller/src/index.ts:517-604`，全部 `@Remote`，`follow`/`observeEvent`/`observeProjections`/`control` 为 `mode:'stream'`）。
2. **插件自持 WebSocket 路由（完全自定义全双工）**
   ```ts
   ctx.webServer.registerUpgrade({
     path: '/api/doc-coedit/live',                       // 绝对路径，无尾斜杠
     handler: (req, socket, head, peer) => { /* 自管协议协商与握手后 socket */ },
     auth: /* 默认 required，匿名处理器可能拿不到 peer */,
   })
   ```
   （`packages/host/webserver/src/index.ts:149-156`；另有 `register(route)` `:117-125`、`registerUpgrade`、`tapIndex`。）
3. **`@Remote({mode:'stream'})` 自有命名空间**：需要 Typert 严格生成物（`ctx.typert` + 构建期 codegen）。SRC 回退仅供开发，**没有 Client 类型投影、不是正常 Client contribution 输入**（`packages/api/gateway/README.md:29,90-91`）→ 不建议本地 bundle 承担。
4. **转发 Cordis 事件** `ctx.remote.$on`：仅限 `API_REMOTE_FORWARDED_EVENTS` 白名单，新增一项要改 DSH 包源码（`packages/api/remotes/README.md`）→ 本地 bundle 用不了。
5. **人类决策**：`ctx.actionCards.act(agent, cardId, verb, payload)`（`@Remote`，读 Session 里的 `action-card` 围栏块），kind 的 handler 里用 `ctx.actionCards.record()` 回写；适合"接受/拒绝这个编辑块"。

**双向流语义**（若走 `@Remote` stream）：`RemoteStream<Out, In>`，方法内用 `this.ctx.invocation.uplink()` 读上帧；`signal` 是元数据不入参；每流上行缓冲默认 262144 字节。

---

## 8. 最小可运行骨架

`cordis.patch.yml`：
```yaml
- insert:
    - id: doc-coedit
      name: '@local/doc-coedit'
      config: { pollMs: 800 }        # 被 Config 校验；改这里而非代码
```

`index.js`（Host，零依赖纯 JS）：
```js
import { defineTool } from '@deepseek-ai/dsh-tools'   // 来源：dsh 安装解析，本地包不声明依赖

export const name = 'doc-coedit'
export const inject = ['tools', 'fs', 'workingDirectory']   // host-plugin.md:64

// 来源：time-context/src/index.ts:60 —— Config 用 schemastery 的 z；纯 JS 可省略
export function apply(ctx, config) {
  const pollMs = config.pollMs ?? 800

  // 来源：contracts.ts:27-40 + schema.ts:494-540
  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'doc_open',
    description: 'Open a document for collaborative editing.',
    parameters: { path: { type: 'string', required: true } },        // 属性级 required
    output: { schema: { type: 'object', properties: { version: { type: 'string' } } },
              render: (_a, v) => [{ type: 'text', text: `opened ${v.version}` }] },
    async execute(args, exec) {
      const cwd = ctx.workingDirectory.get(exec.agent?.session) // 路径基准来自这里
      const target = await ctx.fs.resolve(args.path, { cwd, signal: exec.signal })
      const info = await ctx.fs.stat(target, exec.signal)
      return { version: String(info?.version ?? '') }
    },
  })))

  // 来源：cordis_inspect fs.watch 签名；写意图 waterfall 见 Event 目录 fs/write-intent
  ctx.effect(() => {
    const ac = new AbortController()
    void (async () => {
      const t = await ctx.fs.resolve(openPath, { cwd })
      const close = await ctx.fs.watch(t, () => ctx.logger.info('doc changed'), ac.signal)
      ac.signal.addEventListener('abort', () => void close())
    })()
    return () => ac.abort()
  })

  // 来源：action-cards README —— 人类决策入口（用户点击才执行）
  ctx.actionCards.register({ /* action, details schema, verbs, handler */ })
}
```

`client.js`（浏览器半，`ui-plugin.md:3-13`）：`window.__ModuleLoader__.load({ id: '<包名>', factory(require) { return { inject: ['slots'], apply(ctx) { ctx.slots.inject(<slot>, () => ctx.slots.register({ name, id, order }, Component)) } } } })`。工厂必须无副作用，资源在 `apply` 内用 `ctx.effect`/`ctx.on` 注册并返回清理。

---

## 9. 未验证 / 风险点

1. **未验证**：本地 bundle 能否零 codegen 新增 `@Remote` 命名空间。文档只说 SRC 是"开发回退"且"没有 Client 类型投影"，未明确浏览器侧能否调用 → 方案假设：**不要依赖**，走 §7 的 1/2/5。
2. **未验证**：`mcp manager`、`scheduler` 的**服务 key**。我只确认了 `mcp-manager/status`、`schedule/changed` 事件；service 名需 `cordis_inspect Service.listService` 逐个核对。
3. **未验证**：Service class 形态的 `start/stop` 生命周期命名。`host-plugin.md:62-67` 只列两种导出形态与"在 `apply` 内注册 effect"，未给 class 生命周期钩子签名；建议按函数式写。
4. **构建成本**：模板的 `client.js` 是手写 `__ModuleLoader__` 工厂；要写 TSX / 多文件就得用部署的 Client 构建工具产同格式（`ui-plugin.md:9`），本地 bundle 会引入构建链。
5. **无声明式"需批准/只读"**：tool 定义里两者都不存在，只能 `pre-execute → ask` + `approval`，或 `guard`/`when`。若架构师假设有 `requiresApproval` 字段，会返工。
6. **不要**自造 Session 事件类型：`Session.append()` 无法设 `ignorable: true`，新类型会让 Session 无法重开；`appendPluginRecord()` 仅限 DSH 实验包（`practices.md:21`）。
7. **不要**自己订阅 `session/event` 重扫日志做 UI 派生（`practices.md:26`），用 projection；projection 状态必须是**纯 JSON**、`stateVersion` 变更要 bump，否则陈旧检查点会被误用。
8. **性能陷阱**：`whenIdle()` 不等于"某个后续动作完成"，多个输入可共享一个运行区间；定时器要 `agent.followup()` 才能唤醒（`inject` 不唤醒）（`practices.md:28-29`）。
9. **版本**：`engines.dsh` 若不写左边界预发布后缀（`^0.2.2`），会被 `0.2.2-rc.5` **拒绝**。
10. **未执行验证**：本次为只读调研，没有安装、没有实际加载、没有浏览器验证；所有签名来自文档 + 源码 + inspector，非运行期回放证明。
