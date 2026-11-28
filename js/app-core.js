
/* ============================================================
   Train & Fuel — app shell
   Data model: localStorage = instant cache. Worker + D1 = source
   of truth. Every write goes to both; every load prefers the
   Worker's copy when reachable. This is what makes history/
   settings/imports survive a refresh, a cache clear, or a new
   device — the old app only had localStorage.
   ============================================================ */

// Bumped by hand on every shipped change (not auto-generated — there's no
// build step). Shown in Settings so it's possible to tell, in two seconds,
// whether a given device is actually running a fix or just looks like it
// might be — instead of guessing from symptoms or trusting a claim that a
// push "should" have propagated by now.
const APP_BUILD = "2026-11-25 Today redesign";

// Day names show in Title Case ("Push + Core A") wherever they appear, whatever case the stored plan uses.
function dayTitle(name) {
  return String(name == null ? "" : name).replace(/(^|[\s(+/-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function extractJson(text) {
  // Claude sometimes wraps JSON in ```json ... ``` fences even when told not to.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Valid JSON followed (or preceded) by extra prose / a second block:
    // take the first balanced top-level object or array and ignore the rest.
    const first = firstBalancedJson(cleaned);
    if (first !== null) return first;
    // Likely truncated mid-array (hit max_tokens). Try to salvage complete
    // top-level array entries (e.g. finished "phases") instead of failing outright.
    const repaired = repairTruncatedJson(cleaned);
    if (repaired) return repaired;
    throw err;
  }
}

function firstBalancedJson(text) {
  for (let start = 0; start < text.length; start++) {
    const open = text[start];
    if (open !== "{" && open !== "[") continue;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(text.slice(start, i + 1)); } catch (e) { return null; }
        }
      }
    }
    return null; // first bracket never closed (truncated): let the repair path handle it
  }
  return null;
}

function repairTruncatedJson(text) {
  // Find the last complete "},\n" or "}\n" boundary inside the first array
  // in the text, then close arrays/braces to make it valid. Best-effort only.
  const arrayStart = text.indexOf("[");
  if (arrayStart === -1) return null;
  let lastCompleteObjEnd = -1;
  let depth = 0;
  for (let i = arrayStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") { depth--; if (depth === 0) lastCompleteObjEnd = i; }
  }
  if (lastCompleteObjEnd === -1) return null;
  const salvaged = text.slice(0, lastCompleteObjEnd + 1) + "]}";
  try { return JSON.parse(salvaged); } catch (e) { return null; }
}

const LS_KEY = "tf_state_v1";
const LS_WORKER_URL_KEY = "tf_worker_url";
const LS_TOKEN_KEY = "tf_token";   // access passphrase for the cloud server (entered once per device)
function tfToken() { try { return localStorage.getItem(LS_TOKEN_KEY) || ""; } catch (e) { return ""; } }
function withAuth(opts) {
  const o = Object.assign({}, opts || {});
  // Only send the header when a passphrase is saved: an Authorization header
  // forces a CORS preflight, which a server that doesn't allow it rejects,
  // making every request fail and the app look offline.
  const t = tfToken();
  if (t) o.headers = Object.assign({}, o.headers || {}, { "Authorization": "Bearer " + t });
  return o;
}
let askedForToken = false;
async function askForToken(reason, bad) {
  if (askedForToken) return;
  if (bad !== undefined && tfToken() !== bad) return;   // already replaced by an earlier prompt
  askedForToken = true;
  const t = window.prompt((reason ? reason + "\n\n" : "") + "Enter your Train & Fuel access passphrase (like abcd-efgh-jkmn-pqrs):", "");
  if (t && t.trim()) {
    try { localStorage.setItem(LS_TOKEN_KEY, t.trim()); } catch (e) {}
    askedForToken = false;
    await init();
  }
}

