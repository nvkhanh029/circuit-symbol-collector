// Circuit Symbol Collector - piece 1: start screen + canvas that records strokes.
// Not done yet (later pieces): page styles, example pictures, guide, rendered image,
// saving on the device (resume), progress to Google Sheet, scene mode.

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

// Round 2 stays closed until the team lead opens it. For now it is a fixed switch;
// later it will be read from the Google Sheet (requirements, section 3).
const ROUND2_OPEN = false;

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
    leave: "Chưa có lưu trên thiết bị. Nếu rời trang, các hình đã vẽ sẽ mất.",
    mismatch_block: "Thiết bị vẽ không khớp với lựa chọn của bạn ({device}). Hãy tải lại trang và chọn lại thiết bị.",
    mismatch_reload: "Thiết bị vẽ không khớp với lựa chọn của bạn ({device}). Nếu bạn chọn nhầm, hãy tải lại trang và chọn lại.",
    mismatch_team: "Thiết bị vẽ không khớp với lựa chọn của bạn ({device}). Nếu bạn chọn nhầm, hãy báo cho trưởng nhóm.",
    reload: "Tải lại trang",
    close: "Đóng",
    lang_button: "EN",
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
    leave: "Nothing is saved on this device yet. If you leave, the drawings will be lost.",
    mismatch_block: "The drawing device does not match your choice ({device}). Please reload the page and choose your device again.",
    mismatch_reload: "The drawing device does not match your choice ({device}). If you chose the wrong one, reload the page and choose again.",
    mismatch_team: "The drawing device does not match your choice ({device}). If you chose the wrong one, tell the team lead.",
    reload: "Reload page",
    close: "Close",
    lang_button: "VI",
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

// ---------------------------------------------------------------- texts on screen

function applyLanguage() {
  const t = TEXT[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t[el.dataset.i18n]; });
  $("lang-btn").textContent = t.lang_button;
  fillSelects();
  if (!$("draw-screen").classList.contains("hidden")) showLabel();
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

function updateStartButton() {
  $("start-btn").disabled = !($("person-select").value && $("device-select").value);
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
  btn.onclick = canClose ? hideDeviceModal : () => location.reload();
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
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#111827";
  ctx.fillStyle = "#111827";
  return { width: w, height: h };
}

function newDrawing() {
  const size = setupCanvas();
  current = { startedAt: null, t0: null, canvas: size, strokes: [], undoCount: 0 };
  activeStroke = null;
  activePointerId = null;
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

function onPointerDown(e) {
  if (!current || activePointerId !== null) return;     // one pointer at a time
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (session.drawings.length >= TOTAL) return;
  e.preventDefault();

  if (current.t0 === null) {
    current.t0 = e.timeStamp;
    current.startedAt = toLocalISO(new Date());
  }
  activePointerId = e.pointerId;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }

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
  if (current && current.strokes.length === 0) newDrawing();
});

// ---------------------------------------------------------------- buttons

function saveDrawing() {
  const i = session.drawings.length;
  session.drawings.push({
    id: session.person + "_r" + session.round + "_" + pad(i + 1, 4),
    person: session.person,
    round: session.round,
    device_pair: session.devicePair,
    label: session.order[i],
    started_at: current.startedAt,
    canvas: current.canvas,
    undo_count: current.undoCount,
    strokes: current.strokes,
    // Later pieces add: page_style, example_shown, image.
  });
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
    updateButtons();
  }
}

// Draw all remaining strokes again (used after Undo).
function redrawAll() {
  ctx.clearRect(0, 0, current.canvas.width, current.canvas.height);
  for (const s of current.strokes) {
    const pts = s.points;
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
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

function onStart() {
  session.person = $("person-select").value;
  session.devicePair = $("device-select").value;
  session.round = parseInt($("round-select").value, 10);
  session.order = shuffle(
    SYMBOLS.flatMap((s) => Array.from({ length: DRAWINGS_PER_SYMBOL }, () => s))
  );
  session.drawings = [];
  warnedThisSession = false;
  hideDeviceModal();
  $("start-screen").classList.add("hidden");
  $("draw-screen").classList.remove("hidden");
  showLabel();
  newDrawing();
}

// Nothing is saved on the device yet, so warn before leaving with drawings in memory.
window.addEventListener("beforeunload", (e) => {
  if (session.drawings.length > 0) {
    e.preventDefault();
    e.returnValue = TEXT[lang].leave;
  }
});

$("lang-btn").addEventListener("click", () => {
  lang = lang === "vi" ? "en" : "vi";
  try { localStorage.setItem("lang", lang); } catch (e) { /* ignore */ }
  applyLanguage();
});
$("person-select").addEventListener("change", updateStartButton);
$("device-select").addEventListener("change", updateStartButton);
$("start-btn").addEventListener("click", onStart);
$("next-btn").addEventListener("click", onNext);
$("undo-btn").addEventListener("click", onUndo);
$("download-btn").addEventListener("click", onDownload);

applyLanguage();
