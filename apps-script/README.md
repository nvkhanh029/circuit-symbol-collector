# apps-script

`Code.gs` is the Google Apps Script of the private progress Sheet. It is kept here so the team can read it and see its history. GitHub does not run it: the real copy lives in the Sheet (Extensions > Apps Script), and every change there must be deployed again as a new version.

It does two things:
- `doPost`: writes one progress row per drawing in the tab `progress` (made by the script).
- `doGet`: tells the page whether round 2 is open. The team lead makes a tab `settings` by hand, writes `round2` in A1, and types `open` in B1 to open round 2. Anything else in B1 closes it again for new sessions; round 2 sessions already saved on a device can still continue.

It has no secret. The web app address is written in `app.js` (`PROGRESS_URL`), because the browser must know it. The script accepts only valid codes (P1–P7, O1–O2) and valid numbers.
