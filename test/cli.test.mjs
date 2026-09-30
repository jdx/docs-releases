import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const bin = fileURLToPath(new URL("../bin/docs-releases.mjs", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [bin, ...args], { encoding: "utf8" });

test("--help and -h print the usage and succeed", () => {
  for (const flag of ["--help", "-h"]) {
    const r = run(flag);
    assert.equal(r.status, 0, flag);
    assert.match(r.stdout, /usage: docs-releases sync/);
  }
});

test("an unknown command prints the usage and fails", () => {
  const r = run("frobnicate");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: docs-releases sync/);
});
