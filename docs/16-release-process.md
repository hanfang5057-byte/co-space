# Unified Release Process

Releases are performed by the automated pipeline specified in [21-release-automation.md](21-release-automation.md). This document keeps the release invariants, the one-time pipeline configuration, the human acceptance gates, and the post-release promotion task that an Agent executes on the external plugin listing. The workflow files under `.github/workflows/` are the executable specification of every publish, market sync, tag, and release-asset step; do not reproduce them by hand.

## Deprecated manual procedures

The former hand-run release sequences are deprecated and must not be used for a normal release. A failed or partial release is repaired by re-running the affected workflow — the pipelines converge on re-runs — never by hand-publishing around them.

| Deprecated hand-run step | Superseded by |
| --- | --- |
| `npm publish ./dist/dsh-plugin` and hand-managed dist-tags | `Publish DSH plugin` (npm trusted publishing with provenance) |
| `node scripts/sync-market.mjs` after publishing and hand-committing `market/index.json` | The publish workflow's convergent market-sync step; hand-running the script remains only a recovery tool when branch protection blocks the bot push |
| Hand-created annotated tags `vX.Y.Z` / `desktop-vX.Y.Z`, and tarballs attached to releases by hand | Tag and release creation inside the pipelines; tags are never moved or reused |
| Hand-built signed installers or hand-running `prepare-promotion` locally | `Stage signed desktop release` (tag-triggered, protected environment) and `Promote desktop release` (opens the manifest pull request); manual dispatch on an existing tag remains a restage tool only |

`npm run pack:dsh` stays a development tool for staging and inspecting the package locally. It is no longer a required release step: the publish workflow packs and verifies the release commit itself.

## Release tracks and shared rules

The workspace root is private and must never be published. DSH and Desktop keep independent version sources, tags, artifacts and release gates. A coordinated release may intentionally assign the same version to both products (the current release aligns both tracks at `0.1.21`), but each product still follows its own publish or release sequence; never move or reuse a tag. A matching number does not mean the artifacts must ship together.

| Product | Artifact | Version source | Git tag |
| --- | --- | --- | --- |
| DSH plugin | `dsh-plugin-space` npm package | `release/npm-version.json` | `vX.Y.Z` |
| Desktop | Signed platform installers and updater assets | Desktop package, Tauri configuration and Cargo manifest | `desktop-vX.Y.Z` |

1. Confirm the artifact, version, target channel, and publication authorization. Neither this guide nor the pipeline waives that confirmation.
2. Build and publish from a clean release commit, preserving unrelated worktree changes. Resolve unexplained `npm run check` failures before pushing a version bump.
3. Publish DSH only from `dist/dsh-plugin/`, never the private workspace root. Desktop releases only through the protected staging workflow.
4. Do not hand-edit generated files under `dist/` or generated market metadata. Verify published artifacts and tags before declaring a release complete.
5. Before pushing a `main` commit that changes `apps/site/`, publish and verify every npm package referenced by the site; Pages deploys automatically. Do not advertise unpublished desktop downloads.

## Pipeline configuration (one-time)

Configure a protected GitHub environment named `desktop-release`, restrict it to approved release tags, and require reviewers. Store the persistent Tauri updater public key in the `COSPACE_UPDATER_PUBLIC_KEY` environment variable; store `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as environment secrets. Protect and back up the private key outside the repository. Windows signing secrets are not required while Windows is excluded; add the code-signing PFX and password before re-enabling its release target. macOS currently uses ad-hoc signing and is not notarized. npm trusted publishing on npmjs.com must be bound to this repository and the `.github/workflows/publish-dsh.yml` workflow file.

Windows can be restored by adding `windows-x64` to both workflow matrices and the `COSPACE_RELEASE_TARGETS` value in the draft job, then restoring the Windows certificate import and signature verification steps. Add `WINDOWS_CERTIFICATE_PFX` and `WINDOWS_CERTIFICATE_PASSWORD` to the `desktop-release` environment and verify signed MSI/NSIS installers before staging that platform.

## Desktop development and local packaging

For local desktop development, run `npm run dev:desktop`; UI changes rebuild and reload the page, while Node service/MCP changes require restarting the command. To build and open a locally runnable package for the current OS, run `npm run package:desktop:local` from the workspace root. This selects macOS `.app`, Windows MSI and NSIS (opening the NSIS installer), or Linux AppImage; it does not sign or publish a release. The Linux local path intentionally builds AppImage only. The formal release matrix includes macOS arm64/x64 and Linux deb/AppImage; Windows local packaging remains available but is temporarily excluded from formal build and release workflows.

## Release path

- **DSH**: set the intended version in `release/npm-version.json` — a prerelease such as `0.1.21-rc.1` publishes under the `rc` dist-tag and a prerelease GitHub Release without moving `latest` — pass the pre-push gate below, and push to `main`. `Publish DSH plugin` publishes with provenance, syncs and commits the market index, ensures the annotated `vX.Y.Z` tag and the GitHub Release with the staged tarball, and refreshes the Pages deployment; re-runs converge.
- **Desktop**: on a reviewed release commit, set the intended stable version across all six desktop sources with `npm run version:desktop -- X.Y.Z` (`apps/desktop/package.json`, `adapter.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and both lockfiles), then push. `Build CoSpace Desktop` re-verifies the version agreement, creates the unique annotated tag `desktop-vX.Y.Z` after its checks pass, and dispatches `Stage signed desktop release` on it, which builds macOS arm64/x64 and Linux deb/AppImage, verifies both Linux MCP launchers, and validates each updater signature against the configured public key and its signed version. It creates a **draft** GitHub Release only after all jobs succeed. The `latest.json` in the draft is not the live update channel; staging does not authorize publication. Windows is excluded from both build matrices and the staged updater manifest until explicitly re-enabled.

## Human gates

### Before pushing a DSH version bump

1. Verify `engines.dsh` names the range actually tested; widen it only after rechecking route admission (`webServer.register` `auth` and `ctx.connection.admit`), MCP tool registration, and client slots in a clean profile.
2. Confirm install surfaces stay aligned: `README.md`, `README.en.md`, `adapters/dsh/README.md`, `apps/site/index.html`, and `market/index.json`.
3. Optionally stage and inspect the package locally with `npm run pack:dsh`; `node scripts/sync-market.mjs --check` also runs in CI before publishing.

### Desktop draft acceptance

Download and inspect every artifact and `SHA256SUMS`. On clean target systems, test installation, first-run migration, Agent connection, review, and real A→B updates and interrupted recovery. For macOS, record ad-hoc Gatekeeper behavior for first launch and updates; for Linux, test both deb and AppImage, and use the package manager or manual installation for deb updates. Do not describe untested architectures or environments as supported. Publish the draft only after acceptance and explicit release authorization.

### After the desktop release is published

Dispatch `Promote desktop release` on the `desktop-vX.Y.Z` tag; the `desktop-release` environment's tag policy rejects branch refs, and the workflow cuts its promotion branch from `main` so the pull request contains only the manifest change. It builds the update verifier, runs `prepare-promotion` — which downloads the published release, checks checksums, signatures and signed versions, re-downloads each updater URL, and prepares `apps/site/desktop/latest.json` — and opens a pull request with that change. Review the pull request, verify all npm packages still referenced by the site are published, and merge it under the appropriate authorization. The Pages deployment publishes the website and the desktop update manifest together; verify the deployed manifest and its URLs from the networks users actually use.

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
