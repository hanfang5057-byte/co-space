# DSH Space 项目计划

当前方案以 [领域模型](docs/01-domain-model.md) 和 [审阅闭环](docs/02-review-loop.md) 为准：用户可以在 Space 页面新建空白文档，Agent 也可以创建带初始正文的文档；对已有文档提交具体建议，用户按审阅单位接受或拒绝。相邻修改可合并，实际重叠必须拒绝；评论由用户主动发送到当前对话。

现有内核以 Markdown 源文本和 SQLite 文本替换建议为事实模型。建议映射、冲突、评论锚点和历史数据库重置规则见 [审阅内核说明](docs/07-review-core.md)。

接下来的工作与验收见 [交付与验收](docs/06-delivery.md)：在真实 DSH 中验证左侧 Space 入口、对话多文件选择、[审阅界面](docs/03-ui-spec.md) 和评论发送，并扩展必要的文档结构支持。
