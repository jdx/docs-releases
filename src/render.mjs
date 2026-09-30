// Renders release notes to HTML with the site's own markdown settings, so a
// code block in a release looks like one anywhere else in the docs. The
// Releases page loads the result one release at a time (see vitepress.mjs,
// which writes a file per release at build time and serves them in dev).
import { createMarkdownRenderer } from "vitepress";
import { releaseNotes } from "./notes.mjs";

const renderers = new WeakMap();

function markdownFor(siteConfig) {
  if (!renderers.has(siteConfig)) {
    // Release bodies are pull request titles and generated prose, so raw HTML
    // in them is shown as text rather than passed through.
    renderers.set(
      siteConfig,
      createMarkdownRenderer(
        siteConfig.srcDir,
        { ...siteConfig.markdown, html: false },
        siteConfig.site.base,
        siteConfig.logger,
      ),
    );
  }
  return renderers.get(siteConfig);
}

// GitHub's heading ids: lowercase, punctuation dropped, spaces to hyphens. The
// notes are written for GitHub, so their in-page links use these (they differ
// from the site's own, which turn the dots in a version into hyphens).
function githubSlug(html) {
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => entities[e])
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function render(md, version, markdown) {
  // Many releases share headings ("Added", "Fixed"), and several can be open on
  // the page at once, so a heading's id is prefixed with its release and links
  // within the notes are pointed at the prefixed id.
  const prefix = `notes-${version}-`;
  const seen = new Map();
  return md
    .render(markdown)
    .replace(/<a class="header-anchor"[^>]*>.*?<\/a>/g, "")
    .replace(
      /<(h[1-6]) id="[^"]*"([^>]*)>([\s\S]*?)<\/\1>/g,
      (_, tag, attrs, inner) => {
        const slug = githubSlug(inner);
        const n = seen.get(slug) ?? 0;
        seen.set(slug, n + 1);
        return `<${tag} id="${prefix}${n ? `${slug}-${n}` : slug}"${attrs}>${inner}</${tag}>`;
      },
    )
    .replace(/ href="#([^"]*)"/g, ` href="#${prefix}$1"`);
}

/**
 * One release's rendered notes as { title, html }, or null when it has none.
 *
 * @param {import("vitepress").SiteConfig} siteConfig
 * @param {import("./options.mjs").Options} options resolved options
 */
export async function renderReleaseNotes(siteConfig, options, version) {
  const notes = (await releaseNotes(options)).get(version);
  if (!notes) return null;
  const md = await markdownFor(siteConfig);
  return { title: notes.title, html: render(md, version, notes.markdown) };
}

/** Every release's rendered notes, as Map<version, {title, html}>. */
export async function renderAllReleaseNotes(siteConfig, options) {
  const md = await markdownFor(siteConfig);
  const out = new Map();
  for (const [version, notes] of await releaseNotes(options)) {
    out.set(version, {
      title: notes.title,
      html: render(md, version, notes.markdown),
    });
  }
  return out;
}
