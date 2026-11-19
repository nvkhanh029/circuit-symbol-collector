// Circuit Symbol Collector - pieces 1 to 4: start screen, canvas that records strokes,
// random page style, rendered picture, palm rejection (tablet + pen),
// saving on the device (IndexedDB) and resume, example pictures with show/hide, short guide,
// progress messages to the Google Sheet (piece 5).
// Not done yet (later pieces): round 2 switch from the Sheet, scene mode.

"use strict";

// ---------------------------------------------------------------- settings

const PERSON_CODES = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];
const DEVICE_PAIRS = ["tablet_pen", "tablet_finger", "laptop_finger", "phone_finger", "laptop_mouse"];
const SYMBOLS = [
  "cell", "battery", "lamp", "switch_open", "switch_closed", "resistor",
  "resistor_variable", "ammeter", "voltmeter", "capacitor", "diode",
];
const DRAWINGS_PER_SYMBOL = 15;          // per round (docs/collection-page-requirements.md, section 5)
const TOTAL = SYMBOLS.length * DRAWINGS_PER_SYMBOL;   // 165

// Page styles (requirements, section 5). The CSS classes are "page-" + name (see style.css).
const PAGE_STYLES = ["blank", "lined", "dotted"];

// Example pictures (requirements, section 5): one PNG per label, hand-drawn by the team lead.
const EXAMPLE_DIR = "examples/";

// Pen look. The same values are used on the screen and in the saved picture.
const INK_WIDTH = 3;
const INK_COLOR = "#111827";

// Device check (requirements, section 7): which device pairs fit each stroke device.
// "unknown" is not listed on purpose: it never triggers a message.
const DEVICE_FITS = {
  mouse: ["laptop_mouse"],
  stylus: ["tablet_pen"],
  finger: ["tablet_finger", "laptop_finger", "phone_finger"],
};

// false = a mismatch only shows a warning that the person can close.
// true  = before the first drawing is saved, a mismatch stops drawing and the person must reload.
// Keep it false until all 5 device pairs are tested on real devices (a device may report its input wrongly).
const DEVICE_CHECK_BLOCKS = false;

// Palm rejection (tablet + pen only): after the first pen stroke, finger touches are ignored.
// If this many ignored touches come in a row (no pen stroke between them), the person sees a message,
// because they may think drawing with a finger is fine. Value to be tuned on the real tablet.
const IGNORED_TOUCH_LIMIT = 2;

// The button of the device message ignores taps for this long after the message appears.
const MODAL_BUTTON_DELAY_MS = 500;

// Round 2 stays closed until the team lead opens it. For now it is a fixed switch;
// later it will be read from the Google Sheet (requirements, section 3).
const ROUND2_OPEN = false;

// Progress to the Google Sheet (requirements, section 10): the address of the Apps Script web app
// (it ends with /exec). Empty = progress is not sent. This address is not a secret: the browser must
// know it, so anyone can read it here. The script accepts only valid codes and numbers.
const PROGRESS_URL = "https://script.google.com/macros/s/AKfycbyLk1tn77mYVjufgITnQcaPbB_qm354bvj_BfzsVMZkgylDnrgLJKGnMgnGbiAI4GAR/exec";

// A message that could not be sent waits on the device and is sent again later.
// At most this many wait; when there are more, the oldest are dropped (progress only, never drawings).
const PROGRESS_QUEUE_MAX = 400;
const PROGRESS_TIMEOUT_MS = 15000;

// ---------------------------------------------------------------- texts (Vietnamese is the default)

