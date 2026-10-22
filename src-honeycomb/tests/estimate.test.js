import test from "node:test";
import assert from "node:assert/strict";
import { bumpForSearch } from "../pure/estimate.js";

test("bumpForSearch adds 3 to the balance and the search pair", () => {
  const next = bumpForSearch({ availablePoints: "9,327", searchPoints: "Today · 40/60" });
  assert.equal(next.availablePoints, "9,330");
  assert.equal(next.searchPoints, "Today · 43/60");
  assert.equal(next.estimated, true);
});

test("bumpForSearch caps the pair at its maximum", () => {
  assert.equal(bumpForSearch({ searchPoints: "59/60" }).searchPoints, "60/60");
});

test("bumpForSearch copes with missing numbers and never mutates", () => {
  const stats = { availablePoints: null, searchPoints: null };
  const next = bumpForSearch(stats);
  assert.equal(next.availablePoints, null);
  assert.equal(next.searchPoints, null);
  assert.equal(stats.estimated, undefined);
  assert.equal(bumpForSearch(null), null);
});
