# CoSpace (智联文档空间)

![CoSpace app icon](assets/cospace-icon.svg)

English | [中文](README.md)

CoSpace lets you review the exact edits an agent proposes for your personal documents. You can create an empty document in CoSpace, and the agent can create a new document with complete initial content; changes to an existing document must be proposed as suggestions, and only your acceptance changes the accepted text. Adjacent edits can merge into one review unit, and genuinely overlapping submissions are rejected.

## Status

This repository is a private npm workspace for CoSpace. It contains the shared review core, shared review UI, adapter contract, host-independent transports, and the DSH adapter. Adapters connect the core to a host; the core does not depend on any host. See the [adapter integration guide](docs/14-adapter-integration.md).

Document text is stored and reviewed as Markdown source. The agent submits replacement suggestions with a document version and UTF-16 source ranges; paragraphs, headings, lists, tables, and links are all changed through ordinary text replacement. See the [review core notes](docs/07-review-core.md) for the full interface, coordinates, and safety limits.

## Install

The DSH plugin package is `dsh-plugin-space`, published on npm.

- **DSH Desktop / Web**: open **Plugins**, choose **Add plugin**, enter `dsh-plugin-space`, and enable it. A **CoSpace** entry appears in the sidebar.
- **CLI**: `dsh plugin add dsh-plugin-space`. This installs into the current profile; Desktop users should prefer the UI so the plugin lands in the running profile.
- **From the plugin market**: enable **Custom plugin indexes** under **Plugins → Experimental plugins**, then add `https://raw.githubusercontent.com/hanfang5057-byte/co-space/main/market/index.json` in **Discover → Add index source** and search for CoSpace (updates immediately; if it is unreachable, use `https://cdn.jsdelivr.net/gh/hanfang5057-byte/co-space@main/market/index.json`).
- **Offline / internal**: download `dsh-plugin-space-<version>.tgz` from [GitHub Releases](https://github.com/hanfang5057-byte/co-space/releases) and run `dsh plugin add ./dsh-plugin-space-<version>.tgz`.

The plugin declares `engines.dsh = ^0.2.2-rc.5` and Node.js 24 or later; recheck compatibility after a DSH major release. `adapters/dsh/client.js` is generated: run `npm run build:client` after changing `packages/review-ui/src/` or `adapters/dsh/client/`; do not edit generated files by hand. React is provided by the host and stays external in the client bundle.

## Entry points

- **CoSpace in the sidebar**: browse personal documents, read text and pending suggestions, and accept or reject each one. Selecting text in the rendered document shows a **Comment** button; saved comments appear in the margin lane on the right, where they can be deleted. Suggestions appear as a different color in the same lane, and the document keeps a fixed minimum width with horizontal scrolling when the window is narrow.
- **New document**: the **New document** button creates an empty document titled "Untitled document"; later title and body changes still go through agent suggestions.
- **Composer + menu**: reference one or more CoSpace documents in the current conversation as `space:<docId>`.
- **Document card**: a sent reference renders as a card; selecting it opens the right sidebar with that document's review pane, and a refresh restores the same document.
- **Comment-driven revision**: select text, choose **Comment**, write and save it, then choose **Ask the agent to handle comments**. DSH sends only the document reference and a short instruction; the agent reads comments through `space_document_read`, proposes changes, and records each outcome with `space_comment_complete`. Comment text is not included in the prompt. Comment and suggestion state stays in the review pane across refreshes.

## Data and privacy

- Documents, suggestions, comments, comment-handling results, and DSH conversation request records are stored locally in SQLite; set `DSH_SPACE_HOME` to choose the directory.
- When handling comments, DSH sends the reference and a short instruction through the host `sessionController.prompt`; comment text is not sent. Comment author information is limited to the display name and avatar the host account service already exposes; tokens, phone numbers, and email addresses are not read or recorded.
- MCP agent tools can create and read explicitly named documents, submit suggestions, query suggestion status, and record comment outcomes; there is no document enumeration. Accepted text changes only when the user accepts a suggestion.

## Limitations

- Markdown syntax is not restricted by a structural allowlist; a suggestion must match an exact source range at the named version, and overlapping edits are rejected. Text changes only after acceptance.
- A new document starts with the title "Untitled document" and an empty body; it cannot be edited directly afterwards, so title and body changes still require agent suggestions.
- When the version changes but a reference can still be located uniquely, comment anchors map to the new position; comments that cannot be mapped safely move to a "position lost" group and keep their reference without a text anchor.
- Comment-handling outcomes are recorded as separate operations; comments that need clarification keep their reason and state.
- UI copy follows the DSH language (Chinese / English); domain error messages returned by the server are displayed as-is.

## Development

Requires Node.js 24 or later:

```sh
npm install
npm run build:dsh
npm run check
```

The test suite covers real MCP stdio, SQLite storage, suggestion decisions, simulated comment handling, restart, conflicts, and process concurrency; it is not an end-to-end test of the DSH host UI. `sh scripts/test-ui.sh` runs the simulated-DOM UI flow.

### Build and release

- `npm run build:dsh` compiles the client bundle and assembles `dist/dsh-plugin/`, then refreshes the market index and icon from `packages/brand/metadata.json`.
- `npm run verify:dsh-package` rebuilds, validates the package, market index, and brand fields, and runs `npm pack --dry-run`.
- `npm run pack:dsh` writes the npm tarball to `dist/npm-packages/`.
- Before a release, run `node scripts/sync-market.mjs` to refresh published versions, timestamps, engines, and sort metrics from npm. `node scripts/sync-market.mjs --check` validates the index without network access. The index is mirrored on GitHub raw (`https://raw.githubusercontent.com/hanfang5057-byte/co-space/main/market/index.json`), jsDelivr (`https://cdn.jsdelivr.net/gh/hanfang5057-byte/co-space@main/market/index.json`), and GitHub Pages (`https://hanfang5057-byte.github.io/co-space/market/index.json`); the landing page is deployed by Pages.
- Release order: bump versions, build and verify, `npm publish ./dist/dsh-plugin`, sync and commit the index, then create and push the `vX.Y.Z` tag and attach the tarball to the GitHub Release.

See the [Chinese README](README.md) for the complete development notes and document list.

## License

MIT, see [LICENSE](LICENSE).
