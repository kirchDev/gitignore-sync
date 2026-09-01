#!/usr/bin/env bash
#
# Publishes every released tag that never reached npm.
#
# The publish job was missing from release-please.yml for the first releases,
# so tags exist that the registry does not know. This walks them oldest-first,
# builds each from its own tree, and publishes it.
#
# Order matters: npm moves the `latest` dist-tag to whatever was published
# last, so an old version published after a new one would make `npm install`
# hand out the old one. Everything below the newest therefore goes out under a
# throwaway tag, and `latest` is set once at the end.
#
# Needs `npm login` first. Provenance is off because it needs an OIDC token
# that only GitHub Actions issues — once the workflow publishes, it is on.
set -euo pipefail

PKG="@kirchdev/gitignore-sync"
DRY="${1:-}"

command -v jq >/dev/null || { echo "jq wird gebraucht"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Arbeitsbaum nicht sauber — abgebrochen."; exit 1; }

start_branch=$(git rev-parse --abbrev-ref HEAD)
restore() { git switch -q "$start_branch" 2>/dev/null || git switch -q --detach "$start_branch"; }
trap restore EXIT

# Der bewegliche v<major>-Alias laesst ein normales --tags fehlschlagen, sobald
# er sich verschoben hat. Genau dafuer ist --force da.
git fetch -q origin --tags --force

published=$(npm view "$PKG" versions --json 2>/dev/null | jq -r '. | if type == "array" then .[] else . end' || echo "")
tags=$(git tag -l 'v[0-9]*' | grep -vE '^v[0-9]+$' | sort -V)

missing=()
for tag in $tags; do
  v="${tag#v}"
  grep -qxF "$v" <<<"$published" || missing+=("$tag")
done

if [ ${#missing[@]} -eq 0 ]; then
  echo "Nichts nachzupflegen — npm kennt jede getaggte Version."
  exit 0
fi

newest="${missing[${#missing[@]}-1]}"
echo "Fehlt auf npm: ${missing[*]}"
echo "Neueste (bekommt latest): $newest"
[ "$DRY" = "--dry-run" ] && { echo "(dry run — nichts publiziert)"; exit 0; }

for tag in "${missing[@]}"; do
  echo
  echo "── $tag ─────────────────────────────────"
  git switch -q --detach "$tag"
  CI=true pnpm install --frozen-lockfile >/dev/null
  pnpm build >/dev/null
  v=$(jq -r .version package.json)
  [ "$v" = "${tag#v}" ] || { echo "package.json sagt $v, Tag sagt ${tag#v} — übersprungen."; continue; }

  if [ "$tag" = "$newest" ]; then
    npm publish --no-provenance
  else
    # Unter einem Wegwerf-Tag, damit `latest` nicht auf eine alte Version faellt.
    npm publish --no-provenance --tag backfill
  fi
done

echo
npm dist-tag ls "$PKG" | sed 's/^/  /'
if npm dist-tag ls "$PKG" | grep -q '^backfill:'; then
  npm dist-tag rm "$PKG" backfill
  echo "Wegwerf-Tag 'backfill' entfernt."
fi
echo
echo "npm steht jetzt auf: $(npm view "$PKG" version)"
