// Snapshots the notes of every published GitHub release listed in the
// changelog into <notesDir>/<version>.md. It rewrites a file only when the
// notes changed, so a normal run changes nothing but the release published
// since the last one. Needs the gh CLI, signed in.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseChangelog } from "./changelog.mjs";
import { formatNotes } from "./notes.mjs";

/** @param {import("./options.mjs").Options} options resolved options */
export function syncNotes(options) {
  const versions = new Set(
    parseChangelog(readFileSync(options.changelog, "utf8"), options).map(
      (r) => r.version,
    ),
  );
  const out = execFileSync(
    "gh",
    ["api", "--paginate", "--slurp", `repos/${options.repo}/releases?per_page=100`],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  // --slurp collects the pages into one array of arrays.
  const releases = JSON.parse(out).flat();

  mkdirSync(options.notesDir, { recursive: true });
  let written = 0;
  for (const release of releases) {
    if (release.draft) continue;
    const version = release.tag_name.replace(/^v/, "");
    if (!versions.has(version)) continue;
    const text = formatNotes(release, options);
    if (!text) continue;
    const file = resolve(options.notesDir, `${version}.md`);
    if (existsSync(file) && readFileSync(file, "utf8") === text) continue;
    writeFileSync(file, text);
    written++;
  }
  console.log(`docs-releases: wrote ${written} release notes file(s)`);
}
