#!/usr/bin/env bash
# Push the local api/ and history/ snapshot to the 'data' branch.
#
# Use it only for deliberate manual fixes (e.g. correcting the incident log or
# repainting chart points). The monitor appends to this branch every 5 minutes,
# so a push can drop at most one monitor cycle.
#
# Usage:  bash scripts/push_data.sh
set -e
git fetch --depth 1 origin data
git read-tree --empty
git add -f api history
tree=$(git write-tree)
parent=$(git rev-parse origin/data)
commit=$(git commit-tree "$tree" -p "$parent" -m "Data update from local")
git push -f origin "$commit:data"
git read-tree HEAD
echo "Data pushed to 'data'."
