import { readFileSync } from "node:fs";
import { parseChangelog } from "./changelog.mjs";
import { releaseNotes } from "./notes.mjs";
import { resolveOptions } from "./options.mjs";

/**
 * The VitePress data loader for the Releases page. In a `*.data.ts` file:
 *
 *     import { defineReleasesData } from "@jdx/docs-releases/data";
 *     export default defineReleasesData();
 *     declare const data: ReleasesData;
 *     export { data };
 *
 * Releases are oldest first. The page draws a timeline left to right and
 * lists newest first.
 *
 * @param {Partial<import("./options.mjs").Options>} [overrides]
 */
export function defineReleasesData(overrides) {
  const options = resolveOptions(overrides);
  return {
    watch: [options.changelog, options.issuesFile, options.notesDir],
    async load() {
      let issues = {};
      try {
        issues = JSON.parse(readFileSync(options.issuesFile, "utf8"));
      } catch {
        // No counts yet; every release after issuesSince reads as uncounted.
      }
      const notes = await releaseNotes(options);
      const releases = parseChangelog(
        readFileSync(options.changelog, "utf8"),
        options,
      )
        .map(({ prs: _prs, ...release }) => ({
          ...release,
          notes: notes.has(release.version),
          issues: issues[release.version] ?? null,
        }))
        .reverse();
      return {
        repo: options.repo,
        issuesSince: options.issuesSince,
        issuesNote: options.issuesNote,
        releases,
      };
    },
  };
}
