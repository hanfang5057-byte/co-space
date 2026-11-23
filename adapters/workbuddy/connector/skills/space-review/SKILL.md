---
name: space-review
description: Manage local Space documents and review agent-proposed edits without applying them automatically.
version: 0.1.0
author: DSH Space
---

# Space 文档审阅

使用 `space_*` 工具管理保存在本机的 Space 文档。Space 数据与 DSH 插件数据完全隔离。

## 修改文档

1. 对 `space:<docId>` 引用调用 `space_document_read`，先读取最新 Markdown 正文和版本。
2. 把每个独立修改写成一条 `space_suggest`。`from` / `to` 是 UTF-16 半开区间；`expected` 必须与该区间的原文完全相同。提交前不要假定正文仍是之前读到的版本。
3. 建议提交后，说明“建议待审，正文尚未改变”。调用 `space_review_open` 获取文档审阅链接并提供给用户。
4. 只有用户在审阅页明确接受建议后，才能称为已应用。拒绝、冲突、过期或 pending 都不能说成已完成。
5. 用户作出决定后调用 `space_suggestion_list`，确认每条建议的实际状态。

## 新建和查看

- 使用 `space_documents` 浏览文档；创建新文档时使用 `space_document_create` 并传入稳定唯一的 `operationId`。
- 用 `space_review_open` 返回 Space 首页或指定文档的审阅链接。
- 不要访问或修改文件系统、SQLite 文件或 DSH 目录；不要自行决定接受或拒绝建议。
- 页面服务停止时，请让用户重新打开 WorkBuddy 后再试；不要把旧页面状态说成最新状态。

## English

Read the latest document before proposing edits. Submit each independent change as a separate suggestion and tell the user that the accepted document is unchanged until they decide in the review page. Use `space_review_open` to return a review link and `space_suggestion_list` to confirm the user's decision. Never edit local files or the database directly, and never claim a pending, rejected, conflicted, or stale suggestion was applied.
