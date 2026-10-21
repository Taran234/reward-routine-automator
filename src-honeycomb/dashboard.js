// The dashboard page: a bigger view over the numbers the extension already
// stores (lastStats, pointsHistory, runState, the Activity rows). It reads
// nothing from Bing itself; the buttons only send the same messages the popup
// sends. Updates live through storage.onChanged.

import { localDayKey } from "./lib/day.js";
import { earnedToday, trendPerDay } from "./pure/history.js";
import { dayRemainder, progressPair } from "./pure/verdicts.js";
import { getSettings } from "./lib/settings.js";

const $ = id => document.getElementById(id);
const show = v => (v == null || v === "" ? "–" : String(v));
const PHONE_KEY = "phoneItems";

function digits(value) {
  const n = Number(String(value == null ? "" : value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && String(value).trim() !== "" ? n : null;
}

function describeRun(runState) {
  if (!runState) return { running: false, what: "" };
  if (runState.batch) {
    return { running: true, what: `search batch, ${runState.batch.remaining} searches left` };
  }
  if (runState.routine) return { running: true, what: "routine in progress" };
  if (runState.activity) return { running: true, what: String(runState.activity.label || "running") };
  return { running: false, what: "" };
}

function logRow(el, entry) {
  el.textContent = entry && entry.detail ? entry.detail : "–";
  el.className = entry && entry.ok === false ? "bad" : "";
}

function renderChart(history, today) {
  const host = $("chart");
  const list = Array.isArray(history) ? history.slice(-30) : [];
  const days = list.filter(e => e && Number.isFinite(e.first) && Number.isFinite(e.last));
  if (!days.length) return;
  const values = days.map(e => Math.max(0, e.last - e.first));
  const W = 760, H = 180, padL = 36, padB = 22, padT = 8, gap = 4;
  let max = Math.max(10, ...values);
  max = Math.ceil(max / 10) * 10;
  const bw = (W - padL) / days.length - gap;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "chart");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Bar chart of points earned per day");
  const add = (tag, attrs, text) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    svg.appendChild(n);
  };
  const y = v => padT + (H - padT - padB) * (1 - v / max);
  for (const t of [0, max / 2, max]) {
    add("line", { x1: padL, x2: W, y1: y(t), y2: y(t) });
    add("text", { x: padL - 6, y: y(t) + 3, "text-anchor": "end" }, String(Math.round(t)));
  }
  days.forEach((e, i) => {
    const v = values[i];
    const x = padL + i * (bw + gap) + gap / 2;
    add("rect", {
      x, y: y(v), width: Math.max(bw, 2), height: Math.max(y(0) - y(v), v > 0 ? 1 : 0),
      fill: e.day === today ? "var(--bar-today)" : "var(--bar)"
    });
    if (i === 0 || i === days.length - 1 || i % 7 === 0) {
      add("text", { x: x + bw / 2, y: H - 6, "text-anchor": "middle" }, String(e.day).slice(5));
    }
  });
  host.textContent = "";
  host.className = "";
  host.appendChild(svg);
}

function renderOffers(record) {
  const list = $("offers");
  list.textContent = "";
  const offers = record && Array.isArray(record.offers) ? record.offers : [];
  if (!offers.length) {
    $("offersNote").textContent = "No offer list yet. Press Refresh stats.";
    return;
  }
  const fresh = new Set(record.freshKeys || []);
  const hiddenCount = offers.filter(o => !o.visible && !o.done).length;
  $("offersNote").textContent =
    `${offers.length} offers read ${new Date(record.at).toLocaleTimeString()}` +
    (hiddenCount ? `, ${hiddenCount} the page is not showing.` : ".");
  for (const o of offers) {
    const li = document.createElement("li");
    if (o.done) li.className = "done";
    const title = document.createElement("span");
    title.className = "t";
    title.textContent = o.title;
    li.appendChild(title);
    const badge = (text, cls) => {
      const s = document.createElement("span");
      s.className = "pill " + cls;
      s.textContent = text;
      li.appendChild(s);
    };
    if (fresh.has(o.key)) badge("new", "new");
    if (!o.visible && !o.done) badge("not on the page", "hidden");
    if (o.locked) badge("locked", "idle");
    if (o.points != null) {
      const p = document.createElement("span");
      p.className = "pts";
      p.textContent = `${o.points} pts`;
      li.appendChild(p);
    }
    if (typeof o.url === "string" && o.url.startsWith("https://")) {
      const a = document.createElement("a");
      a.href = o.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "Open";
      li.appendChild(a);
    }
    list.appendChild(li);
  }
}

