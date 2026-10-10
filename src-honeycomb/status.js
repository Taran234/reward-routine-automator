// The status page: a plain-text, machine-readable view of the extension's
// state, built so an outside agent (Claude's scheduled task, via a browser
// tab) can read it with one page-text call and, optionally, start a run.
//
//   status.html            read-only snapshot, refreshes itself every 4 s
//   status.html?run=1      start the full routine once (ignored while busy)
//   status.html?refresh=1  re-read the Rewards stats only
//   status.html?stop=1     stop whatever is running
//
// The SUMMARY block is the contract: stable "key: value" lines, one per line,
// so a consumer never has to parse the raw JSON below it.

import { localDayKey } from "./lib/day.js";
import { earnedToday, trendPerDay } from "./pure/history.js";
import { dayRemainder } from "./pure/verdicts.js";

const summaryEl = document.getElementById("summary");
const rawEl = document.getElementById("raw");

// Large or noisy values (query history, prefetch caches) are dropped from the
// raw dump; the summary already carries everything a consumer needs.
const RAW_VALUE_LIMIT = 6000;

async function send(type) {
  try {
    return await chrome.runtime.sendMessage({ type });
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

function line(key, value) {
  return `${key}: ${value == null || value === "" ? "unknown" : value}`;
}

function describeRunState(runState) {
  if (!runState) return { running: false, what: "idle" };
  if (runState.batch) {
    return { running: true, what: `search batch (${runState.batch.remaining} searches left)` };
  }
  if (runState.routine) return { running: true, what: "routine in progress" };
  if (runState.activity) {
    return { running: true, what: `activity: ${runState.activity.label || "running"}` };
  }
  return { running: false, what: "idle" };
}

async function snapshot() {
  const local = await chrome.storage.local.get(null);
  const { settings } = await chrome.storage.sync.get("settings");
  const now = new Date();
  const today = localDayKey(now);
  const stats = local.lastStats || null;
  const run = describeRunState(local.runState);
  const remainder = dayRemainder(stats, now);
  const history = local.pointsHistory || [];

  const lines = [];
  lines.push(line("generatedAt", now.toISOString()));
  lines.push(line("today", today));
  lines.push(line("state", run.running ? "running" : "idle"));
  lines.push(line("activity", run.what));
  lines.push(line("routineDoneToday", local.lastRoutineDay === today ? "yes" : "no"));
  lines.push(line("scheduledRunHandledToday", local.lastScheduledDay === today ? "yes" : "no"));
  lines.push(line("catchUpHandledToday", local.lastNudgeDay === today ? "yes" : "no"));

  if (stats) {
    const ageMin = Math.round((Date.now() - (stats.at || 0)) / 60000);
    lines.push(line("statsAgeMinutes", ageMin));
    lines.push(line("statsAreFromToday", localDayKey(new Date(stats.at || 0)) === today ? "yes" : "no"));
    lines.push(line("availablePoints", stats.availablePoints));
    lines.push(line("readyToClaim", stats.readyToClaim));
    lines.push(line("dailyStreak", stats.dailyStreak));
    lines.push(line("stampBonus", stats.stampBonus));
    const m = stats.membership;
    lines.push(line("membershipLevel", m && m.level));
    lines.push(line("nextLevel", m && m.nextLevel));
    lines.push(line("pointsToNextLevel", m && m.pointsToNext));
    lines.push(line("searchPoints", stats.searchPoints));
    const act = stats.activities || {};
    lines.push(line("dailySet", act.dailySet));
    lines.push(line("visualSearch", act.visualSearch));
    lines.push(line("bingSearchStreak", act.bingSearch));
    lines.push(line("bingAppStreak", act.bingApp));
    const k = stats.keepEarning;
    lines.push(line("keepEarning", k && typeof k.total === "number" ? `${k.open} open of ${k.total}` : null));
  } else {
    lines.push("statsAreFromToday: no");
  }

  lines.push(line("earnedToday", earnedToday(history, today)));
  lines.push(line("trendPointsPerDay7d", trendPerDay(history, 7)));
  lines.push(
    line(
      "stillOpen",
      remainder ? (remainder.left.length ? remainder.left.map(r => r.id).join(",") : "none") : "unknown"
    )
  );

  lines.push(line("lastTabAction", local.lastTabAction && local.lastTabAction.detail));
  lines.push(line("lastRewards", local.lastRewards && local.lastRewards.detail));
  lines.push(line("lastStatsLog", local.lastStatsLog && local.lastStatsLog.detail));
  lines.push(line("lastImageSearch", local.lastImageSearch && local.lastImageSearch.detail));
  lines.push(line("lastQuery", local.lastQuery && local.lastQuery.text));
  lines.push(
    line(
      "scheduledRun",
      settings ? `${settings.scheduledRunEnabled ? "on" : "off"} @ ${settings.scheduledRunTime}` : null
    )
  );
  lines.push(
    line(
      "catchUpPass",
      settings ? `${settings.catchUpPassEnabled ? "on" : "off"} @ ${settings.catchUpTime}` : null
    )
  );

  const raw = {};
  for (const [key, value] of Object.entries(local)) {
    if (JSON.stringify(value).length <= RAW_VALUE_LIMIT) raw[key] = value;
  }
  return { summary: lines.join("\n"), raw };
}

async function render(banner) {
  try {
    const { summary, raw } = await snapshot();
    summaryEl.textContent = (banner ? banner + "\n" : "") + summary;
    rawEl.textContent = JSON.stringify(raw, null, 2);
  } catch (e) {
    summaryEl.textContent = `error: ${String(e && e.message ? e.message : e)}`;
  }
}

async function main() {
  const params = new URLSearchParams(location.search);
  let banner = "";

  if (params.get("stop") === "1") {
    const reply = await send("STOP_BATCH");
    banner = `triggered: stop (${reply && reply.ok ? "ok" : "failed"})`;
  } else if (params.get("run") === "1") {
    const local = await chrome.storage.local.get("runState");
    if (describeRunState(local.runState).running) {
      banner = "triggered: run ignored, already running";
    } else {
      const reply = await send("RUN_FULL_ROUTINE");
      banner = `triggered: run (${reply && reply.ok ? "started" : "failed"})`;
    }
  } else if (params.get("refresh") === "1") {
    const reply = await send("REFRESH_STATS");
    banner = `triggered: refresh (${reply && reply.ok ? "started" : "failed"})`;
  }

  // The trigger params must not re-fire on a manual reload of this tab.
  if (banner && history.replaceState) history.replaceState(null, "", "status.html");

  await render(banner);
  setInterval(() => render(banner), 4000);
}

main();
