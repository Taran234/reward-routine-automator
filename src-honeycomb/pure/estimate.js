// The live estimate between two real stats reads. A web search earns a known
// POINTS_PER_SEARCH, so after each one the stored numbers are nudged by that
// much instead of waiting for the next read; the next real read replaces them
// (it never carries the `estimated` flag). Pure: stats in, stats out.

import { progressPair, POINTS_PER_SEARCH } from "./verdicts.js";

// "9,327" -> 9327; null when there is no number in it.
function digitsOf(value) {
  const raw = value == null ? "" : String(value).replace(/[^\d]/g, "");
  return raw ? Number(raw) : null;
}

// Stats after one more counted search: balance up by `points`, and the
// search-points pair ("40/60") up by the same, capped at its maximum.
export function bumpForSearch(stats, points = POINTS_PER_SEARCH) {
  if (!stats || typeof stats !== "object") return stats;
  const next = { ...stats, estimated: true };

  const balance = digitsOf(stats.availablePoints);
  if (balance != null) next.availablePoints = (balance + points).toLocaleString("en-US");

  const pair = progressPair(stats.searchPoints);
  if (pair) {
    const done = Math.min(pair[0] + points, pair[1]);
    next.searchPoints = String(stats.searchPoints).replace(/(\d+)\s*\/\s*(\d+)\s*$/, `${done}/${pair[1]}`);
  }
  return next;
}
