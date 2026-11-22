# Repository Guidelines

## Project Structure

This repository implements DSH Space, a local document review plugin. `src/` contains the SQLite-backed review core, Space service, and comment storage. `server/` contains the MCP tools and host HTTP/session bridge. `client-src/` contains the browser entry, review interface, and styles; `scripts/build-client.mjs` generates `client.js`. `docs/` holds the current product and integration specifications. `test/` contains Node tests, MCP/host integration tests, and UI smoke-test support. `cordis.patch.yml`, `icon.svg`, and `package.json` provide plugin metadata and assets.

## Build and Development

Use Node.js 24 or later. Run `npm install` to install dependencies and `npm run build:client` after changing browser sources. Run `npm run check` for the Node test suite. Run `sh scripts/test-ui.sh` for the simulated DOM UI flow; it installs its temporary test dependencies outside the repository. Do not edit generated `client.js` by hand.

## Code and Test Conventions

Follow nearby JavaScript conventions: ES modules, two-space indentation, semicolons, descriptive camelCase names, and explicit error codes for expected failures. Keep UI text and accessible labels clear; preserve the current document-selection, review, and manual comment-send behavior. Add or update focused tests for behavioral changes, especially persistence, conflicts, restart recovery, and host message outcomes. Tests use Node’s built-in test runner; the UI smoke test is a separate shell script.

## Architecture and Safety

Agent tools may create documents with initial content and propose changes to existing documents. Only user decisions accept or reject proposed changes. Preserve transactional persistence, overlap checks, and the distinction between accepted content and tracked suggestions. Treat comments as user-authored context and send them only after an explicit user action. Never log credentials or expose private document content unnecessarily.

Do not modify `src/review-core.js` or change review-core behavior without the user’s prior explicit consent. First complete work that does not depend on such a change, then explain the concrete reason, proposed change, and impact and wait for consent. Keep unrelated existing worktree changes intact.

## Commits and Pull Requests

Recent history uses short, imperative commit subjects, often with a scope such as `docs:` or `feat:`. Follow that style when preparing commits. Pull requests should summarize user-visible behavior, list relevant checks (`npm run build:client`, `npm run check`, and UI smoke test when applicable), identify unverified host integration, and include screenshots for visual changes when available.