// Baked in as a default so clearing site data / cache never disconnects the
// app from its data — this is a fixed endpoint for this app, not something
// that changes. Settings can still override it if it's ever redeployed elsewhere.
const DEFAULT_WORKER_URL = "https://train-fuel.andy-p-ruiz.workers.dev";
let WORKER_URL = localStorage.getItem(LS_WORKER_URL_KEY) || DEFAULT_WORKER_URL;
let state = { settings: { startingLevels: { push: "beginner", pull: "beginner", legs: "beginner", hinge: "beginner", core: "beginner", ruck: "beginner" },
  macroTargets: { calories: 2300, protein: 160, carbs: 200, fat: 70 } },
  measurements: [], logs: [], cardioLogs: [], foodLogs: [], activeProgramId: null, weekAdjustment: 0,
  progressLevels: { push: 1, pull: 1, legs: 1, hinge: 1, core: 1, ruck: 1 },
  // Per-movement-plane levels — the actual progression axis for push/pull
  // generation now (progressLevels.push/.pull above stays in sync as the
  // higher of the two planes, purely so existing UI that reads the flat
  // push/pull number — the swap picker, library filter, progress charts —
  // keeps working without every one of those call sites needing a rewrite).
  planeLevels: { push_h: 1, push_v: 1, pull_h: 1, pull_v: 1 },
  lastPlaneServed: { push: null, pull: null },
  ringStrap: { push: null },
  milestonesSeen: { weightLbs: [], workoutDays: [] }, celebrations: [] };
let exercises = [];
let programs = [];
let saveTimer = null;

function setSync(ok, label) {
  document.getElementById("syncDot").classList.toggle("ok", ok);
  document.getElementById("syncLabel").textContent = label;
}

// One retry, network-level failures only (fetch itself throwing — a dropped
// mobile connection, DNS hiccup, etc.) — never for a clean HTTP error
// response, since retrying a 400 "image too large" just wastes a mobile
// data round-trip to get the same rejection again.
async function fetchWithRetry(url, opts, retries = 1) {
  try {
    return await fetch(url, opts);
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r => setTimeout(r, 600));
    return fetchWithRetry(url, opts, retries - 1);
  }
}

async function apiFetch(path, opts) {
  if (!WORKER_URL) throw new Error("no worker url configured");
  const resp = await fetch(WORKER_URL.replace(/\/$/, "") + path, withAuth(opts));
  if (resp.status === 401) {
    setSync(false, "locked — access passphrase needed (Settings)");
    const bad = tfToken();
    setTimeout(() => askForToken(bad ? "That passphrase wasn't accepted." : "This app needs its access passphrase.", bad), 50);
    throw new Error("unauthorized");
  }
  if (!resp.ok) throw new Error("request failed: " + resp.status);
  return resp.json();
}

