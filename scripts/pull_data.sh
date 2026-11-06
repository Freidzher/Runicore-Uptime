#!/usr/bin/env bash
# Pull fresh data (api/, history/) from the 'data' branch into the working tree.
# Only needed for LOCAL preview: on the site the data is overlaid
# automatically at build time (see .github/workflows/site.yml).
#
# Usage: bash scripts/pull_data.sh
# Note: do not commit the changed api/ history/ files — this is a snapshot.
set -e
git fetch --depth 1 origin data
git restore --source=FETCH_HEAD --worktree -- api history
echo "Данные обновлены из ветки data (для локального предпросмотра)."
