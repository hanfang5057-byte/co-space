# 智联文档空间（CoSpace） for WorkBuddy

WorkBuddy MCP + Skill Connector for local document review. The connector stores its data only under `~/.workbuddy/space` and serves the shared Space review UI from a loopback-only HTTP server. It does not read or import DSH data.

## Build

From the repository root, install this adapter's dependencies and build the testable Connector package:

```sh
npm install --prefix adapters/workbuddy
npm run verify:workbuddy-package
```

The generated package is `dist/workbuddy-connector/`. It contains the WorkBuddy-only MCP runtime, shared review core and UI bundles, Connector metadata, MCP configuration, icon and Skill. Do not edit generated output by hand. Use root `npm run pack:npm` to create both npm archives at the shared version.

## Private Connector installation

`install.sh` installs or updates the published public npm MCP package by adding one managed entry to the user's `~/.workbuddy/mcp.json`. It resolves the current `latest` npm version at install/update time, pins that exact version in WorkBuddy's config, and declares WorkBuddy-managed Node runtime (`>=24`). It requires Bash and Python 3; it does not require system Node or npm. The config is backed up before every change, and other MCP entries are preserved.

```sh
bash adapters/workbuddy/install.sh install
bash adapters/workbuddy/install.sh update
bash adapters/workbuddy/install.sh uninstall
bash adapters/workbuddy/install.sh uninstall --purge-data --yes
```

Uninstall preserves `~/.workbuddy/space` by default. Data removal requires `--purge-data`, asks for a `DELETE` confirmation, and requires WorkBuddy to be closed first; `--yes` skips the prompt for a non-interactive flow. For the one-line `curl | bash` distribution, host the built `install.sh` from `dist/workbuddy-connector/` at a stable HTTPS URL. The installer has no embedded package version; the build generates `release.json` and market `mcp.json` from the version in this package manifest. The package itself is published from `dist/workbuddy-connector/runtime-package/`, not from this private source directory.

The installer edits the on-disk MCP config only. WorkBuddy reload behavior varies by client version and is not forced by the script; if the new server does not appear, restart WorkBuddy.

## Local WorkBuddy verification

`dist/workbuddy-connector/mcp.local.json` is a developer-only config generated with the current local Node executable and absolute bundled runtime path; use it only for local verification in WorkBuddy's MCP manager. The market `mcp.json` uses the published npm package name and is not installable until that package is published.

The local MCP process exposes document tools over stdio. When a review page is requested, it starts or reuses a temporary OS-managed user service: launchd in the current macOS GUI session, `systemd --user` on Linux, or an interactive one-time Task Scheduler task on Windows. These services are not configured to start at login. On Linux without a working user systemd manager, the review page reports an actionable error instead of relying on a detached process that the host may kill. The sidecar binds only to an ephemeral `127.0.0.1` port and unloads after 30 minutes without activity. Browser requests and every MCP document-service call refresh this sliding idle timeout. The sidecar stores mode-0600 lifecycle metadata in the WorkBuddy data root and requires a random per-run token on its health endpoint. The connector prints no diagnostics to stdout.

## Data isolation

The connector always uses `~/.workbuddy/space`; there is no data-directory override or setup screen. It validates the path and an ownership marker before opening SQLite. It refuses symlinked roots or an unmarked pre-existing database. The DSH adapter's existing `DSH_SPACE_HOME` behavior is unchanged by this adapter; both default roots are separate and WorkBuddy never reads the DSH path or data. The review server binds only to loopback and uses a random port, so it does not claim DSH's fixed port or expose a LAN service.

## Included capabilities

- List, create and read local documents.
- Submit and inspect review suggestions using the shared MCP tools.
- Open the shared review UI to accept or reject suggestions and manage local comments.
- No WorkBuddy conversation injection, comment sending, account profile lookup, file-system tools or cross-host data import.
