import assert from "node:assert/strict";
import test from "node:test";
import { parseChangelog } from "../src/changelog.mjs";

const OPTIONS = { repo: "jdx/mise", ignoredSections: "^New Contributors$" };

const CHANGELOG = `# Changelog

## [2026.9.2](https://github.com/jdx/mise/compare/v2026.9.1..v2026.9.2) - 2026-09-02

### 🚀 Features

- **(config)** add a thing by @jdx in [#101](https://github.com/jdx/mise/pull/101)

### 🐛 Bug Fixes

- fix two things by @jdx in [#102](https://github.com/jdx/mise/pull/102) and [#103](https://github.com/jdx/mise/pull/103)
- fix it again by @jdx in [#102](https://github.com/jdx/mise/pull/102)
- elsewhere by @jdx in [#9](https://github.com/jdx/other/pull/9)

### Chore

- tidy by @jdx in [abc1234](https://github.com/jdx/mise/commit/abc1234)

### New Contributors

- @someone made their first contribution in [#101](https://github.com/jdx/mise/pull/101)

## [2024.11.28] - 2024-11-24

### 📦 Registry

- add tool by @jdx in [#9](https://github.com/jdx/mise/pull/9)
`;

test("counts changes by category and leaves out ignored sections", () => {
  const [newer, older] = parseChangelog(CHANGELOG, OPTIONS);
  assert.equal(newer.version, "2026.9.2");
  assert.equal(newer.date, "2026-09-02");
  assert.equal(newer.changes, 5);
  assert.deepEqual(newer.categories, {
    features: 1,
    fixes: 3,
    registry: 0,
    other: 1,
  });
  assert.equal(older.version, "2024.11.28");
  assert.equal(older.categories.registry, 1);
});

test("lists each pull request of this repository once", () => {
  const [newer] = parseChangelog(CHANGELOG, OPTIONS);
  assert.deepEqual(newer.prs, [101, 102, 103]);
});

test("without ignoredSections every section counts", () => {
  const [newer] = parseChangelog(CHANGELOG, { repo: "jdx/mise" });
  assert.equal(newer.changes, 6);
});
