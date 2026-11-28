# Release Automation Design

This document specifies the automated release pipeline that implements [16-release-process.md](16-release-process.md). The release invariants — never publish from the private workspace root, never move or reuse a tag, and publish desktop releases only after automated verification — remain intact.

## Design goals

The pipeline serves three distinct needs with `dev` integration and `main` release branches:

1. **Saving progress** — frequent pushes of unfinished work must be cheap, safe, and never trigger a publication.
2. **Preview** — every meaningful change produces installable, testable artifacts before anything is official.
3. **Release** — a release is expressed by a version bump, and the pipeline carries it from `main` to npm and GitHub Releases without manual ceremony.

The mapping to industry practice:

- **Release-on-demand with a protected release branch.** `main` is always releasable; every pull request into `dev` or `main` is verified. A release is *not* "every push" — it is an explicit version bump commit, exactly like release-please/changesets treat the version PR as the release intent, but without the ceremony of a separate release branch.
- **Version files are the trigger contract.** `release/npm-version.json` is the single DSH release intent; the six synchronized desktop version sources are the desktop release intent. The release workflow inspects the pushed range and routes accordingly, so a daily progress push and a release push are distinguished by content, not by who remembers to run a command.
- **Convergent (idempotent) release runs.** Publishing workflows may re-run at any time and end in the same state: the version is on npm, `market/index.json` is committed, the annotated tag exists, and the GitHub Release carries the staged tarball. A partially failed release is repaired by re-running, never by re-creating tags or hand-editing generated files.
- **Signed artifacts publish only after verification.** Desktop installers ship through a signed updater. The `desktop-release` environment provides signing keys and tag restrictions; after build, smoke, checksum, signature, and URL verification succeed, the pipeline publishes the release and promotes the update manifest.
- **OIDC, not tokens.** The npm publish uses trusted publishing with provenance, bound to the `publish-dsh.yml` workflow filename. No `NPM_TOKEN` secret exists to leak or rotate.
- **Cost control.** Path filters keep heavy builds off irrelevant pushes, concurrency groups cancel stale verification runs, and release runs are serialized so two releases can never interleave.

## Channels and triggers

| Situation | Trigger | What runs | Publication |
| --- | --- | --- | --- |
| Progress save, shared code only | PR merge to `main` (matching paths) | `CI` verify + desktop sidecar smoke | None |
| Progress save touching desktop code | PR merge to `main` (matching paths) | `CI` + `Build CoSpace Desktop` preview matrix (unsigned, 14-day artifacts) | None |
| Integration pull request | PR into `dev` or `main` | `CI`; desktop changes also run the `Build CoSpace Desktop` preview matrix | None |
| DSH prerelease preview | merge to `main` with `release/npm-version.json` = `X.Y.Z-rc.n` | `Publish DSH plugin` | npm dist-tag `rc` + prerelease GitHub Release; `latest` untouched |
| DSH stable release | merge to `main` with `release/npm-version.json` = `X.Y.Z` | `Publish DSH plugin` | npm `latest` + automatically merged market metadata PR + tag `vX.Y.Z` + GitHub Release |
| Desktop release | merge a release PR to `main` that bumps the six desktop version sources | `Build CoSpace Desktop` verify → authorize tag → `Stage signed desktop release` | Published signed GitHub Release + verified manifest PR auto-merge and Pages deployment |

Version-source contracts:

