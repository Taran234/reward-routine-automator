# Setting up Honeycomb with Claude

Do this on the **personal laptop**, in a Claude session signed in to the
personal Claude account (artifacts and scheduled tasks belong to the account
they are created from).

## 1. Load the extension

1. `git clone https://github.com/Taran234/reward-routine-automator`
2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** →
   choose `src-honeycomb/`. No build step.
3. The extension id is pinned to `oblcnpolmloddegocendigkgbhbnmegp` by the
   manifest `key`, so the status page URL is the same on every machine.
4. Make sure the profile is signed in to bing.com / rewards.bing.com.

Defaults (all changeable in the popup's settings): routine runs on browser
start, a scheduled run at 09:00, a catch-up pass at 20:30 that re-runs the
routine if anything is still open, no confirm dialog.

## 2. Publish the dashboard

Ask Claude: "Publish `claude/dashboard.html` as an artifact with the `db`
capability and give me the link." The page reads collection `runs` and
document `meta/latest`.

## 3. Create the scheduled task

The task reads the Rewards pages itself through Claude in Chrome, so use
**Google Chrome** for this part, signed in to rewards.bing.com. (Edge refuses
to let extensions read those pages, which is why the extension's own stats tab
stays blank there; the Claude task is unaffected.)

Ask Claude to create a daily scheduled task from `claude/SCHEDULED_TASK.md`
(09:20 local), with `<ARTIFACT_URL>` replaced by the link from step 2. The
laptop must be awake with Chrome and Claude open at that time.

## What the extension cannot do

- Mobile-app searches, the Bing app check-in and other app-only activities.
  They cap what a desktop browser can earn.
- Anything while the laptop is off or asleep. The catch-up pass runs at the
  next wake instead.