const TEXT = {
  vi: {
    title: "Thu thập ký hiệu mạch điện",
    person_code: "Mã của bạn",
    device_pair: "Thiết bị bạn đang dùng",
    round: "Vòng",
    round2_locked: "Vòng 2 chưa mở.",
    choose: "— chọn —",
    start: "Bắt đầu",
    draw_this: "Hãy vẽ:",
    undo: "Hoàn tác",
    download: "Tải xuống",
    next: "Tiếp",
    done: "Xong! Hãy tải xuống tệp.",
    leave: "Hình vẽ chưa được lưu xong trên thiết bị. Nếu rời trang, chúng có thể bị mất.",
    continue: "Tiếp tục",
    resume_note: "Đã lưu trên thiết bị này: {n} / {total}. Không thể đổi thiết bị.",
    save_failed: "Không lưu được trên thiết bị này (có thể do chế độ riêng tư). Nếu đóng trang, các hình đã vẽ sẽ mất. Hãy tải xuống thường xuyên.",
    mismatch_block: "Thiết bị vẽ không khớp với lựa chọn của bạn ({device}). Hãy tải lại trang và chọn lại thiết bị.",
    mismatch_reload: "Thiết bị vẽ không khớp với lựa chọn của bạn ({device}). Nếu bạn chọn nhầm, hãy tải lại trang và chọn lại.",
    mismatch_team: "Thiết bị vẽ không khớp với lựa chọn của bạn ({device}). Nếu bạn chọn nhầm, hãy báo cho trưởng nhóm.",
    touch_ignored_reload: "Đang ở chế độ bút: nét vẽ bằng ngón tay bị bỏ qua. Hãy dùng bút, hoặc tải lại trang và chọn lại thiết bị.",
    touch_ignored_team: "Đang ở chế độ bút: nét vẽ bằng ngón tay bị bỏ qua. Hãy dùng bút. Nếu bạn chọn nhầm thiết bị, hãy báo cho trưởng nhóm.",
    reload: "Tải lại trang",
    close: "Đóng",
    lang_button: "EN",
    guide: "Hướng dẫn",
    guide_title: "Hướng dẫn",
    guide_ok: "Đã hiểu",
    guide_items: [
      "Bạn vẽ 11 ký hiệu mạch điện cho dự án của nhóm. Mỗi vòng mất khoảng 30 phút (165 hình).",
      "Chọn mã của bạn (trưởng nhóm đã gửi cho bạn) và thiết bị bạn đang dùng.",
      "Vẽ ký hiệu được yêu cầu, theo chiều ngang, có một đoạn dây ngắn ở hai bên. Vẽ với tốc độ bình thường. Đừng cố ý dừng lại.",
      "Hình mẫu ở góc cho biết ký hiệu trông như thế nào. Nếu bạn đã biết ký hiệu, bạn có thể ẩn hình mẫu.",
      "\"Hoàn tác\" xoá nét vẽ cuối cùng. \"Tiếp\" lưu hình vẽ.",
      "Bạn có thể dừng bất cứ lúc nào. Để tiếp tục, hãy mở lại trang trên cùng thiết bị và cùng trình duyệt (không dùng chế độ riêng tư hoặc ẩn danh).",
      "Cuối mỗi lần vẽ, bấm \"Tải xuống\" và tải tệp lên thư mục Google Drive của nhóm. Trên iPhone hoặc iPad, đừng để trang không dùng quá 7 ngày.",
    ],
    example_hide: "Ẩn mẫu",
    example_show: "Hiện mẫu",
    devices: {
      tablet_pen: "Máy tính bảng + bút",
      tablet_finger: "Máy tính bảng + ngón tay",
      laptop_finger: "Laptop cảm ứng + ngón tay",
      phone_finger: "Điện thoại + ngón tay",
      laptop_mouse: "Laptop + chuột",
    },
    symbols: {
      cell: "Pin (cell)",
      battery: "Bộ pin (battery)",
      lamp: "Bóng đèn (lamp)",
      switch_open: "Công tắc mở (open switch)",
      switch_closed: "Công tắc đóng (closed switch)",
      resistor: "Điện trở (resistor)",
      resistor_variable: "Biến trở (variable resistor)",
      ammeter: "Ampe kế (ammeter)",
      voltmeter: "Vôn kế (voltmeter)",
      capacitor: "Tụ điện (capacitor)",
      diode: "Điốt (diode)",
    },
  },
  en: {
    title: "Circuit Symbol Collector",
    person_code: "Your code",
    device_pair: "Device you are using",
    round: "Round",
    round2_locked: "Round 2 is not open yet.",
    choose: "— choose —",
    start: "Start",
    draw_this: "Draw:",
    undo: "Undo",
    download: "Download",
    next: "Next",
    done: "Done! Please download the file.",
    leave: "Your drawings are not saved on this device yet. If you leave now, they may be lost.",
    continue: "Continue",
    resume_note: "Saved on this device: {n} / {total}. The device pair cannot be changed.",
    save_failed: "Saving on this device does not work (maybe private mode). If you close the page, your drawings are lost. Please download often.",
    mismatch_block: "The drawing device does not match your choice ({device}). Please reload the page and choose your device again.",
    mismatch_reload: "The drawing device does not match your choice ({device}). If you chose the wrong one, reload the page and choose again.",
    mismatch_team: "The drawing device does not match your choice ({device}). If you chose the wrong one, tell the team lead.",
    touch_ignored_reload: "Pen mode: finger strokes are ignored. Please use your pen, or reload the page and choose your device again.",
    touch_ignored_team: "Pen mode: finger strokes are ignored. Please use your pen. If you chose the wrong device, tell the team lead.",
    reload: "Reload page",
    close: "Close",
    lang_button: "VI",
    guide: "Guide",
    guide_title: "Guide",
    guide_ok: "OK",
    guide_items: [
      "You draw 11 circuit symbols for our project. One round takes about 30 minutes (165 drawings).",
      "Choose your code (the team lead sent it to you) and the device you are using.",
      "Draw the symbol shown, horizontally, with a short wire on both sides. Draw at your normal speed. Do not pause on purpose.",
      "The example picture in the corner shows the symbol. If you know the symbol, you can hide the example.",
      "\"Undo\" removes your last line. \"Next\" saves the drawing.",
      "You can stop at any time. To continue, open the page again on the same device and the same browser (not private or incognito mode).",
      "At the end of each sitting, press \"Download\" and upload the file to the team's Google Drive folder. On iPhone or iPad, do not leave the page unused for more than 7 days.",
    ],
    example_hide: "Hide example",
    example_show: "Show example",
    devices: {
      tablet_pen: "Tablet + pen",
      tablet_finger: "Tablet + finger",
      laptop_finger: "Touchscreen laptop + finger",
      phone_finger: "Phone + finger",
      laptop_mouse: "Laptop + mouse",
    },
    symbols: {
      cell: "cell",
      battery: "battery",
      lamp: "lamp",
      switch_open: "open switch",
      switch_closed: "closed switch",
      resistor: "resistor",
      resistor_variable: "variable resistor",
      ammeter: "ammeter",
      voltmeter: "voltmeter",
      capacitor: "capacitor",
      diode: "diode",
    },
  },
};

