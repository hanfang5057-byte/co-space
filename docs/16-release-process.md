# Unified Release Process

Releases are performed by the automated pipeline specified in [21-release-automation.md](21-release-automation.md). This document keeps the release invariants, one-time pipeline configuration, required automated checks, and the post-release promotion task that an Agent executes on the external plugin listing. The workflow files under `.github/workflows/` are the executable specification of every publish, market sync, tag, and release-asset step; do not reproduce them by hand.

## Deprecated manual procedures

The former hand-run release sequences are deprecated and must not be used for a normal release. A failed or partial release is repaired by re-running the affected workflow — the pipelines converge on re-runs — never by hand-publishing around them.

| Deprecated hand-run step | Superseded by |
| --- | --- |
| `npm publish ./dist/dsh-plugin` and hand-managed dist-tags | `Publish DSH plugin` (npm trusted publishing with provenance) |
| `node scripts/sync-market.mjs` after publishing and hand-committing `market/index.json` | The publish workflow's market-sync automation PR; hand-running the script is reserved for recovery when that automation cannot produce the correct metadata |
| Hand-created annotated tags `vX.Y.Z` / `desktop-vX.Y.Z`, and tarballs attached to releases by hand | Tag and release creation inside the pipelines; tags are never moved or reused |
| Hand-built signed installers or hand-running `prepare-promotion` locally | `Stage signed desktop release` (tag-triggered, protected environment) builds, verifies, publishes, and promotes the manifest automatically; manual dispatch on an existing tag reruns the convergent flow |

`npm run pack:dsh` stays a development tool for staging and inspecting the package locally. It is no longer a required release step: the publish workflow packs and verifies the release commit itself.

## Release tracks and shared rules

The workspace root is private and must never be published. DSH and Desktop keep independent version sources, tags, artifacts and release gates. A coordinated release may intentionally assign the same version to both products, but each product still follows its own publish or release sequence; never move or reuse a tag. A matching number does not mean the artifacts must ship together.

| Product | Artifact | Version source | Git tag |
| --- | --- | --- | --- |
| DSH plugin | `dsh-plugin-space` npm package | `release/npm-version.json` | `vX.Y.Z` |
| Desktop | Signed platform installers and updater assets | Desktop package, Tauri configuration and Cargo manifest | `desktop-vX.Y.Z` |

1. Choose the artifact and version. A version bump included in a release PR and merged to `main` authorizes the configured pipeline to publish after all required checks succeed.
2. Build and publish from a clean release commit, preserving unrelated worktree changes. Resolve unexplained `npm run check` failures before merging a version bump.
3. Publish DSH only from `dist/dsh-plugin/`, never the private workspace root. Desktop releases only through the protected staging workflow.
4. Do not hand-edit generated files under `dist/` or generated market metadata. Verify published artifacts and tags before declaring a release complete.
5. Before merging a PR to `main` that changes `apps/site/`, publish and verify every npm package referenced by the site; Pages deploys automatically. Do not advertise unpublished desktop downloads.

## Pipeline configuration (one-time)

Configure a GitHub environment named `desktop-release` restricted to `desktop-v*` tags, with no required reviewers. The environment is referenced by the package matrix, publish, and promote jobs; adding reviewers makes each job wait for a separate approval. The version change merged to `main` authorizes publication after required build, smoke, checksum, and signature checks succeed. Store the persistent Tauri updater public key in `COSPACE_UPDATER_PUBLIC_KEY`; store `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as environment secrets. For automated metadata PRs, install a repository-scoped GitHub App with Contents read/write and Pull requests read/write, save its ID as `COSPACE_RELEASE_APP_ID` and its private key as `COSPACE_RELEASE_APP_PRIVATE_KEY`, and enable repository auto-merge. Protect `main` with a ruleset requiring PRs and the always-running `Verify workspace` check from the `CI` workflow, with zero required approvals; block force pushes and deletions. The desktop preview matrix remains an additional, path-filtered check rather than a universal required check. Protect and back up signing keys outside the repository. Windows signing secrets are not required while Windows is excluded; add the code-signing PFX and password before re-enabling it. macOS currently uses ad-hoc signing and is not notarized. npm trusted publishing on npmjs.com must be bound to this repository and `.github/workflows/publish-dsh.yml`.

Windows can be restored by adding `windows-x64` to both workflow matrices and the `COSPACE_RELEASE_TARGETS` value in the publish job, then restoring the Windows certificate import and signature verification steps. Add `WINDOWS_CERTIFICATE_PFX` and `WINDOWS_CERTIFICATE_PASSWORD` to the `desktop-release` environment and verify signed MSI/NSIS installers before staging that platform.

## Desktop development and local packaging

For local desktop development, run `npm run dev:desktop`; UI changes rebuild and reload the page, while Node service/MCP changes require restarting the command. To build and open a locally runnable package for the current OS, run `npm run package:desktop:local` from the workspace root. This selects macOS `.app`, Windows MSI and NSIS (opening the NSIS installer), or Linux AppImage; it does not sign or publish a release. The Linux local path intentionally builds AppImage only. The formal release matrix includes macOS arm64 and Linux deb/AppImage; Intel Macs are unsupported; Windows local packaging remains available but is temporarily excluded from formal build and release workflows.

## Release path

- **DSH**: set the intended version in `release/npm-version.json` — a prerelease such as `0.1.21-rc.1` publishes under the `rc` dist-tag and a prerelease GitHub Release without moving `latest` — then include the version change in the PR that merges the release to `main`. `Publish DSH plugin` publishes with provenance, creates a metadata PR, and auto-merges the market index after CI passes; it then ensures the annotated `vX.Y.Z` tag, GitHub Release, staged tarball, and Pages deployment. Re-runs converge.
- **Desktop**: set the intended stable version across all six desktop sources with `npm run version:desktop -- X.Y.Z` (`apps/desktop/package.json`, `adapter.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and both lockfiles), and include the version change in the PR that merges the release to `main`. `Build CoSpace Desktop` verifies version agreement, creates the unique annotated tag `desktop-vX.Y.Z` after checks pass, and dispatches `Stage signed desktop release`. That workflow builds macOS arm64 and Linux deb/AppImage, verifies Linux MCP launchers and updater signatures, then publishes the GitHub Release and opens an automatically merged update-manifest PR after CI passes. Windows is excluded from build matrices and the staged updater manifest until explicitly re-enabled.

