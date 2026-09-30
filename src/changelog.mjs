// Reads a CHANGELOG.md in the git-cliff layout ("## [version](link) - date",
// "### Section", "- entry") into one record per release.

const HEADING = /^## \[([^\]]+)\](?:\([^)]*\))? - (\d{4}-\d{2}-\d{2})\s*$/;

/**
 * Bucket a changelog section title into one of the groups the releases page
 * draws. Section titles carry an emoji prefix and have changed over time, so
 * match on the words.
 */
export function categoryOf(title) {
  const t = title.toLowerCase();
  if (t.includes("feature")) return "features";
  if (t.includes("bug fix")) return "fixes";
  if (t.includes("registry")) return "registry";
  return "other";
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @param {string} text contents of CHANGELOG.md
 * @param {{repo: string, ignoredSections?: string}} options
 *   repo: "owner/name", to recognise pull request links;
 *   ignoredSections: source of a regex for sections that are not changes (a
 *   thank-you list, vendored updates), which are left out of the counts
 * @returns {{version: string, date: string, changes: number,
 *   categories: {features: number, fixes: number, registry: number, other: number},
 *   prs: number[]}[]} newest first, as the file is
 */
export function parseChangelog(text, { repo, ignoredSections }) {
  const prLink = new RegExp(
    `\\[#(\\d+)\\]\\(https://github\\.com/${escapeRegExp(repo)}/pull/\\d+\\)`,
    "g",
  );
  const ignored = ignoredSections ? new RegExp(ignoredSections, "i") : null;
  const releases = [];
  let release = null;
  let section = null;
  for (const line of text.split("\n")) {
    const heading = HEADING.exec(line);
    if (heading) {
      release = {
        version: heading[1],
        date: heading[2],
        changes: 0,
        categories: { features: 0, fixes: 0, registry: 0, other: 0 },
        prs: [],
      };
      releases.push(release);
      section = null;
      continue;
    }
    if (!release) continue;
    if (line.startsWith("## ")) {
      // A heading that is not a release ends the current one.
      release = null;
      continue;
    }
    if (line.startsWith("### ")) {
      section = line.slice(4).trim();
      continue;
    }
    if (!line.startsWith("- ") || section === null) continue;
    if (ignored?.test(section)) continue;
    release.changes++;
    release.categories[categoryOf(section)]++;
    for (const m of line.matchAll(prLink)) {
      const pr = Number(m[1]);
      if (!release.prs.includes(pr)) release.prs.push(pr);
    }
  }
  return releases;
}
