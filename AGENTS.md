# Repository Guidelines

## Project Structure

This repository is a private npm workspace for CoSpace (智联文档空间). `assets/cospace-icon.svg` is the shared brand icon source copied into the DSH package at build time. `packages/review-core/` contains SQLite persistence and review semantics; `packages/host-api/` composes the shared service API; `packages/review-ui/` contains shared review components; `packages/adapter-contract/` defines host capabilities; `packages/transport-mcp/` and `packages/transport-http/` contain host-independent transports; `packages/local-runtime/` owns the shared local daemon, endpoint protocol, and lifecycle manager used by Desktop and Local Server. `adapters/dsh/` owns the independent DSH plugin runtime, host bridge, locale, capability declaration, and plugin metadata. `apps/desktop/` owns the Tauri desktop product, desktop web shell, Agent setup, and platform packaging. `apps/local-server/` owns the publishable `@hanfang5057/co-space` npm CLI and bundles the shared runtime plus review web assets. Both Desktop and Local Server use the same local data home; DSH remains isolated. `apps/site/` contains the public install site. `scripts/build-client.mjs` builds the DSH client bundle and `scripts/build-dsh.mjs` assembles the npm package under `dist/dsh-plugin/`. `dist/` contains generated build and release artifacts and must not be edited by hand. `docs/` holds product, integration, and unified release specifications. `test/` contains Node tests and MCP/host integration tests.

Architecture invariant: one shared review core serves three product entry points—DSH plugin, Local Server, and CoSpace Desktop. Product apps and adapters depend inward on shared packages; shared packages must not depend on a host or product app. Desktop and Local Server share `packages/local-runtime/` and its local data home, while DSH retains its independent runtime and data home. Keep this boundary consistent in implementation, packaging, and user-facing architecture docs.

## Build and Development

Use Node.js 24 or later and Rust stable for desktop builds. Run `npm install` to install workspace dependencies. Run `npm run build:dsh` to build the complete DSH package; `npm run build:client` only rewrites `adapters/dsh/client.js` and never updates `dist/dsh-plugin/`. Run `npm run dev:dsh` to watch `packages/`, `adapters/dsh/`, `assets/`, and `docs/` and rebuild `dist/dsh-plugin/` on each change when a linked local install is the test target. Run `npm run pack:dsh` to verify and stage the DSH npm tarball; run `npm run local-server:pack` to stage and verify the Local Server tarball. Run `npm run desktop:dev` to launch the Tauri desktop app and `npm run desktop:package` to build the current platform installer(s); final artifacts are collected under `dist/releases/desktop/<platform>/`. `npm run desktop:smoke` checks the packaged Node sidecar and MCP entry. Local macOS packages use ad-hoc signing; public distribution requires Developer ID signing and notarization. `npm run verify:dsh-package` rebuilds and checks the DSH package, including loading the staged plugin entry outside the workspace so private workspace imports cannot be masked by root `node_modules`. Read `docs/14-adapter-integration.md` before adding or removing an adapter. Keep dependencies directed from apps and adapters toward shared packages; shared packages must not depend on product or host directories. Do not edit generated `adapters/dsh/client.js` or anything under `dist/` by hand.

## Code and Test Conventions

Follow nearby JavaScript conventions: ES modules, two-space indentation, semicolons, descriptive camelCase names, and explicit error codes for expected failures. Keep UI text and accessible labels clear; preserve the current document-selection, review, and manual comment-send behavior. Add or update focused tests for behavioral changes, especially persistence, conflicts, restart recovery, and host message outcomes. Changes to the host HTTP route need tests covering rejected, missing-service, and admitted requests. Tests use Node’s built-in test runner.

## Architecture and Safety

Agent tools may create documents with initial content and propose changes to existing documents. Only user decisions accept or reject proposed changes. Preserve transactional persistence, overlap checks, and the distinction between accepted content and tracked suggestions. Treat comments as user-authored context and send them only after an explicit user action. Never log credentials or expose private document content unnecessarily.

Browser-facing HTTP routes must apply the host's connection admission before dispatch, not just compare `Origin`/`Host` in the handler. In DSH call `ctx.connection.requestRejection({ headers: req.headers })` before dispatch and fail closed when the service is unavailable; recheck this seam when upgrading DSH.

Do not modify `packages/review-core/src/review-core.js` or change review-core behavior without the user’s prior explicit consent. Moving or packaging the file does not authorize behavior changes. First complete work that does not depend on such a change, then explain the concrete reason, proposed change, and impact and wait for consent. Keep unrelated existing worktree changes intact.

## Commits and Pull Requests

Recent history uses short, imperative commit subjects, often with a scope such as `docs:` or `feat:`. Follow that style when preparing commits. Pull requests should summarize user-visible behavior, list relevant checks (`npm run build:client` and `npm run check`), identify unverified host integration, and include screenshots for visual changes when available.

## Distribution and Compatibility

Keep each product's install surfaces in sync. DSH package name, `engines.dsh`, install commands, and plugin-index details belong in `README.md`, `README.en.md`, `adapters/dsh/README.md`, `apps/site/index.html`, and `market/index.json`. Local Server install and service instructions belong in the root READMEs, `apps/local-server/README.md`, and the site. Desktop availability, supported systems, and signing status belong in the root READMEs, `apps/desktop/README.md`, and the site. Do not imply that a staged package or installer has already been published.

Keep root READMEs as stable user-facing entry points: explain the product, supported entry points, install links, core review behavior, data boundaries, and where to find detailed docs. Avoid release snapshots, temporary staging status, exhaustive implementation notes, and duplicated step-by-step guides there. Treat the website as the source for current product availability, and keep Chinese and English READMEs aligned in scope and structure.

The DSH npm package must not rely on private `@cospace/*` workspace packages at runtime. Bundle private workspace imports into its staged entry points and leave only dependencies available from npm external. Verify loading from an isolated package directory, then install the tarball in a clean DSH profile using the host's Node runtime.

Treat `market/index.json` as generated release metadata. After publishing, run `node scripts/sync-market.mjs`; do not hand-edit versions or publish timestamps. `node scripts/sync-market.mjs --check` must pass before a release. The index has a primary URL and mirrors; DSH accepts only a 2xx JSON response without redirects, so verify the host and mirrors from the network users actually use.

`engines.dsh` must name the range actually verified. After a DSH upgrade, recheck `ctx.connection.requestRejection`, `webServer.register`, MCP tool registration, and client slots in a clean profile before widening the range.

The external awesome-dsh-plugin listing is part of the distribution surface. Keep its subdirectory URL, tarball, and description aligned with the package and its verified security posture.

## Releases

Follow [docs/16-release-process.md](docs/16-release-process.md) for the DSH plugin, Local Server npm package, coordinated npm, and Desktop release procedures. It defines independent version sources, staging directories, package-specific tags, required checks, publish ordering, and post-publish verification. A push to `main` that changes `apps/site/` deploys GitHub Pages automatically; publish and verify every npm package referenced by the site before that push. Never publish from the private workspace root or tag a failed/partial release.
