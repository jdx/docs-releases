import { resolveOptions } from "./options.mjs";
import { renderAllReleaseNotes, renderReleaseNotes } from "./render.mjs";

/**
 * The Vite plugin that serves release notes to the Releases page, for
 * `vite.plugins` in the VitePress config. A build writes one
 * /release-notes/<version>.json per release (the page fetches the one it needs
 * when a release is opened, so the notes are not in the page itself), and the
 * dev server answers for the same paths. It also has VitePress compile the
 * package's Vue component.
 *
 * @param {Partial<import("./options.mjs").Options>} [overrides]
 * @returns {import("vite").Plugin[]}
 */
export function releaseNotesPlugin(overrides) {
  const options = resolveOptions(overrides);
  let siteConfig;
  let ssr = false;
  return [
    {
      name: "docs-releases",
      config: () => ({ ssr: { noExternal: ["@jdxcode/docs-releases"] } }),
      configResolved(config) {
        siteConfig = config.vitepress;
        ssr = !!config.build.ssr;
      },
      configureServer(server) {
        server.middlewares.use("/release-notes/", async (req, res, next) => {
          const version = /^\/([\w.-]+)\.json$/.exec(req.url ?? "")?.[1];
          const notes =
            version && (await renderReleaseNotes(siteConfig, options, version));
          if (!notes) return next();
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(notes));
        });
      },
      async buildStart() {
        // VitePress runs a client and a server build; the files belong to the
        // client's output.
        if (!siteConfig || ssr) return;
        for (const [version, notes] of await renderAllReleaseNotes(
          siteConfig,
          options,
        )) {
          this.emitFile({
            type: "asset",
            fileName: `release-notes/${version}.json`,
            source: JSON.stringify(notes),
          });
        }
      },
    },
  ];
}
