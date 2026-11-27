#!/bin/bash
set -eu

if [ "$(uname -s)" != Darwin ]; then
  echo 'CoSpace: currently only macOS WorkBuddy is supported.' >&2
  exit 1
fi
if [ ! -d "$HOME/.workbuddy" ]; then
  echo 'CoSpace: WorkBuddy user directory was not found. Open WorkBuddy once and try again.' >&2
  exit 1
fi

# WorkBuddy may provide Node without adding it to the user's PATH.
installer_node=''
for candidate in "$HOME"/.workbuddy/binaries/node/versions/*/bin/node; do
  if [ -x "$candidate" ] && "$candidate" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' >/dev/null 2>&1; then
    installer_node="$candidate"
    break
  fi
done
if [ -z "$installer_node" ]; then
  echo 'CoSpace: no compatible installer runtime was found in WorkBuddy. Open WorkBuddy and try again.' >&2
  exit 1
fi

"$installer_node" - "$@" <<'COSPACE_INSTALLER_JS'
/* COSPACE_INSTALLER_SOURCE */
COSPACE_INSTALLER_JS
