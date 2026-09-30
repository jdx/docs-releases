#!/usr/bin/env bash
set -euxo pipefail

VERSION=$(jq -r .version package.json)

# Configure git to use gh's credential helper. The checkout step uses
# persist-credentials: false (per zizmor's artipacked audit), so the
# token isn't written to .git/config and raw `git push` would 403.
gh auth setup-git

# create the version tag (allow it to fail if it already exists)
git tag "v$VERSION" || echo "Tag v$VERSION already exists locally"

# push the tag to github
git push origin "v$VERSION" || echo "Tag v$VERSION already exists on remote"

# check if release already exists before creating
if gh release view "v$VERSION" >/dev/null 2>&1; then
  echo "Release v$VERSION already exists, skipping creation"
else
  # create a release on github; publish.yml publishes it to npm when this
  # release is published, and release.yml then rewrites its notes with communique
  gh release create "v$VERSION" --generate-notes --verify-tag
fi
