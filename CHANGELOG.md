# Changelog

Changes to the DSH plugin `dsh-plugin-space` and coordinated CoSpace product releases are recorded here. DSH package versions follow Semantic Versioning.

## 0.2.0

Major upgrade to the DSH integration and review workspace. Requires DSH `0.2.3-alpha.2` or later and Node.js 24 or later.

- Register CoSpace agent tools through DSH's native tool API and preserve their JSON schemas.
- Migrate 0.1.x `DSH_SPACE_HOME` installs into the plugin's `home` configuration on first upgrade, keeping the existing data location.
- Upgrade the shared SQLite schema to v3 with serialized migrations and recovery backups.
- Refine the document workspace, review controls, editor toolbar and Markdown reading layout.
- Keep shared MCP tool definitions host-independent for Desktop and DSH.

## 0.1.21

First release published through the automated main-branch pipeline; npm artifacts now carry build provenance.

- Require DSH `0.2.3-alpha.2` or later and keep browser access host-admitted through DSH connection admission (`ctx.connection.admit`), failing closed when no provider can decide.
- Let `space_suggest` link the comment it answers and mark that comment processed, completing the comment-driven revision loop.
- Share one review header across the page and sidebar, keep comment selections whole across inline formatting, and expose the shared review UI theme through the `--cospace-*` token contract.
- Harden the shared runtime boundary, secure runtime upgrades and data migration, and prepare the Desktop product that replaces the retired Local Server.
- Refresh the plugin market index from the npm registry after every publish, and automate CI, npm publishing, desktop staging, and update-manifest promotion from `main`.

## 0.1.9

Coordinated CoSpace release across DSH, Local Server, and Desktop; all three product versions are aligned at `0.1.9`.

- Use host-provided navigation for document links across integrations.
- Refine document list and review editing, and preserve Markdown styles in DOCX exports.
- Add the Local Server and Desktop delivery options alongside the DSH plugin.

## 0.1.8

Security and distribution update.

- Apply DSH's connection admission check (`ctx.connection.requestRejection`) to the CoSpace HTTP route before dispatch; reject requests without a valid Host/Origin and browser credential, and fail closed when the connection service is unavailable.
- Add tests for rejected, missing-connection, and admitted HTTP requests.
- Prefer the immediately updated GitHub raw index and keep jsDelivr and GitHub Pages as mirrors.
- Point the package homepage at the source repository.

## 0.1.7

Distribution and documentation release; no runtime behavior changes.

- Document the DSH Desktop flow (Plugins → Add plugin) and the CLI install command.
- Add an English README and a review-interface preview image to the npm package and repository.
- Move the plugin index to GitHub Pages and refresh it from the npm registry instead of editing versions by hand.
- Add a changelog, security policy, issue forms, and release workflow notes.

## 0.1.6

- Add Crepe-based document editing and adapter contracts for host integrations.
- Add document style preferences.
- Simplify the document comment payload returned by the MCP tools.
- Refine the document review workspace and remove the PDF export option.
- Refresh the CoSpace branding, icon, market index, and install guidance.

## 0.1.5

- Polish the CoSpace workspace experience, including layout and review interactions.

## 0.1.4

- Refine the A4 document preview layout.
- Close the comment-processing status loop and unify the comment review lifecycle.
- Clarify agent guidance for the Space tools and add the WorkBuddy connector groundwork.
- Establish the adapter boundary between the review core and hosts.

## 0.1.3

- Early npm release: review UI, MCP tools, and market index updates.

## 0.1.2

- Early npm release: document review and comment workflow fixes.

## 0.1.1

- First published release with SQLite persistence, MCP tools, and the DSH review interface.

## 0.1.0

- Initial public package. Superseded by 0.1.1 and deprecated on npm.
