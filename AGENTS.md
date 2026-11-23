# Repository Guidelines

## Project Structure

This repository is a private npm workspace for CoSpace (智联文档空间). `assets/cospace-icon.svg` is the shared brand icon source copied into each adapter's package at build time. `packages/review-core/` contains the SQLite-backed review core and Space service; `packages/review-ui/` contains shared review components; `packages/transport-mcp/` and `packages/transport-http/` contain host-independent transports. `adapters/dsh/` contains the DSH plugin runtime, client shell, locale, and plugin metadata. `adapters/workbuddy/` contains the WorkBuddy MCP + Skill Connector; `apps/review-web/` is reserved for a future standalone browser app. `scripts/build-client.mjs` builds the DSH client bundle and `scripts/build-dsh.mjs` assembles the npm package under `dist/dsh-plugin/`. `docs/` holds product and integration specifications. `test/` contains Node tests and MCP/host integration tests; `scripts/test-ui.sh` provides the simulated DOM UI flow.

## Build and Development

Use Node.js 24 or later. Run `npm install` to install workspace dependencies. Run `npm run build:dsh` to build the complete DSH package; `npm run build:client` only rewrites `adapters/dsh/client.js` and never updates `dist/dsh-plugin/`. Run `npm run dev:dsh` to watch `packages/`, `adapters/dsh/`, `assets/`, and `docs/` and rebuild `dist/dsh-plugin/` on each change when a linked local install is the test target. Run `npm run check` for the Node test suite and `sh scripts/test-ui.sh` for the simulated DOM UI flow. Run `npm run verify:dsh-package` to assemble and inspect the npm tarball without publishing it. Do not edit generated `adapters/dsh/client.js` or anything under `dist/` by hand.

## Code and Test Conventions

Follow nearby JavaScript conventions: ES modules, two-space indentation, semicolons, descriptive camelCase names, and explicit error codes for expected failures. Keep UI text and accessible labels clear; preserve the current document-selection, review, and manual comment-send behavior. Add or update focused tests for behavioral changes, especially persistence, conflicts, restart recovery, and host message outcomes. Tests use Node’s built-in test runner; the UI smoke test is a separate shell script.

## Architecture and Safety

Agent tools may create documents with initial content and propose changes to existing documents. Only user decisions accept or reject proposed changes. Preserve transactional persistence, overlap checks, and the distinction between accepted content and tracked suggestions. Treat comments as user-authored context and send them only after an explicit user action. Never log credentials or expose private document content unnecessarily.

Do not modify `packages/review-core/src/review-core.js` or change review-core behavior without the user’s prior explicit consent. Moving or packaging the file does not authorize behavior changes. First complete work that does not depend on such a change, then explain the concrete reason, proposed change, and impact and wait for consent. Keep unrelated existing worktree changes intact.

## Commits and Pull Requests

Recent history uses short, imperative commit subjects, often with a scope such as `docs:` or `feat:`. Follow that style when preparing commits. Pull requests should summarize user-visible behavior, list relevant checks (`npm run build:client`, `npm run check`, and UI smoke test when applicable), identify unverified host integration, and include screenshots for visual changes when available.

## Releases

For a release that publishes npm packages, create and push an annotated Git tag named `vX.Y.Z` after all packages have published successfully. The tag must point to the commit containing the release, and `X.Y.Z` must match `release/npm-version.json` and every published package version. Do not create release tags for ordinary commits or failed/partial releases; resolve a partial release before tagging.
