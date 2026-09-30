import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveOptions } from "../src/options.mjs";

function inRepo(pkg, fn) {
  const root = mkdtempSync(join(tmpdir(), "docs-releases-"));
  try {
    if (pkg) writeFileSync(join(root, "package.json"), JSON.stringify(pkg));
    return fn(root);
  } finally {
    rmSync(root, { recursive: true });
  }
}

test("options come from package.json and overrides win", () => {
  inRepo(
    { "docs-releases": { repo: "jdx/hk", issuesSince: "2026-01-02" } },
    (root) => {
      const o = resolveOptions({ root, notesDir: "notes" });
      assert.equal(o.repo, "jdx/hk");
      assert.equal(o.issuesSince, "2026-01-02");
      assert.equal(o.notesDir, join(root, "notes"));
      assert.equal(o.changelog, join(root, "CHANGELOG.md"));
    },
  );
});

test("a repo is required and must be owner/name", () => {
  inRepo(null, (root) => {
    assert.throws(() => resolveOptions({ root }), /"repo" must be/);
    assert.throws(() => resolveOptions({ root, repo: "hk" }), /"repo" must be/);
  });
});

test("issuesSince must be a date, and is optional", () => {
  inRepo(null, (root) => {
    assert.throws(
      () => resolveOptions({ root, repo: "a/b", issuesSince: "Sep 2026" }),
      /YYYY-MM-DD/,
    );
    assert.equal(resolveOptions({ root, repo: "a/b" }).issuesSince, null);
  });
});
