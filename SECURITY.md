# Security policy

## Supported versions

Security fixes are provided for the latest published `dsh-plugin-space` release. DSH is in developer preview, so a plugin release may stop installing when the host changes its compatibility range; use the latest release for the DSH version you run.

## Reporting a vulnerability

Please report vulnerabilities privately through [GitHub Security Advisories](https://github.com/hanfang5057-byte/co-space/security/advisories/new). Do not open a public issue for a suspected vulnerability.

Include the plugin version, DSH version, operating system, reproduction steps, and the impact you observed. We aim to acknowledge a report within a few business days and will coordinate disclosure after a fix is available.

## Scope

CoSpace is a local-first plugin:

- Documents, suggestions, comments, and comment-handling results live in a local SQLite database under `$DSH_HOME/space/review.sqlite` (or `DSH_SPACE_HOME`).
- The plugin registers MCP tools and a host HTTP API. The HTTP route applies DSH's connection admission check (`ctx.connection.requestRejection`) before dispatch: requests without a valid Host/Origin and browser credential are rejected, and a host without the connection service fails closed with 503. The plugin does not enumerate documents, and accepted text changes only after a user accepts a suggestion.
- Comment text is read by the agent through the MCP tools only after an explicit user action; it is not included in the prompt sent to the conversation.
- The plugin runs with the permissions of the DSH process. DSH tool approvals and sandbox settings do not sandbox plugin code, so review the source before installing a build you did not produce.

Out of scope: vulnerabilities in DSH itself, third-party MCP servers, and issues that require the attacker to already control the user's DSH profile or filesystem.
