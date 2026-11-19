# apps-script

`Code.gs` is the Google Apps Script of the private progress Sheet. It is kept here so the team can read it and see its history. GitHub does not run it: the real copy lives in the Sheet (Extensions > Apps Script), and every change there must be deployed again as a new version.

It has no secret. The web app address is written in `app.js` (`PROGRESS_URL`), because the browser must know it. The script accepts only valid codes (P1–P7, O1–O2) and valid numbers.
