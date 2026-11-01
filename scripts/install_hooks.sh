#!/usr/bin/env bash
# Install local git hooks that keep the data snapshot fresh after each pull.
# Data lives only in the 'data' branch, so a plain "Update Project" / git pull
# would otherwise leave api/ and history/ untouched.
#
# Run once after cloning (or after .git was recreated): bash scripts/install_hooks.sh
set -e
ROOT=$(git rev-parse --show-toplevel)
HOOKS="$ROOT/.git/hooks"

HOOK_BODY='#!/usr/bin/env bash
# Refresh the local data snapshot (api/, history/) after a pull/merge/rebase.
git fetch --depth 1 origin data 2>/dev/null || exit 0
git restore --source=origin/data --worktree -- api history 2>/dev/null || true
# Keep the local "data" branch in sync (the bot may rewrite its history when
# trimming the tail, so a plain fetch would be rejected as non-fast-forward).
git fetch --force origin data:data 2>/dev/null || true
'

for h in post-merge post-rewrite; do
  printf '%s' "$HOOK_BODY" > "$HOOKS/$h"
  chmod +x "$HOOKS/$h"
  echo "installed: .git/hooks/$h"
done
