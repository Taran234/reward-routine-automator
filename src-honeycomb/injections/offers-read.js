// The offer-feed reader: the page-side half of the offers finder. Injected via
// chrome.scripting.executeScript({func}), so it must be fully self-contained
// (see ADR-017).
//
// The Earn page ships its whole offer list as escaped JSON inside the page
// (checked live 2026-10-21): every offer of the week, locked ones included, and
// the quest ("punchcard") ids, whether or not the UI renders a tile for them.
// This reads that list from the signed-in page the stats read already has open
// — nothing is requested from anywhere else, nothing is guessed. `visible` says
// whether a tile or link for the offer is actually on the page right now, so
// the dashboard can single out the ones the UI is not showing.
//
// Resolves { offers: [{ key, kind, title, points, done, locked, unlock, url,
// visible }] } — [] when the page carries no payload.
export function readOfferFeed() {
  // The payload is escaped JSON inside <script> text.
  const html = document.documentElement.innerHTML.replace(/\\"/g, '"');
  const pageText = (document.body ? document.body.innerText : "").toLowerCase();
  const links = Array.from(document.querySelectorAll("a[href]")).map(
    a => a.getAttribute("href") || ""
  );

  const unset = v => (v === "$undefined" || v === undefined ? null : v);
  const offers = [];
  const seen = new Set();

  // Offers: flat objects with a name, a points value and a destination.
  const objects = html.match(/\{"[A-Za-z]+":[^{}]{20,1400}\}/g) || [];
  for (const raw of objects) {
    if (!/"name":"/.test(raw) || !/"points":/.test(raw) || !/"destination":/.test(raw)) continue;
    let o;
    try {
      o = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    if (!o || typeof o.name !== "string" || seen.has(o.name)) continue;
    seen.add(o.name);
    const title = typeof o.title === "string" ? o.title : "";
    offers.push({
      key: o.name,
      kind: "offer",
      title: title || o.name,
      points: typeof o.points === "number" ? o.points : null,
      done: unset(o.isCompleted) === true,
      locked: unset(o.isLocked) === true,
      unlock: unset(o.unlockCriteria),
      url: typeof o.destination === "string" ? o.destination : "",
      visible: title ? pageText.includes(title.toLowerCase()) : false
    });
  }

  // Quests: the offerId strings. A quest the page links to has a tile; one that
  // only appears in the payload is reachable by its own URL alone.
  // "offerId" also appears on plain offers (which were read above), so only
  // the punchcard ids — the quest pages' own id shape — count as quests.
  const ids = [...new Set((html.match(/"offerId":"[^"]+"/g) || []).map(s => s.slice(11, -1)))].filter(
    id => /punchcard/i.test(id) && !seen.has(id)
  );
  for (const id of ids) {
    const key = "quest:" + id;
    if (seen.has(key)) continue;
    seen.add(key);
    const anchor = Array.from(document.querySelectorAll("a[href]")).find(a =>
      (a.getAttribute("href") || "").includes(id)
    );
    // The tile's text starts with its "Expires in N days" badge; drop that.
    const label = anchor
      ? (anchor.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/^Expires in \d+ \w+/i, "")
          .trim()
      : "";
    offers.push({
      key,
      kind: "quest",
      title: label.slice(0, 80) || id,
      points: null,
      done: false,
      locked: false,
      unlock: null,
      url: "https://rewards.bing.com/earn/quest/" + id,
      visible: links.some(h => h.includes(id))
    });
  }

  return { offers };
}
