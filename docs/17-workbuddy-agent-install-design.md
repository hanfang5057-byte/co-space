# WorkBuddy Agent 安装方案

状态：历史记录；独立 Local Server 已退出当前工作区，桌面端接入以 [20](20-desktop-product-plan.md) 为准。本文以现有 Local Server 为基础；旧的 WorkBuddy Connector 探索记录见 [10](10-workbuddy-connector-development-plan.md)，不作为当前实现状态。

## 目标与交互

用户将官网提供的一段话发给 WorkBuddy，由 WorkBuddy 下载、检查并运行 CoSpace 的 `install.sh`。脚本安装用户级 MCP 和 `cospace-review` Skill，报告安装结果；WorkBuddy 按提示重新连接并验证。首期面向 macOS WorkBuddy，Windows 使用单独的 PowerShell 安装入口，待适配后提供。脚本设计保留客户端适配接口，首期不宣称支持其他 Agent。

拟提供的用户指令（以下地址为规划中的正式地址，脚本发布前不可用）：

> 请帮我安装 CoSpace，执行以下命令完成 WorkBuddy 的 MCP 和 Skill 安装。安装后重新连接 MCP，在新会话确认 CoSpace 工具和 Skill 可用，并告诉我结果。如果遇到已有配置冲突或权限问题，请先说明，不要覆盖我的配置。

```sh
curl -fsSL https://hanfang5057-byte.github.io/co-space/install.sh | bash
```

稳定入口规划为 `https://hanfang5057-byte.github.io/co-space/install.sh`，由网站构建将 `apps/site/legacy-local/` 的安装器与仓库内 Skill 合成为单个脚本，随网站部署提供。发布前需确认 Pages 构建包含该文件、实际地址返回预期脚本，并在无系统 Node 的环境中完成端到端验收。该地址是可更新的入口，并非版本固定或完整性保证。不要在脚本及依赖的 npm 包发布验证前上线这段提示词。

不在提示词中嵌入易过期的实现代码，也不把未发布地址当成可用链接。脚本需要清晰输出执行计划和变更结果，供 Agent 转达；在 Agent 非交互执行时，不依赖终端交互才能识别冲突。

## 运行时与启动方式

