# CoSpace Local Server Requirements

> Historical planning record: the independent Local Server product has been retired. See the current desktop architecture and release documentation.

## Problem and goal

CoSpace needs a generic local integration for Agents that support stdio MCP. An Agent must be able to propose document changes through MCP while the user can review those proposals in a local web app after the Agent disconnects. Desktop and the generic Agent integration must share the same local service and data. The DSH plugin remains independent and keeps its own data and lifecycle.

## User stories

- As a user of a stdio MCP Agent, I can give the Agent a CoSpace setup prompt and have it configure CoSpace with the Agent's supported MCP configuration method.
- As a user, I can use CoSpace MCP tools without installing the Desktop app.
- As a user, I can close or disconnect the Agent and still open CoSpace to review pending suggestions.
- As a Desktop user, I see the same documents created by a connected generic Agent.
- As a user, I can uninstall an Agent integration or Desktop without deleting CoSpace documents.
- As a DSH user, I keep using the DSH plugin without requiring CoSpace Local Server.

## Acceptance criteria

### Agent and service lifecycle

- When an Agent starts the configured stdio MCP command, the Local Server client shall connect to a compatible running service or start one and wait for a successful health check.
- When the Agent disconnects, the Local Server shall continue serving the review UI and local APIs until the user explicitly stops it or the operating system ends the process.
- When two or more Agent MCP processes start concurrently, the Local Server shall have one service owner and all compatible clients shall connect to it.
- When the service is unavailable or incompatible, the MCP client shall return an actionable error without writing to stdout outside MCP frames.
- When a user requests service stop or restart while Agent MCP connections are active, the service manager shall refuse and explain that those Agents must disconnect first.
- When the Local Server starts for the first time, it shall make the review URL discoverable through the MCP connection and a service status/open command.

### Data and review

- When Desktop, Local Server MCP, and Local Server web UI access local documents, they shall use the same data directory and service owner.
- When Desktop manages Agent configuration, those host-specific operations shall remain in the Desktop integration boundary and shall not be exposed through the generic Local Server API.
- When the user uninstalls Desktop, the npm package, or an Agent configuration, those actions shall not delete the shared data directory.
- When the DSH plugin is installed or used, it shall continue using the DSH-owned data directory and shall not require the Local Server daemon.
- When an Agent proposes an edit, the accepted document content shall remain unchanged until the user accepts the suggestion in the review UI.
- When the service is upgraded, existing documents, suggestions, comments, and operation records shall remain available; migrations shall be recoverable from a pre-migration backup.

### Network and process safety

- When the Local Server binds an HTTP listener, it shall bind only to loopback and reject unexpected Host and Origin values.
- When a browser or MCP client calls a local API, the service shall authenticate the caller and apply a route-specific allowlist.
- When the stdio MCP process writes diagnostics, it shall use stderr or a protected log file and shall not leak document text, comment text, tokens, or credentials.
- When a process attempts to start a second daemon, the manager shall validate the existing process and endpoint rather than trusting a stale PID file.
- When the package is launched through npx, daemon code and web assets used after launch shall reside in a versioned user-managed runtime directory, not depend on npm cache retention.

### Installation and updates

- When the package is installed through `npx`, it shall require the documented Node.js version and run without a global CoSpace installation.
- When a new npm package version is published, running MCP and daemon processes shall not be replaced in place; updates shall take effect through a controlled service restart.
- When an update is incompatible with a connected client or data schema, the manager shall refuse an unsafe replacement and report recovery instructions.
- When a user stops the service, the manager shall close database and HTTP resources cleanly and preserve all user data.

## Scope

- Public npm package for a generic stdio MCP entry and local background service.
- Local review web app served from the same runtime.
- Shared runtime between Desktop and Local Server.
- Shared data for Desktop and generic Agent integrations.
- Agent setup prompt and generic, capability-aware instructions.
- Versioned runtime installation, status, stop, restart, upgrade, and rollback operations.

## Non-goals

- Moving DSH onto the Local Server or sharing DSH data.
- Guaranteeing automatic config-file edits for every Agent; Agents have different configuration formats and permissions.
- Cloud synchronization, remote hosting, user accounts, or document upload.
- Starting the service automatically at OS login in the first release.
- Changing review-core behavior or allowing Agents to accept/reject suggestions.
- Arbitrary local shell execution, filesystem browsing, or unrestricted HTTP RPC.

## Constraints and decisions

- Node.js 24 or later, matching the repository engine requirement.
- Keep dependencies directed from product apps/adapters toward shared packages.
- Keep `packages/review-core/src/review-core.js` behavior unchanged.
- DSH stays independent with its existing DSH-specific home resolution.
- Reuse Desktop's current data location (`~/.cospace/webapp`, overridable by `COSPACE_WEB_HOME`) initially to avoid making existing Desktop data appear missing. Any later path change requires an explicit migration.
