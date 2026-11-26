# Unified Release Process

This document is the source of truth for publishing CoSpace npm packages and Desktop installers. The root workspace is private and must never be published. DSH and CoSpace Local Server are separate npm artifacts with separate versions and release tracks. A release may publish one artifact or both; complete and verify each artifact's release steps before creating its tag.

## Release tracks

| Product | Publishable artifact | Version source | Staged output | Git tag |
|---|---|---|---|---|
| DSH plugin | `dsh-plugin-space` | `release/npm-version.json`, synchronized into `adapters/dsh/package.json`, `adapters/dsh/adapter.json`, and `package-lock.json` by the packaging script | `dist/dsh-plugin/` and `dist/npm-packages/dsh-plugin-space-X.Y.Z.tgz` | `vX.Y.Z` |
| Local Server | `@cospace/local-server` | `apps/local-server/package.json` | `dist/npm-packages/cospace-local-server-X.Y.Z.tgz` (built package contents are under `apps/local-server/dist/`) | `local-server-vX.Y.Z` |
| Desktop | Platform installer(s), not npm | `apps/desktop/src-tauri/tauri.conf.json` | `dist/releases/desktop/<platform>/` | No npm release tag unless explicitly coordinated with an npm release commit |

The coordinated CoSpace `0.1.9` release aligns the DSH plugin, Local Server, and Desktop product versions at `0.1.9`. Their version sources remain independent, so verify all three before publishing.

DSH remains on its historical `vX.Y.Z` tag convention. Local Server uses a prefixed tag because its version is independent and can differ from DSH's version. Never move or reuse an existing release tag.

## Shared release rules

1. Confirm the requested artifact(s), target channel, versions, and publication authorization. This guide does not itself authorize publishing.
2. Check the worktree and current branch. Build and publish from a clean release commit. If unrelated user changes exist, preserve them and prepare the release in a clean worktree.
3. Run `npm run check`. Resolve unexplained failures before publishing.
4. Build and inspect only the staged package artifact. DSH publishes from `dist/dsh-plugin/`; Local Server publishes its versioned tarball from `dist/npm-packages/`. Never run `npm publish` from the private workspace root.
5. Verify the published registry version, dist-tag, tarball integrity, and Git tag before declaring a release complete.
6. Create and push annotated tags only after the corresponding npm package has published and its post-publish checks have passed. A partial multi-package release must be resolved before creating any tag for the combined release commit.
7. Do not hand-edit generated files under `dist/` or generated market metadata.
8. Before pushing a `main` commit that changes `apps/site/`, publish and verify every npm package named in the site's install commands. The Pages workflow deploys automatically on that push; keep unpublished product instructions off the live site until their package is available.

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

## Local Server npm release

### Prepare and verify

1. Set the intended semver version in `apps/local-server/package.json`; keep the Local Server version independent from `release/npm-version.json`.
2. Build the runtime bundle, daemon bundle, and review web assets using the Local Server build script. The resulting package must contain the executable MCP entry, daemon entry, and static web assets, but no user databases, runtime credentials, npm tokens, unrelated workspaces, or generated release artifacts.
3. Run `npm run check` and `npm run local-server:verify-package`.
4. Inspect `npm pack --dry-run` for the Local Server package and install the staged tarball into a clean temporary directory. Verify the declared Node engine, `bin`, `files`, CLI modes, npx invocation, cache-independent daemon copy, and `service status` output.
5. Validate the target channel: stable versions use `latest`; prereleases use `next` until promoted.

### Publish and finish

1. Publish only the staged tarball, never the private root workspace: `npm publish ./dist/npm-packages/cospace-local-server-X.Y.Z.tgz --access public --tag latest` (use `--tag next` for prereleases).
2. Verify `@cospace/local-server@X.Y.Z` in the registry, tarball integrity, and intended `latest` or `next` dist-tag.
3. Verify npm provenance when the configured public CI publishing flow supports it.
4. Create annotated tag `local-server-vX.Y.Z` on the commit containing the package version and release implementation, then push the tag.
5. Record the registry version, dist-tag, package integrity, tag commit, and supported runtime/Agent acceptance results in the release notes.

### Upgrade and rollback checks

- New npm versions are immutable. Publish a new semver version rather than replacing an existing version.
- `@latest` is resolved on a new npx launch; already-running MCP and daemon processes do not update in place. A newer MCP client reports the daemon version and upgrade command. After all Agents disconnect, run `npx -y @cospace/local-server@latest service restart`, then reconnect the Agent.
- Before promotion, verify that staged versioned daemon assets are installed outside the npm cache, the active service reports the intended version/protocol, and restart does not alter user data.
- Keep the previous runtime bundle available for code rollback. Test schema compatibility and backup/restore behavior before any data-format migration.
- Do not remove old npm versions or user runtime assets as a normal upgrade step.

## Coordinated multi-package release

DSH and Local Server may be published from one clean release commit, but they are not a single npm package and their versions need not match.

1. Prepare and verify both staged artifacts independently.
2. Publish each requested package and verify registry state before tagging.
3. Complete the DSH market-index commit/push when DSH is included.
4. Only after every requested npm package and market update succeeds, create each applicable tag on the release commit: `v<dsh-version>` and/or `local-server-v<local-server-version>`.
5. If one publish fails, do not create tags for the coordinated release. Resolve the partial publish or explicitly complete a separately verified package release before tagging.

## Desktop release

Desktop packaging is separate from npm publishing. Run `npm run desktop:package`; inspect installers under `dist/releases/desktop/<platform>/`. Local macOS packages use ad-hoc signing. Public macOS distribution requires Developer ID signing and notarization. Record the packaged Local Server runtime/protocol compatibility and shared data behavior when Desktop includes or connects to the Local Server daemon.