// ---------------------------------------------------------------- state

let lang = "vi";
try { lang = localStorage.getItem("lang") === "en" ? "en" : "vi"; } catch (e) { /* storage blocked: keep default */ }

const session = {
  person: "",
  devicePair: "",
  round: 1,
  order: [],        // mixed list of labels, TOTAL long
  drawings: [],     // saved drawings (in memory only, for now)
};

let current = null; // the drawing in progress: { startedAt, t0, canvas, strokes }
let activeStroke = null;     // the stroke being drawn right now
let activePointerId = null;  // only one pointer is followed at a time
let warnedThisSession = false;   // the closable device warning is shown at most once per session
let penSeen = false;             // tablet + pen: a pen stroke has started in this session
let ignoredTouchRun = 0;         // tablet + pen: ignored touches in a row (reset by a pen stroke)
let touchWarningPending = false; // show the "touch ignored" message when that touch ends

// Example picture: the show/hide choice is remembered on the device (shown by default).
let exampleVisible = true;
try { exampleVisible = localStorage.getItem("exampleVisible") !== "false"; } catch (e) { /* keep default */ }
const exampleOk = {};   // label -> true when its picture has loaded (a picture that fails is never shown)

// ---------------------------------------------------------------- small helpers

const $ = (id) => document.getElementById(id);

function pad(n, size) { return String(n).padStart(size || 2, "0"); }

// Local time with offset, e.g. 2026-11-25T14:02:11+07:00
function toLocalISO(date) {
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
    "T" + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds()) +
    sign + pad(Math.floor(abs / 60)) + ":" + pad(abs % 60);
}

