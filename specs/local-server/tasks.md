# CoSpace Local Server Implementation Plan

Tasks are ordered to validate the process/data model before adding broad Agent support. Implementation checks below refer to code and build artifacts; a checked item does not imply real Agent/OS acceptance unless stated.

- [ ] 1. Validate runtime and storage assumptions
  - Prototype one daemon owner plus two stdio MCP clients against a temporary data home.
  - Verify daemon survives MCP client exit and browser can still load the review page.
  - Confirm Desktop's current service and MCP entry can be moved behind a shared service API without changing review-core behavior.
  - Decide the minimum Node runtime accepted by target Agents and record tested Agent/OS combinations.
  - _Requirement: Agent and service lifecycle; Data and review_

- [x] 2. Define shared runtime package and local protocol
  - Add `packages/local-runtime` with path resolution, health/version protocol, service composition, and single-instance lifecycle.
  - Add loopback HTTP routing for web API and a separate allowlisted authenticated MCP RPC.
  - Implement daemon ownership so only the daemon opens `SpaceService` and `CollaborationStore`.
  - Add local endpoint discovery and actionable stale/unauthorized/incompatible service errors.
  - _Requirement: Agent and service lifecycle; Network and process safety_

- [x] 3. Build stdio MCP client and CLI
  - Add `apps/local-server` with `mcp` and `service status|open|start|stop|restart|rollback` commands.
  - Adapt the existing MCP server to a remote service facade; preserve tool schemas and review semantics.
  - Ensure stdio stdout contains only protocol frames and diagnostics use stderr/logs.
  - Return a review URL after relevant document operations without opening a browser unexpectedly.
  - _Requirement: Agent and service lifecycle; Network and process safety_

- [x] 4. Package and make runtime cache-independent
  - Bundle MCP, daemon, shared workspace code, and review web assets into one npm package.
  - Copy versioned daemon assets atomically to the platform app-data runtime directory before starting the daemon.
  - Add package metadata, `bin`, Node engine, `files`, and npm scripts; exclude user data and private build files.
  - Verify the staged package contents and create a packed tarball. Clean-directory install and npx-style runtime acceptance remains in task 8.
  - _Requirement: Installation and updates_

- [x] 5. Unify Desktop with the shared runtime (implementation)
  - Change Desktop startup and UI API wiring to ensure/connect the shared daemon rather than independently owning the database.
  - Keep Desktop UI, Tauri shell, and Agent setup as Desktop-specific responsibilities.
  - Reuse `COSPACE_WEB_HOME` and the existing `~/.cospace/webapp` default so current Desktop data remains visible.
  - Handle the case where Desktop and npm package versions differ using runtime/protocol compatibility checks.
  - Desktop packaged-app and shared-data acceptance remains in task 8.
  - _Requirement: Data and review; Installation and updates_

- [ ] 6. Add versioned upgrade and rollback (implementation partial)
  - Implement package-version detection, active-client tracking/draining, staged asset installation, graceful restart, and health verification.
  - Retain current and previous runtime bundles and document explicit rollback.
  - Add schema compatibility checks and backup/restore handling before any future data migration.
  - Configure `next` prerelease and `latest` stable release channels.
  - Implemented versioned asset installation, hash validation, active MCP leases, and explicit rollback command. Schema migration backup/restore and channel promotion remain release/acceptance procedures, not automated migration behavior.
  - _Requirement: Installation and updates; Data and review_

- [x] 7. Publish setup prompt and support guidance (initial)
  - Add a website prompt for stdio MCP setup with `@latest`, plus an optional pinned-version example.
  - Explain how the Agent's configuration is changed, how to reconnect MCP, and how to open/stop the review service.
  - Add a per-Agent compatibility table only for configurations exercised on real supported versions.
  - No Agent compatibility claims are made until real configurations are exercised.
  - Document Node requirements, local data location, uninstall retention, and recovery steps.
  - _Requirement: Scope; Installation and updates_

- [ ] 8. Validate acceptance and release
  - Verify two Agents and Desktop see the same document/suggestion state through one daemon.
  - Verify DSH remains isolated and works with Local Server stopped.
  - Verify Agent exit, daemon restart, port collision, stale lock, cache cleanup, version upgrade/rollback, and package uninstall retention.
  - Run repository checks, package verification, and supported OS/Agent acceptance; publish only from a clean release commit.
  - _Requirement: all_
