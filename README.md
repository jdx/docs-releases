# @jdxcode/docs-releases

A releases page for [VitePress](https://vitepress.dev) docs:

- a **timeline** with one bar per release, sized by the number of changes in its changelog entry
- a chart of the **issues each release resolved**
- each release expands to show its **GitHub release notes** (the published body, with highlighted code blocks)

It reads `CHANGELOG.md` in the [git-cliff](https://git-cliff.org) layout (`## [1.2.3](…) - 2026-01-02`, `### Section`, `- entry`) and the project's GitHub releases. It is used by [mise](https://mise.jdx.dev/releases).

## Set up

```sh
npm install --save-dev @jdxcode/docs-releases
```

Point it at your repository in `package.json`:

```json
{
  "docs-releases": {
    "repo": "owner/name",
    "issuesSince": "2026-01-01"
  }
}
```

Add the data loader, `docs/releases.data.ts`:

```ts
import { defineReleasesData } from "@jdxcode/docs-releases/data";
import type { ReleasesData } from "@jdxcode/docs-releases/data";

export default defineReleasesData();

declare const data: ReleasesData;
export { data };
```

Add the plugin to `.vitepress/config.ts`:

```ts
import { releaseNotesPlugin } from "@jdxcode/docs-releases/vitepress";

export default defineConfig({
  vite: { plugins: [...releaseNotesPlugin()] },
});
```

Add the page, `docs/releases.md`:

```md
# Releases

<script setup>
import Releases from '@jdxcode/docs-releases/Releases.vue';
import { data } from './releases.data';
</script>

<Releases :data="data" />
```

Add `{ text: "Releases", link: "/releases" }` to your sidebar.

## Keep the data current

`docs-releases sync` snapshots the notes of every published release into `release-notes/<version>.md` and counts the issues each release resolved. Run it in your release script, after the changelog entry is written, and commit the results:

```sh
docs-releases sync            # notes and issues
docs-releases sync notes      # only notes
docs-releases sync issues     # only issues (--refresh recounts every release)
```

It needs the [`gh`](https://cli.github.com) CLI, signed in. A run only rewrites what changed.

The release a release PR will publish has no notes yet, so the docs build fetches any release newer than the newest snapshot from the GitHub API (at most 10; a rejected token is retried without it, and a release it cannot fetch links to GitHub instead). Build the docs again when a release is published, since its body exists by then, and the next `sync` commits it.

Generated text that mirrors GitHub does not need your formatter or linter: add `release-notes/` to `.prettierignore` and `.markdownlintignore`.

## Options

Options live under `"docs-releases"` in `package.json`, and each function also takes them as an argument.

| Option            | Default                 | What it does                                                                                                                     |
| ----------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `repo`            | (required)              | `owner/name` on GitHub                                                                                                           |
| `root`            | current directory       | the repository root                                                                                                              |
| `changelog`       | `CHANGELOG.md`          | the changelog to read                                                                                                            |
| `notesDir`        | `release-notes`         | where `sync` keeps release notes                                                                                                 |
| `issuesSince`     | none                    | `YYYY-MM-DD` the issue tracker started to be used, or came back. Releases from then on get a count; omit it for no issue counts. |
| `issuesFile`      | `releases-issues.json`  | where issue counts are kept                                                                                                      |
| `issuesNote`      | a one-line explanation  | text under the issues chart                                                                                                      |
| `trimFrom`        | none                    | regex source; a release body is cut from its first match on, for a block your release workflow appends to every release          |
| `ignoredSections` | `^New Contributors$`    | regex source for changelog sections that are not changes, which are left out of the counts                                       |

## How things are counted

- **Changes** are the changelog entries of a release, minus `ignoredSections`.
- **Issues resolved** are issues closed by a pull request listed in the release's changelog entry (GitHub's `closingIssuesReferences`, deduplicated by issue id). A pull request from before `issuesSince`, or a project that keeps bugs in Discussions, closes none, which is why the count starts at a date you choose.

## Develop

```sh
npm test
```