function shuffle(list) {   // Fisher-Yates
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Saved device names are always English (requirements, section 7).
function deviceFromPointerType(type) {
  if (type === "mouse") return "mouse";
  if (type === "pen") return "stylus";
  if (type === "touch") return "finger";
  return "unknown";
}

// ---------------------------------------------------------------- saving on the device (IndexedDB)

// Two stores. "sessions" has one small record per person + round (device pair, order of the symbols,
// number of saved drawings) and the record "__last" (last choice, used to pre-fill the start screen).
// "drawings" has one record per saved drawing. After each drawing only that drawing is written,
// together with the session record, in one transaction (all or nothing).
const DB_NAME = "circuit-symbol-collector";
const STORE_SESSIONS = "sessions";
const STORE_DRAWINGS = "drawings";
const LAST_KEY = "__last";

let db = null;               // null = saving on the device does not work
let storageOk = true;        // false after a failed save: no more saving, the person is warned
let pendingSaves = 0;        // saves that are not finished yet
let saveQueue = Promise.resolve();    // saves run one after another, in order
let storageReady = Promise.resolve(); // resolved when the database is open and the start screen is pre-filled
let savedMeta = null;        // saved session of the person + round chosen on the start screen
let refreshToken = 0;        // so that an old lookup cannot overwrite a newer one

function sessionKey(person, round) { return person + "_r" + round; }

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("aborted"));
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error("no IndexedDB")); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_SESSIONS, { keyPath: "key" });
      req.result.createObjectStore(STORE_DRAWINGS, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function timeoutAfter(ms) {
  return new Promise((resolve, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

function getSessionRecord(key) {
  return requestToPromise(db.transaction(STORE_SESSIONS).objectStore(STORE_SESSIONS).get(key));
}

// The saved session of one person + round: its record and all its drawings, in order.
async function loadSession(key) {
  const tx = db.transaction([STORE_SESSIONS, STORE_DRAWINGS]);
  const range = IDBKeyRange.bound(key + "_", key + "_￿");   // ids look like P1_r1_0001
  const [meta, drawings] = await Promise.all([
    requestToPromise(tx.objectStore(STORE_SESSIONS).get(key)),
    requestToPromise(tx.objectStore(STORE_DRAWINGS).getAll(range)),
  ]);
  if (!meta) return null;
  drawings.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { meta: meta, drawings: drawings };
}

// Called after a drawing is added to session.drawings. The person does not wait for it.
function persistDrawing(drawing) {
  if (!db || !storageOk) return;
  const meta = {
    key: sessionKey(session.person, session.round),
    mode: "main",
    person: session.person,
    devicePair: session.devicePair,
    round: session.round,
    order: session.order,
    count: session.drawings.length,
    updatedAt: toLocalISO(new Date()),
  };
  const last = { key: LAST_KEY, person: session.person, devicePair: session.devicePair, round: session.round };
  pendingSaves++;
  saveQueue = saveQueue.then(async () => {
    const tx = db.transaction([STORE_SESSIONS, STORE_DRAWINGS], "readwrite");
    tx.objectStore(STORE_DRAWINGS).put(drawing);
    tx.objectStore(STORE_SESSIONS).put(meta);
    tx.objectStore(STORE_SESSIONS).put(last);
    await transactionDone(tx);
  }).catch(() => {
    storageOk = false;           // for example the storage is full: stop saving, warn the person
    updateStorageNotes();
  }).finally(() => { pendingSaves--; });
}

function updateStorageNotes() {
  const text = TEXT[lang].save_failed;
  $("storage-note").textContent = text;
  $("save-note").textContent = text;
  $("storage-note").classList.toggle("hidden", storageOk);
  $("save-note").classList.toggle("hidden", storageOk);
}

// Start screen: is there a saved session for the chosen person + round?
async function refreshSelection() {
  const token = ++refreshToken;
  const person = $("person-select").value;
  const round = $("round-select").value;
  let meta = null;
  if (db && person) {
    try { meta = await getSessionRecord(sessionKey(person, round)); } catch (e) { meta = null; }
  }
  if (token !== refreshToken) return;
  if (!meta && savedMeta) $("device-select").value = "";   // do not keep the locked device of another session
  savedMeta = meta || null;
  updateStartButton();
}

function initStorage() {
  storageReady = Promise.race([openDb(), timeoutAfter(4000)])
    .then((d) => { db = d; })
    .catch(() => { db = null; storageOk = false; })
    .then(async () => {
      updateStorageNotes();
      if (!db) return;
      try {
        const last = await getSessionRecord(LAST_KEY);
        if (last && !$("person-select").value) {          // pre-fill with the last choice
          if (PERSON_CODES.includes(last.person)) $("person-select").value = last.person;
          if (DEVICE_PAIRS.includes(last.devicePair)) $("device-select").value = last.devicePair;
          $("round-select").value = (last.round === 2 && !ROUND2_OPEN) ? "1" : String(last.round);
        }
        await refreshSelection();
      } catch (e) { /* the start screen stays empty */ }
    });
}

// ---------------------------------------------------------------- progress to the Google Sheet

// After every saved drawing, a small message (person code, mode, round, count, time; never drawings
// or names) goes into a waiting list. The list is sent to the Apps Script web app, which adds one row
// per message to the Sheet. If sending fails (no internet, Google down), the list stays on the device
// (localStorage) and is sent again: after the next drawing, when the internet comes back, or when
// the page is opened again. Sending never blocks drawing and never shows a message.
const PROGRESS_QUEUE_KEY = "progressQueue";
let progressQueue = [];
let progressSending = false;

try {
  const q = JSON.parse(localStorage.getItem(PROGRESS_QUEUE_KEY) || "[]");
  if (Array.isArray(q)) progressQueue = q;
} catch (e) { progressQueue = []; }   // storage blocked: the list lives in memory only

function storeProgressQueue() {
  try { localStorage.setItem(PROGRESS_QUEUE_KEY, JSON.stringify(progressQueue)); } catch (e) { /* ignore */ }
}

function queueProgress() {
  if (!PROGRESS_URL) return;
  progressQueue.push({
    person: session.person,
    mode: "main",
    round: session.round,
    count: session.drawings.length,
    total: TOTAL,
    time: toLocalISO(new Date()),
  });
  if (progressQueue.length > PROGRESS_QUEUE_MAX) progressQueue = progressQueue.slice(-PROGRESS_QUEUE_MAX);
  storeProgressQueue();
  sendProgress();
}

// Send the whole waiting list in one request. Only one request runs at a time.
async function sendProgress() {
  if (!PROGRESS_URL || progressSending || progressQueue.length === 0) return;
  if (navigator.onLine === false) return;            // the "online" event sends it later
  progressSending = true;
  const batch = progressQueue.slice();
  const controller = window.AbortController ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), PROGRESS_TIMEOUT_MS) : null;
  let ok = false;
  try {
    // text/plain, not application/json: Apps Script does not answer the browser's CORS preflight check.
    const res = await fetch(PROGRESS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ messages: batch }),
      redirect: "follow",
      signal: controller ? controller.signal : undefined,
    });
    const answer = await res.json();
    ok = !!answer && answer.ok === true;
  } catch (e) {
    ok = false;                                       // try again later
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (ok) {
    // Remove only the messages that were sent; new ones may have arrived during the request.
    progressQueue = progressQueue.slice(batch.length);
    storeProgressQueue();
  }
  progressSending = false;
  if (ok && progressQueue.length > 0) sendProgress();
}