// ---- state load/save ----
async function loadState() {
  const cached = localStorage.getItem(LS_KEY);
  if (cached) state = JSON.parse(cached);
  let needPush = false;

  if (!WORKER_URL) { setSync(false, "no worker configured — offline only"); return; }

  try {
    const remote = await apiFetch("/api/state", { method: "GET" });
    if (remote && Object.keys(remote).length) {
      const base = getBase();
      if (cached && isDirty()) {
        // This phone has changes the server never confirmed. Don't overwrite them.
        if (base && (remote._savedAt || 0) !== (base._savedAt || 0)) {
          // Another device saved too: combine both sets of changes against the last shared copy.
          state = merge3(base, state, remote);
        } else if (!base && (remote._savedAt || 0) > (state._savedAt || 0)) {
          state = mergeStates(state, remote); // no shared copy recorded yet (first run after update)
        }
        needPush = true;
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      } else {
        state = remote;
        setBase(remote);
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      }
    }
    setSync(true, needPush ? "syncing saved changes" : "synced");
  } catch (e) {
    setSync(false, isDirty() ? "offline: saved on this phone, will sync" : "offline: using local cache");
  }
  if (!state.progressLevels) {
    state.progressLevels = { push: 1, pull: 1, legs: 1, hinge: 1, core: 1, ruck: 1 };
  }
  if (!state.planeLevels) {
    // Seed both planes from whatever the existing flat push/pull level is,
    // so nobody's current progress looks like it reset — they'll diverge
    // independently from here based on which plane actually gets trained.
    state.planeLevels = {
      push_h: state.progressLevels.push || 1, push_v: state.progressLevels.push || 1,
      pull_h: state.progressLevels.pull || 1, pull_v: state.progressLevels.pull || 1,
    };
  }
  if (!state.lastPlaneServed) {
    state.lastPlaneServed = { push: null, pull: null };
  }
  if (!state.ringStrap) {
    state.ringStrap = { push: null };
  }
  state.weekAdjustment = 0; // retired: week number is calendar-driven now
  if (!state.programProgress || typeof state.programProgress !== "object") state.programProgress = {};
  // One-time conversion for the program that was already running before
  // pace-by-workouts existed: switch it to workout-count pacing and seed the
  // count from the distinct days with logged sessions since its start date,
  // so the person lands where they actually are, not back at workout 0.
  // Only for a true legacy state (no program has any progress entry yet). A
  // brand-new program added later must start at 0, not inherit the old
  // program's logged days — that bug put a new program at workout 12.
  if (state.activeProgramId && !state.programProgress[state.activeProgramId] && Object.keys(state.programProgress).length === 0) {
    const startMs = state.settings?.startDate ? new Date(state.settings.startDate + "T00:00:00").getTime() : 0;
    const days = new Set((state.logs || [])
      .filter(l => new Date(l.date).getTime() >= startMs)
      .map(l => new Date(l.date).toDateString()));
    state.programProgress[state.activeProgramId] = { mode: "count", completed: days.size };
  }
  if (!state.settings) state.settings = {};
  if (!state.settings.startingLevels) {
    state.settings.startingLevels = { push: "beginner", pull: "beginner", legs: "beginner", hinge: "beginner", core: "beginner", ruck: "beginner" };
  }
  if (!state.cardioLogs) state.cardioLogs = [];
  if (!state.foodLogs) state.foodLogs = [];
  if (!state.foodDayFlags || typeof state.foodDayFlags !== "object") state.foodDayFlags = {};
  if (!state.foodDayClosed || typeof state.foodDayClosed !== "object") state.foodDayClosed = {};
  if (!Array.isArray(state.hiddenRecentFoods)) state.hiddenRecentFoods = [];
  if (!state.coachTeaserDismissed || typeof state.coachTeaserDismissed !== "object") state.coachTeaserDismissed = null;
  if (!state.coachNoteDismissed || typeof state.coachNoteDismissed !== "object") state.coachNoteDismissed = null;
  if (!Array.isArray(state.sessionNotes)) state.sessionNotes = [];
  if (!state.programStartedAt || typeof state.programStartedAt !== "object") state.programStartedAt = {};
  if (!state.milestonesSeen) state.milestonesSeen = { weightLbs: [], workoutDays: [] };
  if (!state.celebrations) state.celebrations = [];
  if (!state.flags) state.flags = [];
  if (state.todayFocus && typeof state.todayFocus !== "object") state.todayFocus = null; if (!Array.isArray(state.chestLogs)) state.chestLogs = [];
  if (state.chestMode !== "travel") state.chestMode = "home";
  if (typeof state.welcomeBackDismissedDate !== "string") state.welcomeBackDismissedDate = "";
  if (!state.settings.macroTargets) state.settings.macroTargets = { calories: 2300, protein: 160, carbs: 200, fat: 70 };
  // One-time: protein target moves to 145 g (Andy's pick). The flag keeps later edits in Settings from being overwritten.
  if (state.settings.proteinTargetSetTo145 !== true) { state.settings.macroTargets.protein = 145; state.settings.proteinTargetSetTo145 = true; }
  // One-time: the 20 g of protein dropped (about 80 cal) goes to carbs so total calories stay put.
  if (state.settings.carbsPlus20ForProtein145 !== true) { state.settings.macroTargets.carbs = (state.settings.macroTargets.carbs || 0) + 20; state.settings.carbsPlus20ForProtein145 = true; }
  // One-time: daily calorie target 2050 -> 2000 to match the 14,000 weekly budget (carbs absorb the 50 cal; protein stays 145).
  if (state.settings.calTarget2000 !== true) {
    if (state.settings.macroTargets.calories === 2050) { state.settings.macroTargets.calories = 2000; state.settings.macroTargets.carbs = Math.max(0, (state.settings.macroTargets.carbs || 0) - 10); }
    state.settings.calTarget2000 = true;
    if (typeof persistNow === "function") setTimeout(() => { try { persistNow(); } catch (e) {} }, 1500);
  }
  // One-time: protein target 145 -> 125 g (Andy's pick, Nov 9). The freed 80 cal move to carbs so the 2,000 cal target is unchanged.
  if (state.settings.proteinTargetSetTo125 !== true) {
    state.settings.macroTargets.protein = 125;
    state.settings.macroTargets.carbs = (state.settings.macroTargets.carbs || 0) + 20;
    state.settings.proteinTargetSetTo125 = true;
    if (typeof persistNow === "function") setTimeout(() => { try { persistNow(); } catch (e) {} }, 1500);
  }
  if (!(state.settings.weeklyWorkoutGoal > 0)) state.settings.weeklyWorkoutGoal = 3;
  if (typeof state.travelMode !== "boolean") state.travelMode = false;
  if (state.armTool !== "rings") state.armTool = "kb";
  if (typeof state.macroSuggestionAppliedAt !== "string") state.macroSuggestionAppliedAt = "";
  if (!Array.isArray(state.macroSuggestionHistory)) state.macroSuggestionHistory = [];
  if (!Array.isArray(state.dislikedExercises)) state.dislikedExercises = ["bear-crawl"]; // never generated; add more ids here to drop a move
  if (typeof state.dismissedExerciseLegend !== "boolean") state.dismissedExerciseLegend = false;
  if (typeof state.dismissedTravelModeLegend !== "boolean") state.dismissedTravelModeLegend = false;
  if (typeof state.dismissedSkillPracticeIntro !== "boolean") state.dismissedSkillPracticeIntro = false;
  if (typeof state.dismissedWaistExplainer !== "boolean") state.dismissedWaistExplainer = false;
  if (typeof state.dismissedWaistEmptyHint !== "boolean") state.dismissedWaistEmptyHint = false;
  if (!Array.isArray(state.lastWarmupCooldownNames)) state.lastWarmupCooldownNames = [];
  if (!state.maxStreaks || typeof state.maxStreaks !== "object") state.maxStreaks = {};
  // Skill ladders (handstand/L-sit/planche/back lever/front lever/muscle-up)
  // always start everyone at rung 1 regardless of general push/pull level —
  // skill readiness isn't the same thing as strength level, so it doesn't
  // inherit a head start from it.
  if (!state.skillLevels || typeof state.skillLevels !== "object") {
    state.skillLevels = { ...DEFAULT_SKILL_LEVELS };
  } else {
    state.skillLevels = { ...DEFAULT_SKILL_LEVELS, ...state.skillLevels };
  }
  if (!state.skillStreaks || typeof state.skillStreaks !== "object") state.skillStreaks = {};
  if (needPush) { markDirty(); saveStateLocal(); saveStateRemote(); }
}

