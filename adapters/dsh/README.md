# CoSpace for DSH

CoSpace lets an Agent propose Markdown document edits and lets the user accept or reject each suggestion in the DSH review interface.

## Install

Install the `dsh-plugin-space` npm package from DSH's Plugins page or CLI. The package requires Node.js 24 or later and DSH `^0.2.2-rc.5`.

## Data

Documents and review state are stored locally in `$DSH_HOME/space/review.sqlite`. Set `DSH_SPACE_HOME` to choose another directory. Agent-proposed edits do not change accepted content until the user accepts them in CoSpace.

See the bundled `docs/` for the review model and integration details. The project homepage and source are at <https://github.com/hanfang5057-byte/co-space>.
