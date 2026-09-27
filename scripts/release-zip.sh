#!/usr/bin/env bash
# Chunk 10 P0 task 11. Packages a clean, submittable snapshot of the repo — source only, no
# build output, no local databases, no dependency caches — as a single zip under dist/.
#
# Deliberately does NOT touch git (no commit/tag/push) and does NOT run a build — it only
# copies files. Run it from a clean working tree so the zip reflects what's actually
# committed, not uncommitted local changes.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
release_name="TicketPortal-release-${timestamp}"
staging_dir="$(mktemp -d)/${release_name}"
output_dir="$repo_root/dist"
output_zip="${output_dir}/${release_name}.zip"

mkdir -p "$output_dir"

echo "Staging a clean copy at: $staging_dir"

# Prefer `git archive` when this is a git checkout with a committed HEAD — it naturally
# excludes .gitignore'd build output/dependency caches and anything not actually tracked,
# which is a far more reliable exclude list than trying to maintain one by hand here.
if git rev-parse --git-dir > /dev/null 2>&1 && git rev-parse HEAD > /dev/null 2>&1; then
    mkdir -p "$staging_dir"
    git archive HEAD | tar -x -C "$staging_dir"
    echo "Packaged from 'git archive HEAD' — uncommitted changes are NOT included."
else
    echo "Not a git checkout (or no commits yet) — falling back to a manual copy with an" \
         "exclude list. Prefer running this from a git checkout so the exclude list can't" \
         "silently miss a new build-output folder."
    mkdir -p "$staging_dir"
    rsync -a \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude 'bin' \
        --exclude 'obj' \
        --exclude '.git' \
        --exclude '.angular' \
        --exclude '.nx' \
        --exclude '.vs' \
        --exclude '*.user' \
        --exclude 'TicketPortalTestDB_*' \
        "$repo_root"/ "$staging_dir"/
fi

( cd "$(dirname "$staging_dir")" && zip -r -q "$output_zip" "$(basename "$staging_dir")" )

rm -rf "$(dirname "$staging_dir")"

echo "Wrote: $output_zip"
echo "Contents: $(unzip -l "$output_zip" | tail -1)"
