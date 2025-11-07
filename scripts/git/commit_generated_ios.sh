#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
MSG="${2:-chore(ios): commit generated native files (Pods, codegen, prebuild)}"

git add ios
# If you also prebuilt Android, include it:
# git add android

if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

git config user.name  "local-bot"
git config user.email "local-bot@users.noreply.github.com"
git commit -m "$MSG"
git push origin "$BRANCH"
echo "✅ Pushed generated native files to $BRANCH"
