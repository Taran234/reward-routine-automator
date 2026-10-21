import test from "node:test";
import assert from "node:assert/strict";
import { diffOffers, rankOffers, newOffersMessage } from "../pure/offers.js";

const offer = (key, extra = {}) => ({ key, kind: "offer", title: key, done: false, visible: true, ...extra });

test("the first read only sets the baseline, nothing is new", () => {
  const { seen, fresh } = diffOffers(undefined, [offer("a"), offer("b")]);
  assert.deepEqual(fresh, []);
  assert.deepEqual(seen.sort(), ["a", "b"]);
  assert.deepEqual(diffOffers([], [offer("a")]).fresh, []);
});

test("later reads flag only offers not seen before", () => {
  const { seen, fresh } = diffOffers(["a", "b"], [offer("a"), offer("c")]);
  assert.deepEqual(fresh.map(o => o.key), ["c"]);
  assert.deepEqual(seen.sort(), ["a", "b", "c"]);
});

test("junk input never throws", () => {
  assert.deepEqual(diffOffers(["a"], null).fresh, []);
  assert.deepEqual(diffOffers("x", [{ nokey: 1 }, null]).fresh, []);
});

test("rankOffers puts hidden and new first and done last", () => {
  const ranked = rankOffers(
    [offer("done", { done: true }), offer("shown"), offer("hidden", { visible: false }), offer("fresh")],
    ["fresh"]
  );
  assert.deepEqual(ranked.map(o => o.key), ["hidden", "fresh", "shown", "done"]);
});

test("newOffersMessage names open new offers and skips done ones", () => {
  assert.equal(newOffersMessage([]), "");
  assert.equal(newOffersMessage([offer("a", { done: true })]), "");
  assert.equal(newOffersMessage([offer("Quiz")]), "1 new offer: Quiz.");
  const many = ["A", "B", "C", "D", "E"].map(t => offer(t));
  assert.equal(newOffersMessage(many), "5 new offers: A, B, C and 2 more.");
});
