# 智联文档空间（CoSpace）

让 Agent 帮你起草和修改文档，同时由你决定哪些修改真正生效。

[English](README.en.md) | 中文

CoSpace 面向 Agent 与个人文档协作。Agent 可以读取你指定的文档、创建新文档，或对已有内容提出带版本和位置的修改建议。已有文档只有在用户接受建议后才会改变；冲突修改会被拒绝，避免覆盖彼此的工作。

## 开始使用

CoSpace 提供两个产品入口，当前可用状态和安装方式见[官网](https://hanfang5057-byte.github.io/co-space/)：

| 入口 | 适用场景 | 安装与状态 |
| --- | --- | --- |
| DSH 插件 | 在 DSH 对话中引用文档并审阅建议 | npm 包 `dsh-plugin-space`；在 DSH 的 Plugins 页面添加，或运行 `dsh plugin add dsh-plugin-space`。当前发布版需要 Node.js 24+、DSH `^0.2.2-rc.5`。 |
| Local Server | 为其他支持 stdio MCP 的 Agent 提供本地文档服务 | [查看安装状态和配置说明](apps/local-server/README.md)。 |

如需从插件市场发现 DSH 插件，可将[市场索引](https://raw.githubusercontent.com/hanfang5057-byte/co-space/main/market/index.json)添加到 DSH 的 Custom plugin indexes。

## 工作方式

CoSpace 将文档保存为 Markdown。Agent 对已有文档提交有版本约束的文本替换建议；你可以逐条接受或拒绝。新文档可以由用户创建空白文档，也可以由 Agent 创建并提供初始正文。评论属于用户上下文，只有在用户明确触发处理后才交给 Agent。

文档和审阅记录保存在本机 SQLite。DSH 插件与 Local Server 各自使用独立的数据目录。MCP 工具针对指定文档操作，不提供文档枚举。

## 架构

一个共享审阅核心服务于 DSH 插件和 Local Server。共享包不依赖具体宿主；适配器和应用通过 host API、能力契约与通用传输层接入。Local Server 使用 `local-runtime`，DSH 保持独立运行时和数据边界。

详细边界、新增入口流程和审阅语义见[系统架构](docs/09-host-adapters-architecture.md)、[适配器接入规范](docs/14-adapter-integration.md)和[审阅内核说明](docs/07-review-core.md)。

## 本地开发

Local Server 开发需要 Node.js 22.22.2 或更高版本。

```sh
npm install
npm run check
npm run build:dsh
```

更多构建和发布命令见[统一发布流程](docs/16-release-process.md)。发布包和安装器应从各自的暂存目录构建、验证；根目录 workspace 是私有的，不可直接发布。

## 项目文档

- [DSH 插件说明](adapters/dsh/README.md)
- [Local Server 说明](apps/local-server/README.md)
- [产品计划](PLAN.md)
- [许可证](LICENSE)：MIT
