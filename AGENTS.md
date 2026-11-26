# Repository Guidelines

## Project Structure

This repository is a private npm workspace for CoSpace (智联文档空间). `assets/cospace-icon.svg` is the shared brand icon source copied into the DSH package at build time. `packages/review-core/` contains SQLite persistence and review semantics; `packages/host-api/` composes the shared service API; `packages/review-ui/` contains shared review components; `packages/adapter-contract/` defines host capabilities; `packages/transport-mcp/` and `packages/transport-http/` contain host-independent transports; `packages/local-runtime/` owns the shared local daemon, endpoint protocol, and lifecycle manager used by Desktop and Local Server. `adapters/dsh/` owns the independent DSH plugin runtime, host bridge, locale, capability declaration, and plugin metadata. `apps/desktop/` owns the Tauri desktop product, desktop web shell, Agent setup, and platform packaging. `apps/local-server/` owns the public `@cospace/local-server` npm CLI and bundles the shared runtime plus review web assets. Both Desktop and Local Server use the same local data home; DSH remains isolated. `apps/site/` contains the public install site. `scripts/build-client.mjs` builds the DSH client bundle and `scripts/build-dsh.mjs` assembles the npm package under `dist/dsh-plugin/`. `dist/` contains generated build and release artifacts and must not be edited by hand. `docs/` holds product, integration, and unified release specifications. `test/` contains Node tests and MCP/host integration tests.

## Build and Development

Use Node.js 24 or later and Rust stable for desktop builds. Run `npm install` to install workspace dependencies. Run `npm run build:dsh` to build the complete DSH package; `npm run build:client` only rewrites `adapters/dsh/client.js` and never updates `dist/dsh-plugin/`. Run `npm run dev:dsh` to watch `packages/`, `adapters/dsh/`, `assets/`, and `docs/` and rebuild `dist/dsh-plugin/` on each change when a linked local install is the test target. Run `npm run local-server:build` to bundle the Local Server CLI, daemon, MCP entry, and review web assets; `npm run local-server:pack` stages and verifies its npm tarball without publishing. Run `npm run desktop:dev` to launch the Tauri desktop app and `npm run desktop:package` to build the current platform installer(s); final artifacts are collected under `dist/releases/desktop/<platform>/`. `npm run desktop:smoke` checks the packaged Node sidecar and MCP entry. Local macOS packages use ad-hoc signing; public distribution requires Developer ID signing and notarization. Run `npm run verify:dsh-package` to assemble and inspect the DSH npm tarball without publishing it. Read `docs/14-adapter-integration.md` before adding or removing an adapter. Keep dependencies directed from apps and adapters toward shared packages; shared packages must not depend on product or host directories. Do not edit generated `adapters/dsh/client.js` or anything under `dist/` by hand.

## Code and Test Conventions

Follow nearby JavaScript conventions: ES modules, two-space indentation, semicolons, descriptive camelCase names, and explicit error codes for expected failures. Keep UI text and accessible labels clear; preserve the current document-selection, review, and manual comment-send behavior. Add or update focused tests for behavioral changes, especially persistence, conflicts, restart recovery, and host message outcomes. Changes to the host HTTP route need tests covering rejected, missing-service, and admitted requests. Tests use Node’s built-in test runner.

## Architecture and Safety

Agent tools may create documents with initial content and propose changes to existing documents. Only user decisions accept or reject proposed changes. Preserve transactional persistence, overlap checks, and the distinction between accepted content and tracked suggestions. Treat comments as user-authored context and send them only after an explicit user action. Never log credentials or expose private document content unnecessarily.

Browser-facing HTTP routes must apply the host's connection admission before dispatch, not just compare `Origin`/`Host` in the handler. In DSH call `ctx.connection.requestRejection({ headers: req.headers })` before dispatch and fail closed when the service is unavailable; recheck this seam when upgrading DSH.

Do not modify `packages/review-core/src/review-core.js` or change review-core behavior without the user’s prior explicit consent. Moving or packaging the file does not authorize behavior changes. First complete work that does not depend on such a change, then explain the concrete reason, proposed change, and impact and wait for consent. Keep unrelated existing worktree changes intact.

## Commits and Pull Requests

Recent history uses short, imperative commit subjects, often with a scope such as `docs:` or `feat:`. Follow that style when preparing commits. Pull requests should summarize user-visible behavior, list relevant checks (`npm run build:client` and `npm run check`), identify unverified host integration, and include screenshots for visual changes when available.

## Distribution and Compatibility

Keep the install surfaces in sync: `README.md`, `README.en.md`, `adapters/dsh/README.md`, `apps/site/index.html`, and `market/index.json` share the package name, `engines.dsh`, install commands, and plugin-index locations. Change them together.

Treat `market/index.json` as generated release metadata. After publishing, run `node scripts/sync-market.mjs`; do not hand-edit versions or publish timestamps. `node scripts/sync-market.mjs --check` must pass before a release. The index has a primary URL and mirrors; DSH accepts only a 2xx JSON response without redirects, so verify the host and mirrors from the network users actually use.

`engines.dsh` must name the range actually verified. After a DSH upgrade, recheck `ctx.connection.requestRejection`, `webServer.register`, MCP tool registration, and client slots in a clean profile before widening the range.

The external awesome-dsh-plugin listing is part of the distribution surface. Keep its subdirectory URL, tarball, and description aligned with the package and its verified security posture.

## Releases

Follow [docs/16-release-process.md](docs/16-release-process.md) for the unified DSH plugin, Local Server npm package, coordinated npm, and Desktop release procedures. It defines independent version sources, staging directories, package-specific tags, required checks, publish ordering, and post-publish verification. Never publish from the private workspace root or tag a failed/partial release.
