# CoSpace Local Server

CoSpace Local Server provides stdio MCP tools and a local document-review web app. The Agent MCP process starts or connects to a separate local daemon. The daemon keeps serving the review page after the Agent exits.

## Configure an Agent

Add this stdio MCP server to an Agent that supports Node.js 22.22.2 or later:

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

Restart or reconnect the Agent after changing its MCP configuration. The review URL is returned by MCP and can be opened later with `npx -y @hanfang5057/co-space@latest service open`. The service checks npm's `latest` release, stages a verified version and waits for both Agent connections and review pages to close before switching. The version indicator shows update progress and why a staged update is waiting. `service status` also reports the active connections and update state. The service attempts to keep its existing port; if it is unavailable, open CoSpace again to get the new address.

Launching a newer CLI also requests a switch to its staged version. Older services that lack the upgrade protocol cannot switch automatically: save edits, close review pages, disconnect Agents, then run `npx -y @hanfang5057/co-space@latest service restart` once. An incompatible old service may not be able to detect open review pages, so close them before restarting. User data is kept in its existing data directory. If a candidate fails its health check, the service attempts to restart the previous runtime; data migrations must be independently compatible with rollback.

## Manage the local service

```sh
npx -y @hanfang5057/co-space@latest service status
npx -y @hanfang5057/co-space@latest service open
npx -y @hanfang5057/co-space@latest service stop
npx -y @hanfang5057/co-space@latest service restart
npx -y @hanfang5057/co-space@latest service rollback
```

Stopping the service preserves user data. Uninstalling the package or removing an Agent's MCP configuration also preserves data.
Stop or restart is refused while an Agent or review page is actively connected; close them first. Legacy services may not track review pages.

## Develop from the workspace

With Node.js 22.22.2 or later, run `npm install` and `npm run dev:local` at the repository root. The command builds and opens a separate development service, watches its source dependencies, and rebuilds on save. Refresh the page after a successful rebuild. The terminal reports errors without replacing the running service when a build fails. If an Agent is connected, the restart waits until it disconnects. Press Ctrl-C to stop; the development documents are preserved.

Development data defaults to `cospace-local-dev` under the system temporary directory. Set `COSPACE_DEV_HOME` to use another directory. Automatic npm updates are disabled for this service. To connect an Agent to the running development service, use `node` with the absolute path to `scripts/dev-local.mjs` followed by `mcp`; set the same `COSPACE_DEV_HOME` in the Agent environment when using a custom directory. This connection does not use the normal Local Server profile.

After stopping the watcher and disconnecting Agents, `node scripts/dev-local.mjs clean` removes accumulated development runtime builds without deleting documents.

## Local data

By default, CoSpace uses `~/.cospace/webapp`. Set `COSPACE_WEB_HOME` to select another profile. Agent integrations using the same profile share one service and dataset. The DSH plugin remains isolated under its DSH-specific data home.
