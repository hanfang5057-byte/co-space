#!/bin/sh
# Browser-like UI smoke test. Installs isolated test-only dependencies in /tmp.
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/dsh-space-ui.XXXXXX")
trap 'rm -rf "$test_dir"' EXIT HUP INT TERM
npm install --prefix "$test_dir" react@18.3.1 react-dom@18.3.1 jsdom@26 --no-save --no-package-lock
"$project_dir/node_modules/.bin/esbuild" "$project_dir/client-src/SpaceApp.jsx" --bundle --platform=node --format=cjs --jsx=automatic --external:react --external:react/jsx-runtime --loader:.css=empty --outfile="$test_dir/ui.cjs"
cp "$project_dir/test/ui-dom.cjs" "$test_dir/check.cjs"
mkdir -p "$test_dir/fixtures"
cp "$project_dir/test/fixtures/review-data.cjs" "$test_dir/fixtures/review-data.cjs"
node "$test_dir/check.cjs"
