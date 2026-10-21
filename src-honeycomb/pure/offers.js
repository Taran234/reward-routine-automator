// The offers finder's judgments. Pure: lists in, lists out, no chrome.*.
//
// A read gives every offer the Earn page's payload carries. The finder keeps a
// set of keys it has already seen; the first read only establishes that
// baseline (no "new" flags, no notification for an account's whole backlog),
// and later reads flag what appeared since.

const MAX_SEEN = 600;

// Merge one read into the seen-set. Returns { seen, fresh } where fresh is the
// offers whose key was not seen before — empty on the first read, because a
// first read has no "before" to compare against.
export function diffOffers(seenKeys, offers) {
  const list = Array.isArray(offers) ? offers.filter(o => o && typeof o.key === "string") : [];
  const known = new Set(Array.isArray(seenKeys) ? seenKeys : []);
  const baseline = !Array.isArray(seenKeys) || seenKeys.length === 0;
  const fresh = baseline ? [] : list.filter(o => !known.has(o.key));
  for (const o of list) known.add(o.key);
  // Keep the newest keys if the set ever outgrows its cap.
  const seen = [...known].slice(-MAX_SEEN);
  return { seen, fresh };
}

// The offers worth a person's attention, most interesting first: ones the page
// is not showing, then new ones, then anything still open. Done offers sink.
export function rankOffers(offers, freshKeys) {
  const fresh = new Set(freshKeys || []);
  const score = o => {
    let s = 0;
    if (!o.visible) s += 4;
    if (fresh.has(o.key)) s += 3;
    if (o.locked) s += 1;
    if (o.done) s -= 5;
    return s;
  };
  return [...(offers || [])].sort((a, b) => score(b) - score(a));
}

// The one-line notification for new offers that are still open.
export function newOffersMessage(fresh) {
  const open = (fresh || []).filter(o => !o.done);
  if (!open.length) return "";
  const names = open.slice(0, 3).map(o => o.title);
  const more = open.length > 3 ? ` and ${open.length - 3} more` : "";
  return `${open.length} new ${open.length === 1 ? "offer" : "offers"}: ${names.join(", ")}${more}.`;
}