window.addEventListener("online", sendProgress);

// ---------------------------------------------------------------- texts on screen

function applyLanguage() {
  const t = TEXT[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t[el.dataset.i18n]; });
  $("lang-btn").textContent = t.lang_button;
  fillSelects();
  updateStorageNotes();
  if (!$("draw-screen").classList.contains("hidden")) showLabel();
  renderGuide();
  updateExample();
  updateButtons();
}

function fillSelects() {
  const t = TEXT[lang];
  const person = $("person-select").value;
  const device = $("device-select").value;

  $("person-select").innerHTML = "";
  $("person-select").add(new Option(t.choose, ""));
  PERSON_CODES.forEach((c) => $("person-select").add(new Option(c, c)));
  $("person-select").value = person;

  $("device-select").innerHTML = "";
  $("device-select").add(new Option(t.choose, ""));
  DEVICE_PAIRS.forEach((d) => $("device-select").add(new Option(t.devices[d], d)));
  $("device-select").value = device;

  const round = $("round-select").value || "1";
  $("round-select").innerHTML = "";
  $("round-select").add(new Option("1", "1"));
  const r2 = new Option("2", "2");
  r2.disabled = !ROUND2_OPEN;
  $("round-select").add(r2);
  $("round-select").value = round;
  $("round-note").classList.toggle("hidden", ROUND2_OPEN);
  updateStartButton();
}

// Start screen state. A saved session of the chosen person + round locks the device pair
// and turns Start into Continue.
function updateStartButton() {
  const t = TEXT[lang];
  const device = $("device-select");
  if (savedMeta) {
    device.value = savedMeta.devicePair;
    device.disabled = true;
  } else {
    device.disabled = false;
  }
  $("start-btn").disabled = !($("person-select").value && device.value);
  $("start-btn").textContent = savedMeta ? t.continue : t.start;
  const note = $("resume-note");
  note.classList.toggle("hidden", !savedMeta);
  if (savedMeta) note.textContent = t.resume_note.replace("{n}", savedMeta.count).replace("{total}", TOTAL);
}

function showLabel() {
  const t = TEXT[lang];
  const i = session.drawings.length;
  if (i >= TOTAL) {
    $("symbol-label").textContent = t.done;
    $("progress").textContent = TOTAL + " / " + TOTAL;
    return;
  }
  $("symbol-label").textContent = t.symbols[session.order[i]];
  $("progress").textContent = (i + 1) + " / " + TOTAL;
}

// ---------------------------------------------------------------- example picture

// Load all pictures once at the start, so they appear at once and the page knows which ones work.
function preloadExamples() {
  SYMBOLS.forEach((label) => {
    const img = new Image();
    img.onload = () => { exampleOk[label] = true; updateExample(); };
    img.onerror = () => { exampleOk[label] = false; updateExample(); };
    img.src = EXAMPLE_DIR + label + ".png";
  });
}

// Is the example picture of the current symbol on the screen right now?
function exampleOnScreen() {
  const label = currentLabel();
  return !!label && exampleOk[label] === true && exampleVisible &&
    !$("draw-screen").classList.contains("hidden");
}

function currentLabel() {
  if (!current || session.drawings.length >= TOTAL) return null;
  return session.order[session.drawings.length];
}

// Show the example of the current symbol, or the collapsed box, or nothing.
// It also records whether the picture was on the screen during this drawing (example_shown).
function updateExample() {
  const label = currentLabel();
  const box = $("example-box");
  const t = TEXT[lang];
  if (!label || !exampleOk[label] || $("draw-screen").classList.contains("hidden")) {
    box.classList.add("hidden");
    return;
  }
  const src = EXAMPLE_DIR + label + ".png";
  if ($("example-img").getAttribute("src") !== src) $("example-img").setAttribute("src", src);
  box.classList.remove("hidden");
  box.classList.toggle("collapsed", !exampleVisible);
  $("example-btn").textContent = exampleVisible ? t.example_hide : t.example_show;
  // example_shown: true if the picture was on the screen at any moment while the person drew,
  // that is from the first stroke of this drawing until Next (see also onPointerDown).
  if (exampleVisible && current.t0 !== null) current.exampleSeen = true;
}

