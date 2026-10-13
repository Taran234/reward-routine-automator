# Honeycomb setup

Honeycomb is Froyo's routine with unattended defaults, a catch-up pass and a
full-page dashboard inside the extension. Use **Google Chrome**: Edge refuses
to let extensions read the Rewards pages, so the stats stay blank there.

## Install

1. Download the repo ZIP or `git clone https://github.com/Taran234/reward-routine-automator`.
2. In Chrome open `chrome://extensions`, turn on **Developer mode**, click
   **Load unpacked** and select the `src-honeycomb` folder itself (the one with
   `manifest.json` directly inside it).
3. In that profile, sign in at https://rewards.bing.com with the Microsoft
   account.
4. Click the extension's refresh arrow. The Today tab fills in.

## What it does by default

- Runs the routine on browser start and at 09:00 daily.
- At 20:30 re-runs the routine if anything is still open (catch-up pass).
- No confirm dialog; every step skips what is already done.

## Where to see progress

- **Popup, Today tab:** balance, search points, streaks, goal.
- **Dashboard** (the grid icon in the popup's top bar, or `dashboard.html`):
  balance and level, points earned today and 7-day trend, what is left,
  search points left in searches, a 30-day chart, run buttons, the activity
  log, and the phone-items checklist.
- **Status page** (`status.html`): the same numbers as plain text.

## Not covered

- Mobile searches, the Bing app check-in and Edge-only minutes. The phone
  checklist on the dashboard tracks the phone ones.
- Anything while the PC is off or Chrome is closed. The catch-up pass runs at
  the next browser start.

## Optional: the Claude artifact

`dashboard.html` and `SCHEDULED_TASK.md` in this folder are an optional
Claude-side dashboard and daily report. They are not needed for anything
above.
