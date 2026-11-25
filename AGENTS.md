# Repository Guidelines

## Project Structure

This repository is a private npm workspace for CoSpace (智联文档空间). `assets/cospace-icon.svg` is the shared brand icon source copied into the DSH package at build time. `packages/review-core/` contains the SQLite-backed review core and Space service; `packages/review-ui/` contains shared review components; `packages/adapter-contract/` defines the host capability contract; `packages/transport-mcp/` and `packages/transport-http/` contain host-independent transports. `adapters/dsh/` contains the DSH plugin runtime, client shell, locale, capability declaration, and plugin metadata. `adapters/webapp/` contains the Tauri desktop shell, Node service sidecar, browser-based shared workbench, and Agent integration. `apps/review-web/` contains the local WebApp HTML entry and product notes. `scripts/build-client.mjs` builds the DSH client bundle and `scripts/build-dsh.mjs` assembles the npm package under `dist/dsh-plugin/`. `docs/` holds product and integration specifications. `test/` contains Node tests and MCP/host integration tests; `scripts/test-ui.sh` provides the simulated DOM UI flow.

## Build and Development

Use Node.js 24 or later and Rust stable for Tauri builds. Run `npm install` to install workspace dependencies. Run `npm run build:dsh` to build the complete DSH package; `npm run build:client` only rewrites `adapters/dsh/client.js` and never updates `dist/dsh-plugin/`. Run `npm run dev:dsh` to watch `packages/`, `adapters/dsh/`, `assets/`, and `docs/` and rebuild `dist/dsh-plugin/` on each change when a linked local install is the test target. Run `npm run check` for the Node test suite and `sh scripts/test-ui.sh` for the simulated DOM UI flow. Run `npm run tauri:dev` or `npm run tauri:build` to prepare the Node sidecar and start or package the Tauri WebApp. Run `npm run verify:dsh-package` to assemble and inspect the npm tarball without publishing it. Read `docs/14-adapter-integration.md` before adding or removing an adapter. Each adapter owns its host declaration, bridge, lifecycle, and product build; `review-core` must not depend on adapter packages or host identifiers. Do not edit generated `adapters/dsh/client.js` or anything under `dist/` by hand.

## Code and Test Conventions

Follow nearby JavaScript conventions: ES modules, two-space indentation, semicolons, descriptive camelCase names, and explicit error codes for expected failures. Keep UI text and accessible labels clear; preserve the current document-selection, review, and manual comment-send behavior. Add or update focused tests for behavioral changes, especially persistence, conflicts, restart recovery, and host message outcomes. Changes to the host HTTP route need tests covering rejected, missing-service, and admitted requests. Tests use Node’s built-in test runner; the UI smoke test is a separate shell script.

## Architecture and Safety

Agent tools may create documents with initial content and propose changes to existing documents. Only user decisions accept or reject proposed changes. Preserve transactional persistence, overlap checks, and the distinction between accepted content and tracked suggestions. Treat comments as user-authored context and send them only after an explicit user action. Never log credentials or expose private document content unnecessarily.

Browser-facing HTTP routes must apply the host's connection admission before dispatch, not just compare `Origin`/`Host` in the handler. In DSH call `ctx.connection.requestRejection({ headers: req.headers })` before dispatch and fail closed when the service is unavailable; recheck this seam when upgrading DSH.

Do not modify `packages/review-core/src/review-core.js` or change review-core behavior without the user’s prior explicit consent. Moving or packaging the file does not authorize behavior changes. First complete work that does not depend on such a change, then explain the concrete reason, proposed change, and impact and wait for consent. Keep unrelated existing worktree changes intact.

## Commits and Pull Requests

Recent history uses short, imperative commit subjects, often with a scope such as `docs:` or `feat:`. Follow that style when preparing commits. Pull requests should summarize user-visible behavior, list relevant checks (`npm run build:client`, `npm run check`, and UI smoke test when applicable), identify unverified host integration, and include screenshots for visual changes when available.

## Distribution and Compatibility

Keep the install surfaces in sync: `README.md`, `README.en.md`, `adapters/dsh/README.md`, `apps/site/index.html`, and `market/index.json` share the package name, `engines.dsh`, install commands, and plugin-index locations. Change them together.

Treat `market/index.json` as generated release metadata. After publishing, run `node scripts/sync-market.mjs`; do not hand-edit versions or publish timestamps. `node scripts/sync-market.mjs --check` must pass before a release. The index has a primary URL and mirrors; DSH accepts only a 2xx JSON response without redirects, so verify the host and mirrors from the network users actually use.

`engines.dsh` must name the range actually verified. After a DSH upgrade, recheck `ctx.connection.requestRejection`, `webServer.register`, MCP tool registration, and client slots in a clean profile before widening the range.

The external awesome-dsh-plugin listing is part of the distribution surface. Keep its subdirectory URL, tarball, and description aligned with the package and its verified security posture.

## Releases

For a release that publishes npm packages, create and push an annotated Git tag named `vX.Y.Z` after all packages have published successfully. The tag must point to the commit containing the release, and `X.Y.Z` must match `release/npm-version.json` and every published package version. Do not create release tags for ordinary commits or failed/partial releases; resolve a partial release before tagging.

Run `npm run check` and `npm run verify:dsh-package` before publishing; do not publish with unexplained test failures. Build from the release commit, not a dirty worktree. If unrelated changes are present, build and publish in a separate clean worktree so those changes are not bundled. Publish the staged `dist/dsh-plugin` package (never the private workspace root) first, then sync and commit `market/index.json`, push so the configured static host redeploys, tag the release commit, and attach the packed tarball to the GitHub Release. Verify the registry `latest` version and the release asset digest match.
