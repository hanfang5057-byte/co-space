# Unified Release Process

## Desktop release staging (not yet published)

Desktop replaces the retired Local Server npm product. Existing npm artifacts and user data remain available; do not publish a new Local Server package. Staging does not authorize publication.

For local desktop development, run `npm run dev:desktop`; UI changes rebuild and reload the page, while Node service/MCP changes require restarting the command. To build and open a locally runnable package for the current OS, run `npm run package:desktop:local` from the workspace root. This selects macOS `.app`, Windows MSI and NSIS (opening the NSIS installer), or Linux AppImage; it does not sign or publish a release. The Linux local path intentionally builds AppImage only. The current GitHub release matrix includes macOS arm64/x64 and Linux deb/AppImage. Windows local packaging remains available, but Windows is temporarily excluded from formal build and release workflows.

1. Configure a protected GitHub environment named `desktop-release`, restrict it to approved release tags, and require reviewers. Store the persistent Tauri updater public key in the `COSPACE_UPDATER_PUBLIC_KEY` environment variable; store `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as environment secrets. Protect and back up the private key outside the repository. Windows signing secrets are not required while Windows is excluded; add the code-signing PFX and password before re-enabling its release target. macOS currently uses ad-hoc signing and is not notarized.
2. On a reviewed release commit, synchronize `apps/desktop/package.json`, `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/Cargo.toml`, the desktop adapter declaration, and both lockfiles to the intended stable version. After the required checks pass, create the unique annotated tag `desktop-vX.Y.Z` according to the release authorization; do not reuse or move a tag.
3. Manually run `Stage signed desktop release` on that tag. The workflow checks matching versions, runs the shared checks, builds macOS arm64/x64 and Linux deb/AppImage, verifies both Linux MCP launchers, and validates each updater signature against the configured public key and its signed version. It creates a **draft** GitHub Release only after all jobs succeed. The `latest.json` in the draft is not the live update channel. Windows is excluded from both build matrices and the staged updater manifest until explicitly re-enabled.
4. Download and inspect every artifact and `SHA256SUMS`. On clean target systems, test installation, first-run migration, Agent connection, review, and real A→B updates and interrupted recovery. For macOS, record ad-hoc Gatekeeper behavior for first launch and updates; for Linux, test both deb and AppImage, and use the package manager or manual installation for deb updates. Do not describe untested architectures or environments as supported. Publish the draft only after acceptance and explicit release authorization.
5. After the release is published, build the local verifier with `cargo build --locked --release --manifest-path apps/desktop/tools/verify-update/Cargo.toml`. Set `COSPACE_UPDATER_PUBLIC_KEY` to the same public key and `COSPACE_VERIFY_UPDATE` to the resulting executable, then run `node apps/desktop/scripts/prepare-promotion.mjs desktop-vX.Y.Z`. It requires `gh` authentication, downloads the published release, checks checksums, signatures and signed versions, re-downloads each updater URL, and prepares `apps/site/desktop/latest.json`. Review this file, verify all npm packages still referenced by the site are published, and only then commit and push the site change under the appropriate authorization. The existing Pages deployment publishes the website and independent desktop update manifest together; verify the deployed manifest and its URLs from the networks users actually use.
6. On a failed/partial release, do not promote the manifest. Preserve installed user data and backups. An older executable must not open a newer incompatible data layout. Revoke or rotate a compromised signing key through an explicitly planned migration; the updater does not trust an arbitrary replacement key.

Windows can be restored by adding `windows-x64` to both workflow matrices and the `COSPACE_RELEASE_TARGETS` value in the draft job, then restoring the Windows certificate import and signature verification steps. Add `WINDOWS_CERTIFICATE_PFX` and `WINDOWS_CERTIFICATE_PASSWORD` to the `desktop-release` environment and verify signed MSI/NSIS installers before staging that platform.

## Release tracks and shared rules

The workspace root is private and must never be published. DSH and Desktop keep independent version sources, tags, artifacts and release gates. A coordinated release may intentionally assign the same version to both products (the current preparation uses `0.1.20`), but each product still follows its own publish or release sequence; never move or reuse a tag. A matching number does not mean the artifacts must ship together.

| Product | Artifact | Version source | Git tag |
| --- | --- | --- | --- |
| DSH plugin | `dsh-plugin-space` npm package | `release/npm-version.json` | `vX.Y.Z` |
| Desktop | Signed platform installers and updater assets | Desktop package, Tauri configuration and Cargo manifest | `desktop-vX.Y.Z` |

1. Confirm the artifact, version, target channel, and publication authorization. This guide does not authorize publishing.
2. Build and publish from a clean release commit, preserving unrelated worktree changes. Run `npm run check` and resolve unexplained failures.
3. Publish DSH only from `dist/dsh-plugin/`, never the private workspace root. Desktop uses the protected GitHub Actions workflow above.
4. Do not hand-edit generated files under `dist/` or generated market metadata. Verify published artifacts and tags before declaring a release complete.
5. Before pushing a `main` commit that changes `apps/site/`, publish and verify every npm package referenced by the site; Pages deploys automatically. Do not advertise unpublished desktop downloads.

## DSH plugin release

### Prepare and verify

1. Set the intended version in `release/npm-version.json`.
2. Run `npm run pack:dsh` (or the equivalent `npm run pack:npm`). This synchronizes the DSH manifest, adapter declaration, and lockfile; rebuilds the generated client and package; runs package verification; and creates the tarball under `dist/npm-packages/`.
3. Run `npm run check` and `npm run verify:dsh-package`. Do not publish with unexplained failures.
4. Review the staged package and tarball. Verify `engines.dsh` matches the host versions actually tested. Confirm install surfaces stay aligned: `README.md`, `README.en.md`, `adapters/dsh/README.md`, `apps/site/index.html`, and `market/index.json`.
5. Verify `node scripts/sync-market.mjs --check` before publishing, and confirm the market URLs/mirrors satisfy the documented DSH network behavior.

### Publish and finish

1. Publish the staged artifact only: `npm publish ./dist/dsh-plugin`.
2. Verify `dsh-plugin-space@X.Y.Z` exists in the npm registry and `latest` points to the intended version.
3. Run `node scripts/sync-market.mjs`; review the generated `market/index.json`, commit it, and push so the configured static host redeploys. Do not hand-edit versions or timestamps in the index.
4. Confirm the market check passes against the current registry state.
5. Create annotated tag `vX.Y.Z` on the commit containing the release and market index, then push the tag.
6. Attach the staged tarball to the GitHub Release and verify its digest matches the staged tarball.
7. Update the [awesome-dsh-plugin listing](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/hanfang5057-byte__co-space--adapters-dsh.yml) in a PR. Keep its URL at `https://github.com/hanfang5057-byte/co-space/tree/main/adapters/dsh`, tarball at the new GitHub Release asset, and description/icon aligned with the verified package. Verify the listing after the PR merges.

## Retired Local Server

Do not publish new `@hanfang5057/co-space` npm versions or remove existing published artifacts. The legacy installer remains in `apps/site/legacy-local/` only to keep the current site functional until the desktop release and migration guidance are available. Existing user data stays in its original directory until the user explicitly imports it into Desktop.
