# CoSpace WorkBuddy MCP

Local stdio MCP server for managing personal documents and reviewing agent-proposed edits in WorkBuddy.

The server provides tools to create and read named documents, submit and inspect review suggestions, process document comments, and open the local review page. User data stays under `~/.workbuddy/space`; the review page binds only to `127.0.0.1`. This package does not read or import DSH data.

WorkBuddy can launch the public npm package with its managed Node runtime. Add this MCP server to WorkBuddy's user configuration:

```json
{
  "mcpServers": {
    "cospace-review": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "cospace-workbuddy-connector@latest"],
      "timeout": 30000,
      "runtime": {
        "type": "node",
        "version": ">=24.0.0"
      }
    }
  }
}
```

For reproducible installs, replace `latest` with a fixed package version. The server requires Node.js 24 or later. See the [CoSpace repository](https://github.com/hanfang5057-byte/co-space) for source and the separate macOS/Linux install, update, and uninstall script.

## Data and safety

- Documents and review state are stored locally in `~/.workbuddy/space`.
- The MCP server does not enumerate all documents; tools operate on named documents.
- Agent proposals remain suggestions until a user accepts them in the review page.
- The review page uses a temporary loopback-only service and does not expose a LAN endpoint.

MIT License. See `LICENSE`.
