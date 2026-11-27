# CoSpace (智联文档空间)

Let agents help draft and revise documents while you decide which changes take effect.

English | [中文](README.md)

CoSpace is a workspace for agents and personal documents. An agent can read documents you name, create a new document, or propose versioned edits at specific text ranges. Existing documents change only after you accept a suggestion. Overlapping edits are rejected to protect concurrent work.

## Get started

CoSpace has two product entry points. Check the [website](https://hanfang5057-byte.github.io/co-space/) for current availability and installation instructions:

| Entry point | Use case | Installation and status |
| --- | --- | --- |
| DSH plugin | Reference documents and review suggestions in DSH conversations | npm package `dsh-plugin-space`; add it from DSH's Plugins page or run `dsh plugin add dsh-plugin-space`. The published version requires Node.js 24+ and DSH `0.2.3-alpha.2` or later. |
| Local Server | Provide local document services to other agents that support stdio MCP | [Installation and configuration](apps/local-server/README.md). |

To discover the DSH plugin in its market, add the [market index](https://raw.githubusercontent.com/hanfang5057-byte/co-space/main/market/index.json) to DSH's Custom plugin indexes.

## How it works

CoSpace stores documents as Markdown. Agents propose versioned text replacements to existing documents; you review and accept or reject each one. Users can create a blank document, and agents can create documents with initial content. Comments are user-authored context and are sent to an agent only after the user explicitly asks it to handle them.

Documents and review records are stored in local SQLite. The DSH plugin and Local Server use separate data directories. MCP tools operate on explicitly named documents and do not enumerate documents.

## Architecture

One shared review core serves the DSH plugin and Local Server. Shared packages do not depend on a specific host; adapters and apps integrate through the host API, capability contract, and host-independent transports. Local Server uses `local-runtime`; DSH keeps its own runtime and data boundary.

See [system architecture](docs/09-host-adapters-architecture.md), the [adapter integration guide](docs/14-adapter-integration.md), and the [review core notes](docs/07-review-core.md) for detailed boundaries, integration steps, and review semantics.

## Development

Local Server development requires Node.js 22.22.2 or later.

```sh
npm install
npm run test:fast
npm run check
npm run build:dsh
```

Use `test:fast` during development; `check` runs the full suite, including local service, update, and rollback integration tests.

See the [unified release process](docs/16-release-process.md) for build and release commands. Build and verify each product from its own staging directory; the root workspace is private and must not be published.

## Project documentation

- [DSH plugin](adapters/dsh/README.md)
- [Local Server](apps/local-server/README.md)
- [Product plan](PLAN.md)
- [License](LICENSE): MIT