function onToggleExample() {
  exampleVisible = !exampleVisible;
  try { localStorage.setItem("exampleVisible", String(exampleVisible)); } catch (e) { /* ignore */ }
  updateExample();
}

// ---------------------------------------------------------------- guide

function renderGuide() {
  const list = $("guide-list");
  list.innerHTML = "";
  TEXT[lang].guide_items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
}

function openGuide() { $("guide-screen").classList.remove("hidden"); }
function closeGuide() { $("guide-screen").classList.add("hidden"); }

// ---------------------------------------------------------------- device check

// Does this stroke device NOT fit the chosen device pair?
function deviceMismatch(strokeDevice) {
  const fits = DEVICE_FITS[strokeDevice];
  if (!fits) return false;                 // unknown device: no message
  return !fits.includes(session.devicePair);
}

// Big message in the middle of the screen, in the page language.
// textKey: which text to show. canClose: true = Close button, false = Reload button only.
function showDeviceModal(textKey, canClose) {
  const t = TEXT[lang];
  $("modal-text").textContent = t[textKey].replace("{device}", t.devices[session.devicePair]);
  const btn = $("modal-btn");
  btn.textContent = canClose ? t.close : t.reload;
  // The message often appears when a finger lifts. The tap that follows must not press the button
  // by accident, so the button works only after a short moment.
  const shownAt = performance.now();
  const action = canClose ? hideDeviceModal : () => location.reload();
  btn.onclick = () => { if (performance.now() - shownAt >= MODAL_BUTTON_DELAY_MS) action(); };
  $("device-modal").classList.remove("hidden");
}

function hideDeviceModal() {
  $("device-modal").classList.add("hidden");
}

// Called when a stroke has ended (never during the stroke, so the line stays visible).
function handleDeviceMismatch(stroke) {
  const noDrawingSaved = session.drawings.length === 0;

  if (DEVICE_CHECK_BLOCKS && noDrawingSaved) {
    // Stop: the wrong stroke is not kept, and the person must reload and choose again.
    const i = current.strokes.indexOf(stroke);
    if (i >= 0) current.strokes.splice(i, 1);
    if (current.strokes.length === 0) { current.t0 = null; current.startedAt = null; }
    redrawAll();
    updateButtons();
    showDeviceModal("mismatch_block", false);
    return;
  }

  // Warning: the stroke is kept. Shown once per session.
  if (!warnedThisSession) {
    warnedThisSession = true;
    showDeviceModal(noDrawingSaved ? "mismatch_reload" : "mismatch_team", true);
  }
}

function updateButtons() {
  const finished = session.drawings.length >= TOTAL;
  const hasInk = !!current && current.strokes.length > 0;
  $("next-btn").disabled = finished || !hasInk;
  $("undo-btn").disabled = finished || !hasInk;
  $("download-btn").disabled = session.drawings.length === 0;
}

// ---------------------------------------------------------------- canvas

const canvas = $("canvas");
const ctx = canvas.getContext("2d");

// The canvas fills the free space. Its size is fixed when a new drawing starts,
// so the saved coordinates always match the saved canvas size.
function setupCanvas() {
  canvas.style.width = "";
  canvas.style.height = "";
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  setInk(ctx);
  return { width: w, height: h };
}

function setInk(c) {
  c.lineWidth = INK_WIDTH;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = INK_COLOR;
  c.fillStyle = INK_COLOR;
}

// Page style: a CSS class on the canvas element. It is not drawn into the canvas pixels.
function setPageStyle(style) {
  PAGE_STYLES.forEach((s) => canvas.classList.toggle("page-" + s, s === style));
}

function randomPageStyle() {
  return PAGE_STYLES[Math.floor(Math.random() * PAGE_STYLES.length)];
}

// keepStyle: true when the same drawing is only fitted again (window resize), so the style does not change.
function newDrawing(keepStyle) {
  const size = setupCanvas();
  const pageStyle = keepStyle && current ? current.pageStyle : randomPageStyle();
  const exampleSeen = keepStyle && current ? current.exampleSeen : false;
  setPageStyle(pageStyle);
  current = { startedAt: null, t0: null, canvas: size, pageStyle: pageStyle, strokes: [], undoCount: 0,
    exampleSeen: exampleSeen };
  activeStroke = null;
  activePointerId = null;
  updateExample();
  updateButtons();
}

function pointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left - canvas.clientLeft;
  const y = e.clientY - rect.top - canvas.clientTop;
  // Time: milliseconds from the first touch of this drawing.
  const t = Math.round(e.timeStamp - current.t0);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10, t];
}

// Remove the stroke that is being drawn right now (used when a pen replaces a palm touch).
function dropActiveStroke() {
  const i = current.strokes.indexOf(activeStroke);
  if (i >= 0) current.strokes.splice(i, 1);
  if (current.strokes.length === 0) { current.t0 = null; current.startedAt = null; }
  activeStroke = null;
  activePointerId = null;
  redrawAll();
  updateButtons();
}

function onPointerDown(e) {
  if (!current) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (session.drawings.length >= TOTAL) return;

  const penMode = session.devicePair === "tablet_pen";

  if (activePointerId !== null) {
    // Pen priority (tablet + pen): a pen replaces a touch stroke that is still active (a palm).
    if (penMode && e.pointerType === "pen" && activeStroke && activeStroke.device === "finger") {
      dropActiveStroke();
    } else {
      return;                                           // one pointer at a time
    }
  }

  if (penMode) {
    if (e.pointerType === "pen") {
      penSeen = true;
      ignoredTouchRun = 0;
    } else if (e.pointerType === "touch" && penSeen) {
      // Palm rejection: touches are ignored after the first pen stroke.
      e.preventDefault();
      if (e.isPrimary) {
        ignoredTouchRun += 1;
        if (ignoredTouchRun >= IGNORED_TOUCH_LIMIT) {
          ignoredTouchRun = 0;
          touchWarningPending = true;                    // shown when this touch ends
        }
      }
      return;
    }
  }

  e.preventDefault();

  if (current.t0 === null) {
    current.t0 = e.timeStamp;
    current.startedAt = toLocalISO(new Date());
  }
  activePointerId = e.pointerId;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }

  if (exampleOnScreen()) current.exampleSeen = true;   // example_shown (requirements, section 5)

  activeStroke = { device: deviceFromPointerType(e.pointerType), points: [pointFromEvent(e)] };
  current.strokes.push(activeStroke);

  const p = activeStroke.points[0];
  ctx.beginPath();
  ctx.arc(p[0], p[1], ctx.lineWidth / 2, 0, Math.PI * 2);   // a dot, so a single tap is visible
  ctx.fill();
  updateButtons();
}

function onPointerMove(e) {
  if (e.pointerId !== activePointerId || !activeStroke) return;
  e.preventDefault();
  const pts = activeStroke.points;
  const prev = pts[pts.length - 1];
  const p = pointFromEvent(e);
  pts.push(p);
  ctx.beginPath();
  ctx.moveTo(prev[0], prev[1]);
  ctx.lineTo(p[0], p[1]);
  ctx.stroke();
}

function onPointerEnd(e) {
  if (touchWarningPending && e.pointerType === "touch" && e.isPrimary) {
    touchWarningPending = false;
    showDeviceModal(session.drawings.length === 0 ? "touch_ignored_reload" : "touch_ignored_team", true);
  }
  if (e.pointerId !== activePointerId) return;
  if (e.type === "pointerup" && activeStroke) {
    const pts = activeStroke.points;
    const prev = pts[pts.length - 1];
    const p = pointFromEvent(e);
    if (p[0] !== prev[0] || p[1] !== prev[1] || p[2] !== prev[2]) {
      pts.push(p);
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
  }
  const finished = activeStroke;
  activeStroke = null;
  activePointerId = null;
  if (finished && deviceMismatch(finished.device)) handleDeviceMismatch(finished);
}

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerEnd);
canvas.addEventListener("pointercancel", onPointerEnd);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("gesturestart", (e) => e.preventDefault());   // iOS pinch zoom

// If the window changes size before the first stroke, fit the canvas again.
window.addEventListener("resize", () => {
  if ($("draw-screen").classList.contains("hidden")) return;
  if (current && current.strokes.length === 0) newDrawing(true);
});

// ---------------------------------------------------------------- buttons

function saveDrawing() {
  const i = session.drawings.length;
  const drawing = {
    id: session.person + "_r" + session.round + "_" + pad(i + 1, 4),
    person: session.person,
    round: session.round,
    device_pair: session.devicePair,
    label: session.order[i],
    started_at: current.startedAt,
    canvas: current.canvas,
    page_style: current.pageStyle,
    example_shown: current.exampleSeen,
    undo_count: current.undoCount,
    strokes: current.strokes,
    image: renderImage(current.canvas, current.strokes),
  };
  session.drawings.push(drawing);
  persistDrawing(drawing);
  queueProgress();
}

