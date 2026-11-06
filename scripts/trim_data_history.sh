#!/usr/bin/env bash
# Trim the 'data' branch to its newest N commits (default 2016 ~ 7 days).
#
# Instead of wiping the branch, only the oldest commits are dropped: the chain
# is rebuilt with a new root, reusing the existing trees, preserving messages
# and dates. The branch keeps a rolling window of the newest N commits.
#
# Usage: bash scripts/trim_data_history.sh [N]
set -e
N=${1:-2016}
git fetch --depth $((N + 200)) origin data
count=$(git rev-list --count FETCH_HEAD)
if [ "$count" -le "$N" ]; then
  echo "data: $count commits — no trim needed (limit $N)"
  exit 0
fi

git log --reverse --max-count="$N" \
  --format='%H%x1f%T%x1f%an%x1f%ae%x1f%aI%x1f%cn%x1f%ce%x1f%cI%x1f%s' \
  FETCH_HEAD > /tmp/data_commits.txt

prev=""
while IFS=$'\x1f' read -r _c tree an ae ad cn ce cd2 subj; do
  if [ -z "$prev" ]; then
    prev=$(GIT_AUTHOR_NAME="$an" GIT_AUTHOR_EMAIL="$ae" GIT_AUTHOR_DATE="$ad" \
           GIT_COMMITTER_NAME="$cn" GIT_COMMITTER_EMAIL="$ce" GIT_COMMITTER_DATE="$cd2" \
           git commit-tree "$tree" -m "$subj")
  else
    prev=$(GIT_AUTHOR_NAME="$an" GIT_AUTHOR_EMAIL="$ae" GIT_AUTHOR_DATE="$ad" \
           GIT_COMMITTER_NAME="$cn" GIT_COMMITTER_EMAIL="$ce" GIT_COMMITTER_DATE="$cd2" \
           git commit-tree "$tree" -p "$prev" -m "$subj")
  fi
done < /tmp/data_commits.txt

git push -f origin "$prev:data"
echo "data trimmed: was $count commits, now $N ($prev)"