async function render() {
  const local = await chrome.storage.local.get(null);
  renderOffers(local.lastOffers);
  const settings = await getSettings();
  const now = new Date();
  const today = localDayKey(now);
  const stats = local.lastStats || null;
  const history = local.pointsHistory || [];
  const a = (stats && stats.activities) || {};

  const run = describeRun(local.runState);
  const state = $("state");
  state.textContent = run.running ? "running" : "idle";
  state.className = "pill " + (run.running ? "running" : "idle");
  $("activity").textContent = run.what;
  $("runBtn").disabled = run.running;

  if (stats && stats.at) {
    const ageMin = Math.round((Date.now() - stats.at) / 60000);
    const fromToday = localDayKey(new Date(stats.at)) === today;
    $("updated").textContent = `Stats read ${ageMin} min ago${fromToday ? "" : " (not from today)"}`;
  }

  $("balance").textContent = show(stats && stats.availablePoints);
  const earned = earnedToday(history, today);
  $("earned").textContent = earned != null ? `+${earned} today` : " ";
  const m = stats && stats.membership;
  $("level").textContent = show(m && m.level);
  $("toNext").textContent =
    m && m.pointsToNext ? `${m.pointsToNext} points to ${m.nextLevel || "next level"}` : " ";
  $("claim").textContent = show(stats && stats.readyToClaim);
  $("streak").textContent = show(stats && stats.dailyStreak);
  $("stamps").textContent = show(stats && stats.stampBonus);
  const trend = trendPerDay(history, 7);
  $("trend").textContent = trend != null ? String(Math.round(trend)) : "–";

  $("search").textContent = show(stats && stats.searchPoints);
  const pair = stats ? progressPair(stats.searchPoints) : null;
  $("searchBar").style.width = pair && pair[1] ? `${Math.min(100, (pair[0] / pair[1]) * 100)}%` : "0";
  $("searchLeft").textContent = pair
    ? pair[1] - pair[0] > 0
      ? `${pair[1] - pair[0]} points left, about ${Math.ceil((pair[1] - pair[0]) / 3)} searches`
      : "At the cap"
    : " ";
  $("dailySet").textContent = show(a.dailySet);
  $("visual").textContent = show(a.visualSearch);
  $("app").textContent = show(a.bingApp);
  const k = stats && stats.keepEarning;
  $("keep").textContent = k && typeof k.total === "number" ? `${k.open} open of ${k.total}` : "–";

  const remainder = dayRemainder(stats, now);
  $("open").textContent = remainder
    ? remainder.left.length
      ? remainder.left.map(r => r.label.replace(/^the /, "")).join(", ")
      : "Nothing"
    : "–";

  const balance = stats ? digits(stats.availablePoints) : null;
  const goal = Number(settings.redeemGoalPts) || 0;
  if (goal > 0 && balance != null) {
    $("goal").textContent = `${balance.toLocaleString()} / ${goal.toLocaleString()}`;
    $("goalBar").style.width = `${Math.min(100, (balance / goal) * 100)}%`;
    $("goalNote").textContent =
      balance >= goal ? "Goal reached" : `${(goal - balance).toLocaleString()} points to go`;
  } else {
    $("goal").textContent = goal > 0 ? "–" : "No goal set";
    $("goalBar").style.width = "0";
    $("goalNote").textContent = goal > 0 ? "" : "Set one in the popup's Today tab.";
  }

  $("routineDay").textContent = local.lastRoutineDay === today ? "Done today" : "Not yet today";
  $("schedule").textContent =
    `${settings.scheduledRunEnabled ? "daily at " + settings.scheduledRunTime : "off"}` +
    `, catch-up ${settings.catchUpPassEnabled ? "at " + settings.catchUpTime : "off"}`;
  logRow($("logStats"), local.lastStatsLog);
  logRow($("logRewards"), local.lastRewards);
  logRow($("logTabs"), local.lastTabAction);
  logRow($("logImage"), local.lastImageSearch);
  logRow($("logRedeem"), local.lastRedeemLog);
  $("logQuery").textContent = local.lastQuery && local.lastQuery.text ? local.lastQuery.text : "–";

  const phone = (local[PHONE_KEY] && local[PHONE_KEY][today]) || {};
  let left = 0;
  document.querySelectorAll(".phone input").forEach(box => {
    box.checked = !!phone[box.dataset.key];
    if (!box.checked) left++;
  });
  $("phoneNote").textContent = left === 0 ? "All phone items done for today." : `${left} of 3 still open.`;

  renderChart(history, today);
}

async function send(type) {
  try {
    return await chrome.runtime.sendMessage({ type });
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

$("runBtn").addEventListener("click", () => send("RUN_FULL_ROUTINE"));
$("refreshBtn").addEventListener("click", () => send("REFRESH_STATS"));
$("stopBtn").addEventListener("click", () => send("STOP_BATCH"));

document.querySelectorAll(".phone input").forEach(box => {
  box.addEventListener("change", async () => {
    const today = localDayKey();
    const stored = (await chrome.storage.local.get(PHONE_KEY))[PHONE_KEY] || {};
    const day = { ...(stored[today] || {}), [box.dataset.key]: box.checked };
    // Keep the last 60 days so the key never grows without bound.
    const days = Object.keys(stored).sort().slice(-59);
    const next = {};
    for (const d of days) next[d] = stored[d];
    next[today] = day;
    await chrome.storage.local.set({ [PHONE_KEY]: next });
  });
});

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "local" || area === "sync") render();
});

render();
setInterval(render, 30000);