| Product | Version source | Tag |
| --- | --- | --- |
| DSH plugin | `release/npm-version.json` (synchronized into `adapters/dsh/package.json`, `adapters/dsh/adapter.json`, lockfile by `npm run pack:dsh`) | `vX.Y.Z` |
| Desktop | `npm run version:desktop -- X.Y.Z` writes `apps/desktop/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `adapter.json`, and both lockfile records from one input; the release workflows verify all six agree before tagging | `desktop-vX.Y.Z` |

## Workflow reference

### `CI` (ci.yml)

Runs on path-filtered `main` push events (normally created by PR merges) and on every PR into `dev` or `main`. The always-running PR check verifies `npm run check`, the staged DSH package (`verify:dsh-package`), market index invariants (`sync-market --check`), and the install site build; it is the required `main` ruleset check. On matching pushes it also runs the desktop sidecar smoke (`prepare:tauri` + `smoke`) on Linux. Concurrency cancels superseded runs per ref.

### `Publish DSH plugin` (publish-dsh.yml)

Triggers on `main` push events from merged PRs that change `release/npm-version.json`, the synchronized `adapters/dsh/package.json`, or the workflow itself, plus manual dispatch. One convergent job:

1. `npm run check`, then `npm run pack:dsh` — the only build path; publishes happen from `dist/dsh-plugin`, never the workspace root.
2. Version agreement check across the three DSH version sources.
3. Registry gate: pick the `rc` dist-tag for prerelease versions, `latest` otherwise; refuse to publish a stable version that would move `latest` backwards; skip publishing when the version already exists.
4. Publish with `--provenance` (OIDC trusted publishing), then verify the registry shows the version and the expected dist-tag.
5. Sync `market/index.json` on a bot-owned branch, open a PR with the repository-scoped GitHub App token, and enable auto-merge. The PR checks run without a manual workflow approval; the workflow waits for the merge before continuing and dispatches `pages.yml`.
6. Ensure the annotated tag `vX.Y.Z` and a GitHub Release (prerelease flag for `rc` versions) carrying the staged tarball and its SHA-256 sidecar, with notes extracted from the `CHANGELOG.md` section when present.

Every numbered step is an *ensure* step: a re-run repairs whatever is missing and skips what is already done. The workflow filename is part of the npm trusted-publishing binding — rename it only together with the npmjs.com trusted publisher configuration.

### `Build CoSpace Desktop` (build-desktop.yml)

Pull requests into `dev` or `main` build the preview matrix. Pushes to `main` first resolve **intent** (`apps/desktop/scripts/release-intent.mjs`):

- `release` — the desktop version changed in the pushed range: run the shared checks and sidecar smoke, verify all six version sources agree, verify the tag is new and increasing, then create the annotated `desktop-vX.Y.Z` tag and dispatch `Stage signed desktop release` on it. A tag pushed with `GITHUB_TOKEN` does not fire push events, so the dispatch is explicit — the same limitation the DSH publish workflow handles for the Pages deployment.
- `preview` — desktop code changed without a version bump: run the checks, then build the unsigned matrix (macOS arm64, Linux x64) and upload 14-day artifacts, including the Linux deb/AppImage launcher smokes.
- `none` — only shared code changed: leave it to `CI`; the desktop matrix is not spent on it.

`dev` is the shared integration branch: short-lived work branches merge into it by PR, then a release PR merges `dev` into `main` with the intended version bump. Merging that PR triggers publication after the required checks pass. If code is already in `main`, a separate version-only PR can trigger the same release. Direct pushes to `dev` do not trigger these workflows; PRs into `dev` and `main` run the always-on CI and, for desktop changes, the path-filtered preview build. `workflow_dispatch` offers the two build routes manually, so a release whose merge to `main` failed after the version bump can be resumed with `route: release` — the tag guard rejects anything already tagged. Runs on the same ref are serialized (never cancelled mid-release).

### `Stage signed desktop release` (stage-desktop-release.yml)

The staged pipeline runs automatically on the release tag and can be dispatched again on that tag to recover a partial run. It re-verifies version agreement, builds macOS arm64 and Linux x64 signed artifacts inside `desktop-release`, verifies signatures, and publishes only after all expected assets are attached. Its promotion job verifies the public release, checksums, signatures, and updater URLs, filters `apps/site/desktop/latest.json` to supported targets, then opens an automatically merged PR using the repository-scoped GitHub App token. It waits for required CI, confirms `dsh-plugin-space` resolves on npm, and dispatches Pages after the manifest merge. Non-tag dispatches fail before signing.


### `Deploy site and plugin index` (pages.yml)

Unchanged. Deploys on `main` pushes that change the site or market metadata, and can be dispatched by the DSH publish job after the market metadata PR merges.

## Required configuration

| Item | Where | Notes |
| --- | --- | --- |
| npm trusted publishing | npmjs.com → package settings | Repository `hanfang5057-byte/co-space`, workflow `.github/workflows/publish-dsh.yml`. No `NPM_TOKEN` secret is used. |
| Release metadata GitHub App | repo settings → Developer settings → GitHub Apps | Install only on `co-space`; grant repository Contents read/write and Pull requests read/write. Save the App ID as `COSPACE_RELEASE_APP_ID` and its private key as `COSPACE_RELEASE_APP_PRIVATE_KEY`. This App token makes bot PR checks run without manual approval. |
| Auto-merge | repo Settings → General → Pull Requests | Enable Allow auto-merge; generated metadata PRs use squash auto-merge after checks pass. |
| `main` ruleset | repo Settings → Rules → Rulesets | Require PRs and `Verify workspace` check from the `CI` workflow; require zero approvals; block force pushes and branch deletion. Do not require the path-filtered desktop preview check for every PR. |
| `desktop-release` environment | repo settings | Restricted to `desktop-v*` tags and holds updater key material. Do not configure required reviewers; publication follows successful automated verification. |
| `COSPACE_UPDATER_PUBLIC_KEY` | `desktop-release` environment variable | Persistent updater public key. |
| `TAURI_SIGNING_PRIVATE_KEY` / `..._PASSWORD` | `desktop-release` environment secrets | Updater signing key; back it up outside the repository. |
| Workflow permissions | repo settings | DSH and Desktop metadata PRs use the scoped GitHub App token. `GITHUB_TOKEN` is retained for explicit `pages.yml` dispatch and has only the workflow-declared `actions:write` permission. |

## Failure and recovery playbook

- **A release verification step failed after its PR merged to `main`.** Nothing was published or tagged. Fix through a PR to `main`; for DSH re-run the workflow (dispatch converges on the new head); for desktop dispatch `Build CoSpace Desktop` with `route: release`.
- **npm published, but the run failed before market sync / tag / release.** Re-run the workflow; every remaining step is an ensure step and will complete the release without republishing.
- **Signed staging failed before a release was published (for example, misconfigured signing-secret values).** Fix the environment configuration, then re-dispatch `Stage signed desktop release` on the same tag. No version bump is needed if the release was not published; the same tag can be rerun after fixing configuration.
- **The release was published but manifest promotion failed.** Fix the cause and re-run `Stage signed desktop release` on the same tag; asset upload and manifest generation are idempotent.
- **A metadata PR did not auto-merge.** Inspect its CI check and auto-merge state, fix the cause, and rerun the originating workflow; it reuses the automation branch and open PR.
- **Never**: publish from the workspace root, move or recreate an existing tag, hand-edit `market/index.json` or `dist/`, or publish a site that references an unpublished npm package.

## What deliberately stays manual

- The [awesome-dsh-plugin listing](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) PR after a stable DSH release — an Agent task; the executable checklist lives in [16-release-process.md](16-release-process.md).
- Widening `engines.dsh` after verifying route admission, MCP registration, and client slots in a clean profile.

Intel macOS is excluded from builds and update manifests; Windows remains excluded from the desktop matrices per 16-release-process.md; restoring it means adding `windows-x64` to both matrices and the `COSPACE_RELEASE_TARGETS` list, plus the Windows certificate secrets.