## Branching and daily work

Use `dev` as the shared integration branch. Create short-lived work branches from `dev` and open pull requests into `dev`; after integration, open a pull request from `dev` to `main`. Pull requests run CI and the desktop preview matrix. Direct pushes to `dev` do not run the configured checks, so use pull requests for integration.

| Work | What runs |
| --- | --- |
| PR merge to `main` | `CI`; changes under packages, the desktop app, scripts, or tests also run the unsigned **preview** matrix |
| Direct push to `dev` or a work branch | Nothing — use pull requests to run checks |
| Pull request to `dev` or `main` | Always-running `CI`; desktop changes also run the unsigned preview matrix, with 14-day artifacts |
| Merge to `main` that changes the DSH release version files or the desktop version sources | That product's release route |
| PR merge that changes only documentation | Nothing |

Keep work branches short-lived and merge them within days. Keep `dev` current with `main` after releases so new work starts from the latest production code.

**Release PR.** Add the intended version change to the final PR that merges the release from `dev` to `main`. For DSH, update `release/npm-version.json`; for Desktop, run `npm run version:desktop -- X.Y.Z`. The merge to `main` triggers the release after the PR checks pass. If code is already merged and you decide to release later, use a separate version-only PR; merging it triggers the same release route.

Rules that a failed attempt will not teach gently:

- **Versions only increase.** Never move a version backwards to "undo" a bump: a desktop bump below the newest `desktop-v*` tag and a DSH version below the current `latest` are both rejected. Continue upward with a new version instead.
- **Tags are immutable.** Fix a released defect with a new version; never re-point or reuse a tag.
- **Do not develop on a tag.** Release tags must keep matching the version sources they were cut from.

## Before release PRs

### Before merging a DSH version bump

1. Verify `engines.dsh` names the range actually tested; widen it only after rechecking route admission (`webServer.register` `auth` and `ctx.connection.admit`), MCP tool registration, and client slots in a clean profile.
2. Confirm install surfaces stay aligned: `README.md`, `README.en.md`, `adapters/dsh/README.md`, `apps/site/index.html`, and `market/index.json`.
3. Optionally stage and inspect the package locally with `npm run pack:dsh`; `node scripts/sync-market.mjs --check` also runs in CI before publishing.

### Desktop release checks

The workflow checks platform builds, smoke paths, SHA256SUMS, updater signatures and public artifact availability before publication. macOS uses ad-hoc signing and is not notarized; only Apple silicon is supported. Linux ships deb and AppImage; deb updates use the package manager or manual installation.

### After the desktop release is published

After publishing the desktop release, the same workflow verifies its signed update assets and URLs, filters the manifest to supported targets, opens an automatically merged PR for `apps/site/desktop/latest.json`, and dispatches Pages. Confirm the deployed manifest and URLs from the networks users actually use.

### Failed or partial releases

Do not promote the manifest of a failed or partial release; re-run the affected workflow to converge instead. Preserve installed user data and backups. An older executable must not open a newer incompatible data layout. Revoke or rotate a compromised signing key through an explicitly planned migration; the updater does not trust an arbitrary replacement key. Never tag a failed or partial release.

## Post-release DSH plugin promotion (Agent task)

The external [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) listing is part of the distribution surface, but the release pipeline cannot update it: it lives in an external repository and merges through the listing's own review. After `Publish DSH plugin` completes a stable release, an Agent executes this task. Pre-release (`rc`) versions are not promoted.

1. Confirm the release converged: `dsh-plugin-space@X.Y.Z` is visible on the npm registry with `latest` pointing at it, the `vX.Y.Z` GitHub Release exists with the staged tarball and checksum, and `market/index.json` on `main` lists the version.
2. Open a pull request on `awesome-dsh-plugin/awesome-dsh-plugin` updating `data/plugins/hanfang5057-byte__co-space--adapters-dsh.yml`:
   - Keep the subdirectory URL at `https://github.com/hanfang5057-byte/co-space/tree/main/adapters/dsh`.
   - Point the tarball at the new GitHub Release asset.
   - Keep the description and icon aligned with the verified package and its verified security posture; do not advertise capabilities the release did not verify.
3. Verify after the pull request merges: the listing renders with the new version, the subdirectory URL and tarball resolve, and the listed engine range matches the published package.

## Retired Local Server

Do not publish new `@hanfang5057/co-space` npm versions or remove existing published artifacts. The installer and its download surface are retired: the site no longer builds or serves `install.sh`, and Agent setup goes through Desktop, whose first-run flow imports Local Server data. Existing user data stays in its original directory until the user explicitly imports it into Desktop.
