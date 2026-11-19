# Circuit symbol collector

A web page (HTML + JavaScript) that collects hand-drawn circuit symbols for a university group project on automatic shape recognition in a note app.

This repository holds **only the page**. It never contains collected data, real names, or the list of which person has which code.

## Status

Work in progress. Main mode works (drawing, saving on the device, example pictures, guide, progress to the Google Sheet, round 2 switch from the Sheet). Not built yet: scene mode.

## Hosting

GitHub Pages, served from the `main` branch, root folder.

## Rules for contributors

- Do not commit drawing files (`P*_*.json`, `O*_*.json`). The `.gitignore` blocks them.
- Do not write real names anywhere in this repository. Use person codes only (P1–P7, O1–O2) when needed.
- Do not write any secret or private link in the code or in this file. The one exception is the Apps Script web app address in `app.js` (`PROGRESS_URL`): the browser must know it, so it is public on purpose, and the script accepts only valid codes and numbers.