// Unsynced-change tracking. Every local save stamps the state and marks it "dirty";
// the mark is cleared only when the server confirms that exact version. On the next
// open, a dirty phone copy is sent to the server instead of being overwritten by it.
const LS_DIRTY = "tf_dirty_at";
function markDirty() {
  state._savedAt = Date.now();
  try { localStorage.setItem(LS_DIRTY, String(state._savedAt)); } catch (e) {}
}
function isDirty() { try { return !!localStorage.getItem(LS_DIRTY); } catch (e) { return false; } }
function clearDirtyIf(sentAt) {
  try { if (localStorage.getItem(LS_DIRTY) === String(sentAt)) localStorage.removeItem(LS_DIRTY); } catch (e) {}
}
// ---- multi-device safety ----
// "Base" is the copy of the state this phone last agreed on with the server. Before every
// save we check whether another device has saved since; if so, both sets of changes are
// combined (three-way merge against the base) instead of the newer save wiping the other.
const LS_BASE = "tf_base_v1";
function setBase(obj) { try { localStorage.setItem(LS_BASE, typeof obj === "string" ? obj : JSON.stringify(obj)); } catch (e) {} }
function getBase() { try { const t = localStorage.getItem(LS_BASE); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function stable(v) {
  if (v === undefined) return "u";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  return "{" + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
}
const isObj = v => v && typeof v === "object" && !Array.isArray(v);
function merge3(b, l, r) {
  if (stable(l) === stable(r)) return l;
  if (b !== undefined && stable(l) === stable(b)) return r; // only the other device changed it
  if (b !== undefined && stable(r) === stable(b)) return l; // only this device changed it
  if (Array.isArray(l) && Array.isArray(r)) {
    // Treat as sets of records: keep the server's list, apply this device's removals and additions.
    const bs = new Set((Array.isArray(b) ? b : []).map(stable));
    const ls = new Set(l.map(stable)), rs = new Set(r.map(stable));
    const out = r.filter(x => !(bs.has(stable(x)) && !ls.has(stable(x))));
    for (const x of l) if (!bs.has(stable(x)) && !rs.has(stable(x))) out.push(x);
    if (out.length && out.every(x => x && typeof x === "object" && typeof x.date === "string")) out.sort((a, c) => String(a.date).localeCompare(String(c.date)));
    return out;
  }
  if (isObj(l) && isObj(r)) {
    const out = {}, bb = isObj(b) ? b : {};
    for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
      const m = merge3(bb[k], l[k], r[k]);
      if (m !== undefined) out[k] = m;
    }
    return out;
  }
  return l; // both changed the same single value: this device's latest edit wins
}
let putChain = Promise.resolve();
function putState() { const run = putChain.then(putStateNow); putChain = run.catch(() => {}); return run; }
async function putStateNow() {
  const base = getBase();
  if (base) {
    const remote = await apiFetch("/api/state", { method: "GET" });
    if (remote && Object.keys(remote).length && (remote._savedAt || 0) !== (base._savedAt || 0)) {
      state = merge3(base, state, remote);
      saveStateLocal(); // re-stamps and stores the combined copy
      try { if (typeof refreshViews === "function") refreshViews(); } catch (e) {}
    }
  }
  const sentAt = state._savedAt || 0;
  const body = JSON.stringify(state);
  await apiFetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
  setBase(body);
  clearDirtyIf(sentAt);
  setSync(true, "synced");
}
// Returning to the app with nothing unsynced: pick up whatever another device saved.
async function pullRemoteIfChanged() {
  if (!WORKER_URL || isDirty()) return;
  try {
    const remote = await apiFetch("/api/state", { method: "GET" });
    const base = getBase();
    if (!remote || !Object.keys(remote).length || isDirty()) return;
    if (base && (remote._savedAt || 0) === (base._savedAt || 0)) return;
    state = remote; setBase(remote);
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    try { if (typeof refreshViews === "function") refreshViews(); } catch (e) {}
    setSync(true, "synced");
  } catch (e) {}
}
function offlineLabel() { return isDirty() ? "offline: saved on this phone, will sync" : "offline: will retry"; }
// If another device saved a newer copy while this phone had unsynced changes, keep the
// server copy and add back anything this phone logged that the server doesn't have.
function mergeStates(local, remote) {
  const out = JSON.parse(JSON.stringify(remote));
  const keyOf = {
    foodLogs: x => [x.date, x.name, x.calories].join("|"),
    logs: x => [x.date, x.exercise, x.result].join("|"),
    cardioLogs: x => [x.date, x.type, x.distance].join("|"),
    measurements: x => x.date,
  };
  for (const k of Object.keys(keyOf)) {
    const have = new Set((out[k] || []).map(keyOf[k]));
    out[k] = out[k] || [];
    for (const item of (local[k] || [])) if (!have.has(keyOf[k](item))) out[k].push(item);
    if (k === "foodLogs" || k === "logs" || k === "cardioLogs") out[k].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }
  return out;
}

function saveStateLocal() {
  markDirty();
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function saveStateRemote() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!WORKER_URL) return;
    try {
      await putState();
    } catch (e) {
      setSync(false, offlineLabel());
    }
  }, 800);
}

