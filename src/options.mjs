import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * @typedef {object} Options
 * @property {string} repo  "owner/name" of the GitHub repository (required)
 * @property {string} [root]  the repository root; default: the current directory
 * @property {string} [changelog]  default: CHANGELOG.md
 * @property {string} [notesDir]  where release notes are snapshotted; default: release-notes
 * @property {string} [issuesSince]  YYYY-MM-DD the issue tracker started to be
 *   used (or came back). Releases from then on get an issue count; leave it out
 *   for no issue counts at all.
 * @property {string} [issuesFile]  where issue counts are kept; default: releases-issues.json
 * @property {string} [issuesNote]  text shown under the issues chart
 * @property {string} [trimFrom]  source of a multiline regex; a release body is
 *   cut from its first match on (a block appended to every release, such as a
 *   sponsor section)
 * @property {string} [ignoredSections]  source of a regex (case-insensitive)
 *   for changelog sections that are not changes, such as a thank-you list
 */

/**
 * Options are read from the "docs-releases" key of the root package.json, so
 * the docs build, the CLI and the release script agree; anything passed in
 * overrides it.
 *
 * @param {Partial<Options>} [overrides]
 */
export function resolveOptions(overrides = {}) {
  const root = resolve(overrides.root ?? process.cwd());
  let fromPackage = {};
  try {
    fromPackage =
      JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))[
        "docs-releases"
      ] ?? {};
  } catch {
    // No package.json, or none with the key: everything comes from overrides.
  }
  const o = { ...fromPackage, ...overrides };
  if (!/^[\w.-]+\/[\w.-]+$/.test(o.repo ?? "")) {
    throw new Error(
      `docs-releases: "repo" must be "owner/name" (set it under "docs-releases" in ${resolve(root, "package.json")}), got ${JSON.stringify(o.repo)}`,
    );
  }
  if (o.issuesSince && !/^\d{4}-\d{2}-\d{2}$/.test(o.issuesSince)) {
    throw new Error(
      `docs-releases: "issuesSince" must be YYYY-MM-DD, got ${JSON.stringify(o.issuesSince)}`,
    );
  }
  return {
    root,
    repo: o.repo,
    changelog: resolve(root, o.changelog ?? "CHANGELOG.md"),
    notesDir: resolve(root, o.notesDir ?? "release-notes"),
    issuesSince: o.issuesSince ?? null,
    issuesFile: resolve(root, o.issuesFile ?? "releases-issues.json"),
    issuesNote:
      o.issuesNote ??
      `An issue counts when a pull request in the release closed it. Counting starts on ${o.issuesSince}.`,
    trimFrom: o.trimFrom ?? null,
    ignoredSections: o.ignoredSections ?? "^New Contributors$",
  };
}
