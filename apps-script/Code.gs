// Google Apps Script for the progress Sheet (docs/collection-page-requirements.md, section 10).
// It lives in the team lead's private Google Sheet (Extensions > Apps Script).
// This copy in the repository is for reading and history only; GitHub does not run it.
//
// The page sends { "messages": [ { person, mode, round, count, total, time }, ... ] }
// with Content-Type text/plain. Each valid message becomes one row in the tab "progress".
// Invalid messages (wrong code, wrong numbers) are skipped, because anyone who finds the
// web app address could send fake rows.
//
// After every change: Deploy > Manage deployments > edit > Version: New version > Deploy.

const SHEET_NAME = "progress";
const HEADERS = ["received_at", "person", "mode", "round", "count", "total", "page_time"];
const VALID_CODES = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "O1", "O2"];
const VALID_TOTALS = { main: 165, scene: 88 };   // drawings per round (main), canvases per person (scene)
const MAX_MESSAGES = 400;                          // same as PROGRESS_QUEUE_MAX in app.js
// Page time, for example 2026-11-25T14:02:11+07:00. Checked so that no text starting with "=" is written.
const TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return answer({ ok: false, error: "not JSON" });
  }
  const messages = data && Array.isArray(data.messages) ? data.messages.slice(0, MAX_MESSAGES) : [];
  const rows = [];
  const now = new Date();
  messages.forEach(function (m) {
    if (isValid(m)) rows.push([now, m.person, m.mode, m.mode === "main" ? m.round : "", m.count, m.total, m.time]);
  });

  // Two pages may send at the same moment: the lock makes them write one after another.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (rows.length > 0) {
      const sheet = getSheet();
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    }
  } finally {
    lock.releaseLock();
  }
  // ok: true also when some messages were skipped, so the page does not send them again and again.
  return answer({ ok: true, written: rows.length, skipped: messages.length - rows.length });
}

function isValid(m) {
  if (!m || typeof m !== "object") return false;
  if (VALID_CODES.indexOf(m.person) < 0) return false;
  if (!VALID_TOTALS.hasOwnProperty(m.mode)) return false;
  if (m.total !== VALID_TOTALS[m.mode]) return false;
  if (m.mode === "main" && m.round !== 1 && m.round !== 2) return false;
  if (m.mode === "main" && m.person.charAt(0) !== "P") return false;   // O1-O2 use scene mode only
  if (!Number.isInteger(m.count) || m.count < 1 || m.count > m.total) return false;
  if (typeof m.time !== "string" || !TIME_PATTERN.test(m.time)) return false;
  return true;
}

// The tab "progress" is made with its header row the first time a message arrives.
function getSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function answer(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
