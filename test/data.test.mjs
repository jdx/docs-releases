import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { defineReleasesData } from "../src/data.mjs";

test("the loader lists releases oldest first with notes and issue counts", async () => {
  const root = mkdtempSync(join(tmpdir(), "docs-releases-"));
  try {
    writeFileSync(
      join(root, "CHANGELOG.md"),
      `## [1.2.0] - 2026-02-02

### 🚀 Features

- b by @x in [#2](https://github.com/o/r/pull/2)

## [1.1.0] - 2026-01-01

### 🐛 Bug Fixes

- a by @x in [#1](https://github.com/o/r/pull/1)
`,
    );
    mkdirSync(join(root, "release-notes"));
    writeFileSync(join(root, "release-notes", "1.1.0.md"), "# T\n\nBody\n");
    writeFileSync(join(root, "release-notes", "1.2.0.md"), "Body\n");
    writeFileSync(join(root, "releases-issues.json"), '{"1.2.0": 3}');
    const loader = defineReleasesData({
      root,
      repo: "o/r",
      issuesSince: "2026-02-01",
    });
    const data = await loader.load();
    assert.equal(data.repo, "o/r");
    assert.equal(data.issuesSince, "2026-02-01");
    assert.deepEqual(
      data.releases.map((r) => [r.version, r.changes, r.notes, r.issues]),
      [
        ["1.1.0", 1, true, null],
        ["1.2.0", 1, true, 3],
      ],
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});
