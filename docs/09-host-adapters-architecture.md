# 09 · CoSpace System Architecture

This page records the current architecture. The normative adapter contract is [14 · Adapter Integration Contract](14-adapter-integration.md).

## Current dependency direction

```mermaid
flowchart LR
  HOST[DSH host] --> DSH[adapters/dsh]
  DESKTOP[Tauri desktop app] --> DESKTOPAPP[apps/desktop]
  DSH --> CONTRACT[adapter-contract]
  DESKTOPAPP --> CONTRACT
  DSH --> HOSTAPI[host-api]
  DESKTOPAPP --> HOSTAPI
  HOSTAPI --> CORE[review-core]
  DSH --> UI[review-ui]
  DESKTOPAPP --> UI
  DSH --> MCP[transport-mcp]
  DESKTOPAPP --> MCP
  DSH --> HTTP[transport-http]
  DESKTOPAPP --> HTTP
  UI --> CONTRACT
  MCP --> CORE
  HTTP --> CORE
```

The dependency direction is inward from each product edge. The review core does not know which host is using it. DSH owns plugin registration, its resource URI, account lookup, conversation and workspace integration, service lifecycle, and plugin packaging. The Desktop app owns its Tauri lifecycle, starts a bundled Node sidecar for the shared HTTP/MCP services, and hosts the shared UI in the system WebView. The core owns document and review semantics. Shared UI receives a neutral adapter context and does not inspect DSH SDK objects or transport implementations.

## Package responsibilities

| Package | Responsibility |
| --- | --- |
| `packages/review-core/` | Space service, local SQLite persistence, review transactions and domain errors |
| `packages/host-api/` | Shared service facade composed from review services and optional host callbacks |
| `packages/adapter-contract/` | Versioned host capability names, declaration validation, runtime capability intersection, TypeScript declarations |
| `packages/review-ui/` | Shared review surface; consumes the core API and optional adapter capabilities |
| `packages/transport-mcp/` | Host-independent MCP facade over core operations |
| `packages/transport-http/` | Host-independent HTTP handler over core operations |
| `adapters/dsh/` | DSH runtime composition, host bridge, capability declaration and distribution |
| `apps/desktop/` | Desktop client/server/MCP/Agent entry points, Tauri shell, product scripts and documentation |
| `apps/site/` | Public installation site |
| `dist/` | Generated package builds and final platform release artifacts; never edit by hand |

## Adapter removal record

WorkBuddy Connector was removed as an active product and adapter. Its implementation, build paths, website install flow, and current-product documentation are no longer part of the workspace. `docs/10-workbuddy-connector-development-plan.md` is retained only as a historical record and must not be treated as an implementation or release plan. Historical references do not participate in builds or runtime behavior.

The Desktop app exercises the widest local capability set and uses the same review core and UI as DSH. DSH declares only its supported host integration and degrades optional UI actions based on the resolved runtime capability set.

## Core boundary

Do not modify the behavior of `packages/review-core/src/review-core.js` without the explicit prior consent required by the repository guidelines. Adapter separation is implemented at the composition, transport, contract, and UI boundaries; core review semantics stay unchanged.
