---
name: cospace-review
description: Read and propose reviewed changes to CoSpace documents using its MCP tools.
---

# CoSpace document collaboration

- CoSpace exposes MCP tools, not MCP resources. Use `space_document_read`, `space_suggest`, `space_suggestion_list`, and `space_comment_complete` directly. Use `space_document_create` only when the user explicitly asks to create a document.
- Only work on an existing document when the user provides its `space:<docId>` reference. Never enumerate documents or choose one yourself.
- Read the latest document version before proposing changes.
- Submit each independent change as a CoSpace suggestion. Never directly overwrite accepted document content.
- The user alone accepts or rejects suggestions in the CoSpace workbench. Do not claim a proposal was applied before checking its status.
- CoSpace has two distinct review operations. Autonomous review means review accepted content and propose improvements independently; comments are not instructions in this mode, so do not process or complete them. Comment-based revision means work only on comments the user asked you to process. When the user names comment IDs, process only those IDs. When the user asks to process comments in a document without naming IDs, process all comments whose latest read status is pending. Interpret each body with its quote and anchor, and submit a concrete `space_suggest` for each clear, locatable request, even when it is ordinary feedback. Do not add autonomous review suggestions outside those comments. For example, “去掉” on quoted text means propose deleting that text. If the user explicitly asks for both, keep the two scopes distinct.
- For comment-based revision, read the specified document and use its latest comment statuses to determine the authorized scope; do not process accepted, rejected, or already processed comments. Call `space_comment_complete` for each requested comment and link its related suggestion IDs. If intent or location is genuinely unclear, explain why, ask when needed, and leave that comment pending. Never send comments on the user's behalf.
- Creating a document requires an explicit user request.
