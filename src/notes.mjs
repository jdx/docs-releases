// The GitHub release notes the Releases page shows.
//
// `docs-releases sync` snapshots every published release's notes into the notes
// directory (run it from the release script), so a docs build reads them from
// the repo. The newest release has no snapshot yet when its release PR is
// opened, so a docs build fetches whichever releases newer than the newest
// snapshot it finds. Run the docs build again when a release is published, and
// that body exists by then.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseChangelog } from "./changelog.mjs";

// A build that finds more than this many new releases without notes has a
// snapshot that is broken or was never made; it does not go and fetch them all.
const MAX_FETCH = 10;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A release's notes as stored in <notesDir>/<version>.md: the release title as
 * a first-line heading (when it has one), then the body. Null when there is
 * no body.
 *
 * @param {{name?: string|null, tag_name: string, body?: string|null}} release
 *   a release from the GitHub API
 * @param {{trimFrom?: string}} [options] trimFrom: source of a multiline regex;
 *   the body is cut from its first match on. For a block a release workflow
 *   appends to every body (a sponsor section), which is not part of the notes.
 */
export function formatNotes(release, { trimFrom } = {}) {
  let body = (release.body ?? "").replace(/\r\n/g, "\n");
  const cut = trimFrom ? new RegExp(trimFrom, "m").exec(body) : null;
  if (cut) body = body.slice(0, cut.index);
  body = body.trim();
  if (!body) return null;
  // The name is "v1.2.3: Title"; a release with no title is named by its tag.
  const title = (release.name ?? "")
    .replace(new RegExp(`^${escapeRegExp(release.tag_name)}:?\\s*`), "")
    .trim();
  return `${title ? `# ${title}\n\n` : ""}${body}\n`;
}

/** The inverse of formatNotes: { title, markdown }. */
export function parseNotes(text) {
  const m = /^# (.+)\n\n/.exec(text);
  return m
    ? { title: m[1], markdown: text.slice(m[0].length) }
    : { title: "", markdown: text };
}

/** Notes kept in the repo, as Map<version, {title, markdown}>. */
export function committedNotes(notesDir) {
  const notes = new Map();
  let files = [];
  try {
    files = readdirSync(notesDir);
  } catch {
    return notes;
  }
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    notes.set(
      file.slice(0, -3),
      parseNotes(readFileSync(resolve(notesDir, file), "utf8")),
    );
  }
  return notes;
}

async function fetchRelease(repo, version) {
  const url = `https://api.github.com/repos/${repo}/releases/tags/v${version}`;
  const token =
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.MISE_GITHUB_TOKEN;
  // A token that GitHub rejects (an expired one in the environment) must not
  // fail a build that can go without it, so a 401 is retried without it.
  for (const auth of token ? [true, false] : [false]) {
    const res = await fetch(url, {
      headers: {
        accept: "application/vnd.github+json",
        ...(auth ? { authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.status === 401 && auth) continue;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
}

const cache = new Map();

/**
 * Notes for every release in the changelog that has some, as
 * Map<version, {title, markdown}>. A release whose notes cannot be fetched is
 * left out, and the page links to GitHub for it instead.
 *
 * @param {import("./options.mjs").Options} options resolved options
 */
export function releaseNotes(options) {
  const key = `${options.repo}\0${options.changelog}\0${options.notesDir}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const notes = committedNotes(options.notesDir);
        // Only releases newer than the newest snapshot are fetched. Some older
        // ones never had a GitHub release (their tags were skipped), so they
        // have no file and never will.
        const missing = [];
        for (const { version } of parseChangelog(
          readFileSync(options.changelog, "utf8"),
          options,
        )) {
          if (notes.has(version)) break;
          missing.push(version);
        }
        if (missing.length > MAX_FETCH) {
          console.warn(
            `docs-releases: ${missing.length} new releases have no snapshot in ${options.notesDir}; not fetching them`,
          );
          return notes;
        }
        await Promise.all(
          missing.map(async (version) => {
            try {
              const text = formatNotes(
                await fetchRelease(options.repo, version),
                options,
              );
              if (text) notes.set(version, parseNotes(text));
            } catch (err) {
              // Expected while a release is still being prepared: it has no
              // GitHub release yet.
              console.warn(
                `docs-releases: no notes for ${version} (${err.message})`,
              );
            }
          }),
        );
        return notes;
      })(),
    );
  }
  return cache.get(key);
}
