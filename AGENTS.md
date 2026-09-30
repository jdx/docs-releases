# Repository Agent Guide

`CLAUDE.md` is a symlink to this file.

`@jdxcode/docs-releases` is an npm package that adds a releases page to VitePress docs. It is used by [mise](https://github.com/jdx/mise) and meant for the other jdx projects.

## Layout

- `src/Releases.vue` — the page component (takes `:data`, published as source)
- `src/data.mjs` — the VitePress data loader, `defineReleasesData()`
- `src/vitepress.mjs` — the Vite plugin that writes and serves per-release notes
- `src/changelog.mjs`, `src/notes.mjs`, `src/render.mjs`, `src/issues.mjs`, `src/sync.mjs` — changelog parsing, release notes, rendering, issue counts, and the `docs-releases sync` implementation
- `bin/docs-releases.mjs` — the CLI
- `test/` — `node --test`, run with `mise run test`

Options live under `"docs-releases"` in the consuming project's `package.json` (see `src/options.mjs`). Keep anything specific to one project out of the code and in those options.

## Commits and releases (REQUIRED)

Releases are driven by commit messages. Use conventional commits: `<type>[optional scope][optional !]: <description>`, with a lowercase, imperative description.

- `feat:` — new behavior (bumps the minor version)
- `fix:` — bug fixes (bumps the patch version)
- `docs:`, `refactor:`, `perf:`, `test:`, `chore:`, `ci:` — no release on their own

PR titles are squash-merged into the commit message, so they follow the same format.

release-plz (`.github/workflows/release-plz.yml`, `scripts/release-plz.sh`) opens a `chore: release vX.Y.Z` PR on every push to `main`, with the version computed by git-cliff and the changelog written to `CHANGELOG.md`. Merging that PR (it carries the `release` label) runs `.github/workflows/release.yml`, which tags the commit and creates the GitHub release; `.github/workflows/publish.yml` then publishes to npm through trusted publishing, and communique rewrites the release notes. Do not bump `package.json` by hand.

Secrets: `RELEASE_PLZ_GITHUB_TOKEN` (a personal access token, so the release PR runs CI and the release triggers `publish.yml`) and `ANTHROPIC_API_KEY` (communique). Without them the workflows fall back to the default token and skip the communique rewrite.

## Testing

- `mise run test` — unit tests
- Changing the Vue component or the Vite plugin: pack the package (`npm pack`), unpack it into a VitePress site's `node_modules/@jdxcode/docs-releases`, and build that site. A symlink does not work, since the package resolves `vitepress` from its own location.
