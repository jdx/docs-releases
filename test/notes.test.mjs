import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { committedNotes, formatNotes, parseNotes } from "../src/notes.mjs";

const release = {
  tag_name: "v2026.9.17",
  name: "v2026.9.17: Self-update waits 24 hours",
  body: "Summary.\r\n\r\n## Added\r\n\r\n- a thing\r\n\r\n## 💚 Sponsor mise\r\n\r\nPlease sponsor.\r\n",
};
const trimFrom = "^## (?:💚 )?Sponsor mise[ \\t]*$";

test("notes keep the title and cut the trimmed block", () => {
  assert.equal(
    formatNotes(release, { trimFrom }),
    "# Self-update waits 24 hours\n\nSummary.\n\n## Added\n\n- a thing\n",
  );
});

test("without trimFrom the body is kept whole", () => {
  assert.match(formatNotes(release), /Sponsor mise/);
});

test("a release named by its tag has no title", () => {
  assert.equal(
    formatNotes({ tag_name: "v2025.1.1", name: "v2025.1.1", body: "### Fixes\n" }),
    "### Fixes\n",
  );
});

test("a release with nothing but the trimmed block has no notes", () => {
  assert.equal(
    formatNotes({ ...release, body: "## Sponsor mise\n\nhello" }, { trimFrom }),
    null,
  );
});

test("parsing gives back the title and the body", () => {
  assert.deepEqual(parseNotes(formatNotes(release, { trimFrom })), {
    title: "Self-update waits 24 hours",
    markdown: "Summary.\n\n## Added\n\n- a thing\n",
  });
  assert.deepEqual(parseNotes("### Fixes\n"), {
    title: "",
    markdown: "### Fixes\n",
  });
});

test("committed notes are read by version, and a missing directory is empty", () => {
  const dir = mkdtempSync(join(tmpdir(), "docs-releases-"));
  try {
    writeFileSync(join(dir, "1.2.3.md"), "# Title\n\nBody\n");
    writeFileSync(join(dir, "README.txt"), "not notes");
    assert.deepEqual([...committedNotes(dir)], [
      ["1.2.3", { title: "Title", markdown: "Body\n" }],
    ]);
  } finally {
    rmSync(dir, { recursive: true });
  }
  assert.equal(committedNotes(join(dir, "missing")).size, 0);
});