用户不需要单独安装系统 Node.js。优先验证 WorkBuddy 的托管 Node 方案：官方 [Connector 文档](https://open.workbuddy.cn/docs/connector) 描述了 v5.0.0 起通过 `runtime: { type: "node", version: ">=22.22.2" }` 为 stdio MCP 准备 Node。这个承诺针对 Connector，尚不能推断直接写入用户级 `mcp.json` 也支持该字段。先在目标 WorkBuddy 版本、无系统 Node 的干净环境中验证：自定义 MCP 是否处理该声明、是否能取得符合要求的 Node 与 npm，以及是否能启动并保持 Local Server 可用。

若自定义 MCP 支持，采用 WorkBuddy 托管运行时运行 `npx -y @hanfang5057/co-space@latest mcp`；不要硬编码 WorkBuddy 内部 Node 路径。如果不支持，则先验证官方支持的 Connector 安装入口是否能由 Agent 完成。若也不可用，再设计 CoSpace 自带、按平台分发且校验完整性的 Node 运行时及稳定启动器；不能假装系统 PATH 有 Node，也不能依赖未承诺稳定的 WorkBuddy 内部路径。最终采用哪条路径以实验为准，不在实现前承诺无系统 Node 的安装已可用。

`install.sh` 自身不得依赖系统 Node、npm 或用户手动预装的软件。配置解析和修改所需工具必须由安装方案提供或先检测并明确报错；不能用文本替换拼接 JSON。网络下载失败、运行时版本不兼容和包仓库不可达都应输出可操作的错误，避免部分安装被报告为成功。

## 安装与升级

1. 通过 HTTPS 官方稳定入口运行安装脚本。脚本自身通过管道直接执行，用户需信任该发布入口；对脚本获取的后续版本化安装资产，明确校验方式，并一并设计发布流程和校验文件。安装器不得把其他未经验证的可变下载内容直接管道送入 shell。
2. 检测操作系统、WorkBuddy 用户目录和可用的配置写入能力；存在目录只能说明发现候选安装，不能证明当前会话来自该 Agent。目标通过明确的 `--agent workbuddy` 指定；不支持或无法确认时停止并说明。
3. 检查现有配置、目标 Skill 和运行时方案，先输出计划。MCP 只合并 `cospace` 项，保留其他条目；配置无效、无法解析或文件正在发生变化时停止，绝不覆盖原文件。写入使用同目录临时文件和原子替换，保留权限并备份原配置。
4. Skill 使用仓库中的正式源文件，随同版本化安装资产发布到 `~/.workbuddy/skills/cospace-review/`。安装清单记录版本和受管理文件的摘要；重复安装可安全更新未被用户修改的内容。已有不同的同名 MCP 或 Skill、用户修改过的受管理文件，默认停止并展示差异或冲突位置；由用户明确选择后才能替换，且先备份。
5. 写入后校验 JSON、Skill 文件和所选运行时能力。安装阶段失败时尽可能回滚已写入的受管理文件；如果无法回滚，报告准确的部分状态和恢复方法。输出“配置已写入”，只有实际连接及调用成功后才报告“可用”。

安装器不读取或迁移 CoSpace 文档，也不启动需要用户授权的审阅操作。Local Server 默认数据位于 `~/.cospace/webapp`；多个连接同一 profile 的 Agent 共享数据，DSH 的数据保持独立。卸载设计只删除可证明属于安装器且未被用户修改的配置和文件，保留用户文档；有冲突时提示而不删除。Local Server 运行时及 Skill 的更新是独立环节：现有后台更新能力不等于 Skill 已自动更新，重新执行安装器负责更新 Skill。

旧版 Local Server 的更新器只接受声明 `>=24` 的包，无法自动切换到新声明 `>=22.22.2` 的版本。发布后，旧服务须在断开 Agent 后通过新版包手动重启一次；文档数据保留。

## Skill 与产品边界

将 `cospace-review` 的权威源文件纳入仓库和安装产物，而不是依赖开发者机器上的副本。Skill 与 MCP 的现有契约一致：仅处理用户指定文档；读取最新版本后提交建议；正文的接受或拒绝由用户决定；评论仅在用户明确发起时处理；创建文档需要明确请求。安装不会改变 review-core 行为或 DSH 适配器。

安装脚本、资产和宿主适配置于 Local Server 产品边界，不让共享包依赖 WorkBuddy。构建校验须验证 Skill 和安装资产进入实际发布产物。官网及中英文 README 在方案发布后同步入口和支持范围；不得提前宣称已经发布。

## 验证与交付门槛

- 用临时 HOME 测试首次安装、重复安装、升级、卸载、保留其他 MCP、无效 JSON、名称冲突、用户修改、写入失败、下载失败和中途失败恢复；不得操作测试者真实配置。
- 校验安装包文件、版本和完整性；在无系统 Node/npm 的干净 macOS 用户环境测试完整安装和冷启动，并验证 WorkBuddy 启动进程与审阅服务使用兼容运行时。
- 在真实 WorkBuddy 中记录版本和安装方式，确认连接状态、工具发现、Skill 被加载、创建测试文档及提出建议、浏览器打开审阅页、重连与重启；用合成内容，不读取用户文档。
- 同时验证 WorkBuddy 已有其他 MCP 和 Skill 保持可用；测试新安装、旧 CoSpace 配置冲突、升级 WorkBuddy 和重复执行。确认 Local Server 与 DSH 数据隔离。
- 完成上述验证并按 [发布流程](16-release-process.md) 发布必要 npm 包及安装资产之后，才在网站提供复制指令。发布说明写明验证过的 WorkBuddy、macOS 和运行时范围。