function persist() {
  saveStateLocal();
  saveStateRemote();
}

// Bypasses the debounce entirely — for actions immediately followed by
// something that might trigger a quick refresh (like a swap), where losing
// the 800ms window could mean the change never reaches D1 before reload
// silently overwrites local state with an older remote copy.
async function persistNow() {
  saveStateLocal();
  try { if (typeof renderMorningChecklist === "function") renderMorningChecklist(); } catch (e) {}
  try { if (typeof renderProgressTop === "function") renderProgressTop(); } catch (e) {}
  try { if (typeof renderWeekRibbon === "function") renderWeekRibbon(); } catch (e) {}
  try { if (typeof renderProgramView === "function") renderProgramView(); } catch (e) {}
  try { applyFeedbackSetting(); } catch (e) {}
  clearTimeout(saveTimer);
  if (!WORKER_URL) return;
  try {
    await putState();
  } catch (e) {
    setSync(false, offlineLabel());
  }
}
// Retry unsynced changes when the connection comes back, the app returns to the
// foreground, and on a slow timer while anything is waiting.
window.addEventListener("online", () => { if (isDirty()) saveStateRemote(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) return; if (isDirty()) saveStateRemote(); else pullRemoteIfChanged(); });
setInterval(() => { if (isDirty() && !document.hidden) saveStateRemote(); }, 60000);
