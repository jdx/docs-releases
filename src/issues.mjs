// Counts the issues each release resolved and records them in the issues file,
// which the releases page reads. An issue counts as resolved by a release when
// a pull request in that release's changelog closed it (GitHub's
// closingIssuesReferences: "Fixes #123", or a link made in the sidebar). It only
// looks up releases the file does not have yet, so a normal run is one small
// query. Needs the gh CLI, signed in.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { parseChangelog } from "./changelog.mjs";

const BATCH = 50;

function closedBy(repo, prs) {
  const [owner, name] = repo.split("/");
  const fields = prs
    .map(
      (n) =>
        `p${n}: pullRequest(number: ${n}) { closingIssuesReferences(first: 50) { nodes { id } } }`,
    )
    .join("\n");
  const query = `query { repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${fields} } }`;
  for (let attempt = 1; ; attempt++) {
    try {
      const out = execFileSync("gh", ["api", "graphql", "-f", `query=${query}`], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
      const repository = JSON.parse(out).data.repository;
      const issues = new Map();
      for (const n of prs) {
        // A null entry is a number that is not a pull request (a typo in a
        // changelog line); it closed nothing. Issues are told apart by node id,
        // not number: a pull request may close an issue in another repository,
        // and two of those could share a number.
        issues.set(
          n,
          (repository[`p${n}`]?.closingIssuesReferences.nodes ?? []).map(
            (i) => i.id,
          ),
        );
      }
      return issues;
    } catch (err) {
      if (attempt === 4) throw err;
    }
  }
}

function readIssues(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

/**
 * @param {import("./options.mjs").Options} options resolved options
 * @param {{refresh?: boolean}} [flags] refresh: recount every release
 */
export function syncIssues(options, { refresh = false } = {}) {
  if (!options.issuesSince) {
    console.log("docs-releases: no issuesSince set, not counting issues");
    return;
  }
  // Earlier releases have no count: the issue tracker was not in use.
  const releases = parseChangelog(
    readFileSync(options.changelog, "utf8"),
    options,
  ).filter((r) => r.date >= options.issuesSince);
  const counts = refresh ? {} : readIssues(options.issuesFile);
  const todo = releases.filter((r) => !(r.version in counts));

  const prs = [...new Set(todo.flatMap((r) => r.prs))];
  const byPr = new Map();
  for (let i = 0; i < prs.length; i += BATCH) {
    for (const [n, issues] of closedBy(options.repo, prs.slice(i, i + BATCH))) {
      byPr.set(n, issues);
    }
  }
  for (const r of todo) {
    counts[r.version] = new Set(r.prs.flatMap((n) => byPr.get(n))).size;
  }

  // Same order as the changelog, newest first, so a diff shows only new lines.
  const sorted = Object.fromEntries(
    releases
      .filter((r) => r.version in counts)
      .map((r) => [r.version, counts[r.version]]),
  );
  writeFileSync(options.issuesFile, JSON.stringify(sorted, null, 2) + "\n");
  console.log(
    `docs-releases: ${todo.length} release(s) counted for issues, ${Object.keys(sorted).length} total`,
  );
}
