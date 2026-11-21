# DSH Space

把本地文件夹变成可邀请他人、跨设备 P2P 同步的“空间”：

- 文档：Markdown（`.md`）
- 表格：CSV（`.csv`）
- 幻灯片：Marp Markdown（`.md` + `marp: true`）

所有内容都是开放文本；没有 MS Office 存储，也没有中心服务器。同步由本机 Syncthing sidecar 完成，冲突以 `.sync-conflict-*` 暴露，并提供三方合并工具。

在 DSH 侧边栏打开 **Spaces**，或让 Agent 调用 `mcp__space__*` 工具。
