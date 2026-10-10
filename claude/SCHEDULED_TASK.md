# Daily Honeycomb run — scheduled task prompt

Paste everything below the line into a **Claude desktop scheduled task** on the
personal laptop (the one signed in to Bing Rewards). Suggested schedule: daily
at **09:20** local, so the extension's own 09:00 run has finished or is under
way. Replace `<ARTIFACT_URL>` with the dashboard artifact's URL.

Requirements on that laptop: Chrome open with the Honeycomb extension loaded
(`src-honeycomb/`, extension id `oblcnpolmloddegocendigkgbhbnmegp`), signed in
to bing.com, the Claude in Chrome extension connected, the laptop awake.

---

You run the daily Bing Rewards routine through the Honeycomb Chrome extension
and report to the dashboard artifact at `<ARTIFACT_URL>`. Use the Claude in
Chrome tools. Do not type or enter any credentials anywhere. If you are asked
to sign in to Microsoft or Bing, stop and record a failed run with the note
"signed out" — do not attempt to sign in.

The extension's status page is
`chrome-extension://oblcnpolmloddegocendigkgbhbnmegp/status.html`. It prints
plain `key: value` lines. Query parameters: `?run=1` starts the full routine
(ignored if one is already running), `?refresh=1` re-reads the Rewards stats,
`?stop=1` stops it.

1. **Read state.** Open a new tab, navigate to the status page, read the page
   text. If the page does not load, record a failed run with the note
   "extension not reachable", send a notification, and stop.
   Note `availablePoints` as the starting balance.
2. **Decide.** If `statsAreFromToday: yes`, `stillOpen: none` and
   `routineDoneToday: yes`, nothing is left: skip to step 5 with status `ok`
   and the note "already complete".
3. **Run.** Navigate the same tab to `status.html?run=1`. Then re-read the
   page about once a minute, for at most 45 minutes, until `state: idle`
   appears on two consecutive reads after a `state: running` was seen. If it
   never reached running, note that and treat the run as failed.
4. **Refresh.** Navigate to `status.html?refresh=1`, wait 60 seconds, read the
   page again. These are the final numbers.
5. **Report.** Compute `earned` = final `availablePoints` minus the starting
   balance (numbers only; strip commas). Status is `ok` when `stillOpen` is
   `none`, `partial` when something is still open, `failed` when the run did
   not start or the page showed an error. Write two documents with the
   ArtifactData tool on `<ARTIFACT_URL>`:
   - `runs/<YYYY-MM-DD>` (set), fields: `date`, `status`, `earned`, `balance`,
     `pointsStart`, `pointsEnd`, `searchPoints`, `dailySet`, `visualSearch`,
     `keepEarning`, `membershipLevel`, `nextLevel`, `pointsToNextLevel`
     (from the status page's lines of the same name), `stillOpen`, `notes` (one sentence, plain), `finishedAt`
     (ISO timestamp).
   - `meta/latest` (set), the same fields plus `updatedAt`.
6. **Phone items.** Read the document `phone/<YYYY-MM-DD>` on the dashboard
   with the ArtifactData tool (it may not exist yet, which means nothing is
   ticked). The fields `mobileSearch`, `appCheckin` and `appRead` are the
   things the user does on the phone. List the ones not ticked. Do not create
   or change this document; the user ticks it on the dashboard.
7. **Notify.** Send one short push notification: points earned, balance,
   anything still open in the browser, and the phone items not yet ticked
   ("Mobile searches, app check-in, read to earn"). Say plainly if the run
   failed.

Do not change extension settings, do not click anything on Bing or Rewards
pages yourself, and do not run the routine more than once per invocation.