// The saved picture: only the strokes, black on white, at the canvas size (scale 1).
// The page style is not drawn into it. It is made from the final strokes, so it always
// matches what is left after Undo.
function renderImage(size, strokes) {
  const off = document.createElement("canvas");
  off.width = size.width;
  off.height = size.height;
  const c = off.getContext("2d");
  c.fillStyle = "#fff";
  c.fillRect(0, 0, off.width, off.height);
  setInk(c);
  drawStrokes(c, strokes);
  return off.toDataURL("image/png");
}

function onNext() {
  if (!current || current.strokes.length === 0) return;
  saveDrawing();
  showLabel();
  if (session.drawings.length < TOTAL) {
    newDrawing();
  } else {
    current = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateExample();
    updateButtons();
  }
}

// Draw strokes on a canvas context (the ink look must already be set with setInk).
function drawStrokes(c, strokes) {
  for (const s of strokes) {
    const pts = s.points;
    c.beginPath();
    c.arc(pts[0][0], pts[0][1], c.lineWidth / 2, 0, Math.PI * 2);   // a dot, so a single tap is visible
    c.fill();
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
}

// Draw all remaining strokes again (used after Undo).
function redrawAll() {
  ctx.clearRect(0, 0, current.canvas.width, current.canvas.height);
  drawStrokes(ctx, current.strokes);
}

// Undo removes the last stroke. It is not saved. Times of the other strokes stay as recorded.
function onUndo() {
  if (!current || activePointerId !== null || current.strokes.length === 0) return;
  current.strokes.pop();
  current.undoCount += 1;
  if (current.strokes.length === 0) {      // nothing left: time starts again at the next first touch
    current.t0 = null;
    current.startedAt = null;
  }
  redrawAll();
  updateButtons();
}

function onDownload() {
  const now = new Date();
  const data = {
    format_version: 1,
    mode: "main",
    exported_at: toLocalISO(now),
    drawings: session.drawings,
  };
  const name = session.person + "_main_r" + session.round + "_" +
    now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + ".json";
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function onStart() {
  const person = $("person-select").value;
  const chosenDevice = $("device-select").value;
  const round = parseInt($("round-select").value, 10);
  $("start-btn").disabled = true;          // no double tap while the saved session is loading

  // Ask for persistent storage (a user tap is needed in some browsers). The answer is not used.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* ignore */ }

  await storageReady;
  let saved = null;
  if (db) {
    try { saved = await loadSession(sessionKey(person, round)); } catch (e) { storageOk = false; updateStorageNotes(); }
  }

  session.person = person;
  session.round = round;
  if (saved) {                              // continue: the device pair and the order are the saved ones
    session.devicePair = saved.meta.devicePair;
    session.order = saved.meta.order;
    session.drawings = saved.drawings;
  } else {
    session.devicePair = chosenDevice;
    session.order = shuffle(
      SYMBOLS.flatMap((s) => Array.from({ length: DRAWINGS_PER_SYMBOL }, () => s))
    );
    session.drawings = [];
  }
  warnedThisSession = false;
  penSeen = false;
  ignoredTouchRun = 0;
  touchWarningPending = false;
  hideDeviceModal();
  $("start-screen").classList.add("hidden");
  $("draw-screen").classList.remove("hidden");
  showLabel();
  if (session.drawings.length < TOTAL) {
    newDrawing();
  } else {                                  // this round is already finished: only Download is possible
    current = null;
    setPageStyle("blank");
    updateExample();
    updateButtons();
  }
  // Short guide before the first drawing of a new round 1 session (not when continuing).
  if (!saved && round === 1) openGuide();
}

// Warn before leaving while a save is not finished, or when saving on the device does not work.
window.addEventListener("beforeunload", (e) => {
  const notSaved = pendingSaves > 0 || (!storageOk && session.drawings.length > 0);
  if (notSaved) {
    e.preventDefault();
    e.returnValue = TEXT[lang].leave;
  }
});

$("lang-btn").addEventListener("click", () => {
  lang = lang === "vi" ? "en" : "vi";
  try { localStorage.setItem("lang", lang); } catch (e) { /* ignore */ }
  applyLanguage();
});
$("person-select").addEventListener("change", refreshSelection);
$("round-select").addEventListener("change", refreshSelection);
$("device-select").addEventListener("change", updateStartButton);
$("start-btn").addEventListener("click", onStart);
$("next-btn").addEventListener("click", onNext);
$("undo-btn").addEventListener("click", onUndo);
$("download-btn").addEventListener("click", onDownload);
$("example-btn").addEventListener("click", onToggleExample);
$("guide-btn").addEventListener("click", openGuide);
$("guide-btn-start").addEventListener("click", openGuide);
$("guide-ok").addEventListener("click", closeGuide);

preloadExamples();
applyLanguage();
initStorage();
sendProgress();   // messages left over from an earlier visit
