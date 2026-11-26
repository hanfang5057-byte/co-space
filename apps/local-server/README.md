# CoSpace Local Server

CoSpace Local Server provides stdio MCP tools and a local document-review web app. The Agent MCP process starts or connects to a separate local daemon. The daemon keeps serving the review page after the Agent exits.

## Configure an Agent

Add this stdio MCP server to an Agent that supports Node.js 24 or later:

```json
{
  "mcpServers": {
    "cospace": {
      "command": "npx",
      "args": ["-y", "@hanfang5057/co-space@latest", "mcp"]
    }
  }
}
```

Restart or reconnect the Agent after changing its MCP configuration. The review URL is returned by MCP and can be opened later with `npx -y @hanfang5057/co-space@latest service open`. Starting with the first release that includes automatic updates, the background service checks npm's `latest` release periodically, downloads and verifies it in the background, and switches versions when no Agent MCP connection is active. The first upgrade to that release still requires `npx -y @hanfang5057/co-space@latest service restart`; older daemons cannot update themselves. A service restart briefly disconnects the review page, which reconnects when reopened or refreshed. User data is kept in its existing data directory.

## Manage the local service

```sh
npx -y @hanfang5057/co-space@latest service status
npx -y @hanfang5057/co-space@latest service open
npx -y @hanfang5057/co-space@latest service stop
npx -y @hanfang5057/co-space@latest service restart
npx -y @hanfang5057/co-space@latest service rollback
```

Stopping the service preserves user data. Uninstalling the package or removing an Agent's MCP configuration also preserves data.
Stop or restart is refused while an Agent is actively connected; disconnect the Agent first.

## Local data

By default, CoSpace uses the existing Desktop data directory `~/.cospace/webapp`. Set `COSPACE_WEB_HOME` to select another profile. Desktop and all generic Agent integrations using the same profile share one service and dataset. The DSH plugin remains isolated under its DSH-specific data home.
