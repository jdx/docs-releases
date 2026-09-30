#!/usr/bin/env node
import { syncIssues } from "../src/issues.mjs";
import { resolveOptions } from "../src/options.mjs";
import { syncNotes } from "../src/sync.mjs";

const usage = `usage: docs-releases sync [notes|issues] [--refresh] [--root <dir>]

  sync           snapshot release notes and count resolved issues
  sync notes     only snapshot the notes of published releases
  sync issues    only count issues (--refresh recounts every release)

Options come from the "docs-releases" key of package.json.`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(usage);
  process.exit(0);
}
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const [, value] = args.splice(i, 2);
  return value;
};
const refresh = args.includes("--refresh");
const root = flag("--root");
const [command, what] = args.filter((a) => !a.startsWith("--"));

if (command !== "sync" || (what && !["notes", "issues"].includes(what))) {
  console.error(usage);
  process.exit(2);
}

const options = resolveOptions(root ? { root } : {});
if (what !== "issues") syncNotes(options);
if (what !== "notes") syncIssues(options, { refresh });
