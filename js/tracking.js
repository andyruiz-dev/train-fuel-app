// ---- progress charts ----
function renderLineChart(containerId, points, { yLabel = "", avg = null } = {}) {
  const el = document.getElementById(containerId);
  if (!points.length) { el.innerHTML = '<div class="empty">Not enough data yet.</div>'; return; }
  const w = 300, h = 140, pad = 24;
  const values = points.map(p => p.value);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((p.value - min) / range) * (h - pad * 2);
    return { x, y, label: p.label, value: p.value };
  });
  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  // Optional rolling-average overlay: dashed line through the non-null
  // points of `avg` (aligned by index with `points`). Means always sit inside
  // the min/max of the raw values, so the same y-scale holds.
  let avgSvg = "";
  if (avg && avg.filter(v => v != null).length >= 2) {
    let started = false;
    const avgD = avg.map((v, i) => {
      if (v == null) return "";
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      const cmd = started ? "L" : "M";
      started = true;
      return `${cmd}${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(Boolean).join(" ");
    avgSvg = `<path d="${avgD}" fill="none" style="stroke:var(--gold);" stroke-width="2" stroke-dasharray="5 4"/>
      <text x="${w - pad}" y="14" font-size="11" style="fill:var(--gold);" text-anchor="end">- - 7-day avg</text>`;
  }
  const dots = coords.map(c => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" fill="var(--accent)"/>`).join("");
  const firstLabel = coords[0]?.label || "";
  const lastLabel = coords[coords.length - 1]?.label || "";
  el.innerHTML = `
    <svg width="100%" viewBox="0 0 ${w} ${h + 20}" style="overflow:visible;">
      <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2"/>
      ${avgSvg}
      ${dots}
      <text x="${pad}" y="${h + 16}" font-size="11" fill="var(--text-faint)">${firstLabel}</text>
      <text x="${w - pad}" y="${h + 16}" font-size="11" fill="var(--text-faint)" text-anchor="end">${lastLabel}</text>
      <text x="${pad}" y="14" font-size="11" fill="var(--text-faint)">${max.toFixed(0)}${yLabel}</text>
      <text x="${pad}" y="${h - pad + 4}" font-size="11" fill="var(--text-faint)">${min.toFixed(0)}${yLabel}</text>
    </svg>`;
}

function renderBarChart(containerId, bars) {
  const el = document.getElementById(containerId);
  if (!bars.length) { el.innerHTML = '<div class="empty">Not enough data yet.</div>'; return; }
  const w = 300, h = 140, pad = 24;
  const max = Math.max(...bars.map(b => b.value), 1);
  const barW = (w - pad * 2) / bars.length - 6;
  const barsSvg = bars.map((b, i) => {
    const x = pad + i * ((w - pad * 2) / bars.length);
    const barH = (b.value / max) * (h - pad * 2 - 10);
    const y = h - pad - barH;
    return `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="12" fill="var(--text)" text-anchor="middle" font-family="monospace">${b.value}</text>
            <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="var(--accent)" rx="2"/>
            <text x="${(x + barW / 2).toFixed(1)}" y="${h + 4}" font-size="10" fill="var(--text-faint)" text-anchor="middle">${b.label}</text>`;
  }).join("");
  el.innerHTML = `<svg width="100%" viewBox="0 0 ${w} ${h + 16}" style="overflow:visible;">${barsSvg}</svg>`;
}

function isoWeekLabel(date) {
  const d = new Date(date);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `W${week}`;
}

// ---- cross-training (walks/rucks, independent of the workout rotation) ----
let cardioType = null;

function openCardioForm(type) {
  cardioType = type;
  document.getElementById("cardioForm").classList.remove("hidden");
  document.getElementById("cardioWeight").style.display = type === "ruck" ? "block" : "none";
  const form = document.getElementById("cardioForm");
  document.getElementById("cardioDistance").focus({ preventScroll: true });
  // The form sits at the bottom of Today; bring it clear of the tab bar and keyboard.
  setTimeout(() => form.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
}

document.getElementById("logWalkChip").addEventListener("click", () => openCardioForm("walk"));
document.getElementById("logRuckChip").addEventListener("click", () => openCardioForm("ruck"));

document.getElementById("saveCardioBtn").addEventListener("click", async () => {
  const distance = parseFloat(document.getElementById("cardioDistance").value) || null;
  const duration = parseInt(document.getElementById("cardioDuration").value, 10) || null;
  const weight = cardioType === "ruck" ? (parseInt(document.getElementById("cardioWeight").value, 10) || null) : null;
  if (!distance && !duration) { alert("Enter at least a distance or duration."); return; }
  state.cardioLogs.push({ date: new Date().toISOString(), type: cardioType, distance, duration, weight });
  await persistNow();
  document.getElementById("cardioForm").classList.add("hidden");
  document.getElementById("cardioDistance").value = "";
  document.getElementById("cardioDuration").value = "";
  document.getElementById("cardioWeight").value = "";
  renderRecentCardio();
  renderProgressCharts();
  showToast(`${cardioType === "ruck" ? "Ruck" : "Walk"} saved${distance ? ` · ${distance} mi` : ""}${duration ? ` · ${duration} min` : ""}`);
});

function renderRecentCardio() {
  const el = document.getElementById("recentCardio");
  const all = state.cardioLogs || [];
  const recent = all.slice(-5).reverse();
  if (!recent.length) { el.innerHTML = ""; return; }
  el.innerHTML = recent.map((c, i) => `
    <div class="meta" style="padding:4px 0; display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <span>${new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·
      ${c.type === "ruck" ? "Ruck" : "Walk"}${c.distance ? ` · ${c.distance}mi` : ""}${c.duration ? ` · ${c.duration}min` : ""}${c.weight ? ` · ${c.weight}lb` : ""}</span>
      <button type="button" class="danger-link" style="padding:8px 4px; min-width:56px; text-align:right;" data-cardio-del="${all.length - 1 - i}" aria-label="Delete this entry">Delete</button>
    </div>
  `).join("");
}
document.getElementById("recentCardio").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-cardio-del]");
  if (!btn) return;
  const idx = parseInt(btn.dataset.cardioDel, 10);
  const entry = (state.cardioLogs || [])[idx];
  if (!entry) return;
  state.cardioLogs.splice(idx, 1);
  renderRecentCardio();
  try { renderProgressCharts(); } catch (err) {}
  await persistNow();
  showToast("Entry deleted.", async () => {
    state.cardioLogs.splice(Math.min(idx, state.cardioLogs.length), 0, entry);
    renderRecentCardio();
    try { renderProgressCharts(); } catch (err) {}
    await persistNow();
  });
});

// ---- quick-add protein staples ----
const QUICK_PROTEIN_FOODS = [
  { name: "Greek yogurt (1 cup)", calories: 150, protein: 20, carbs: 8, fat: 4 },
  { name: "Cottage cheese (1 cup)", calories: 180, protein: 25, carbs: 8, fat: 5 },
  { name: "Protein bar", calories: 200, protein: 20, carbs: 22, fat: 7 },
  { name: "2 hard-boiled eggs", calories: 140, protein: 12, carbs: 1, fat: 10 },
  { name: "Whey protein shake", calories: 120, protein: 25, carbs: 3, fat: 2 },
  { name: "Chicken breast (4oz)", calories: 165, protein: 35, carbs: 0, fat: 4 },
];

let resolvedQuickProteinFoods = QUICK_PROTEIN_FOODS;

function findRecentLoggedFood(keywords) {
  const logs = (state.foodLogs || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const match = logs.find(f => keywords.some(k => (f.name || "").toLowerCase().includes(k)));
  return match ? { name: match.name, calories: match.calories, protein: match.protein, carbs: match.carbs, fat: match.fat } : null;
}

function renderQuickProteinChips() {
  const el = document.getElementById("quickProteinChips");
  const barMatch = findRecentLoggedFood(["protein bar"]);
  const shakeMatch = findRecentLoggedFood(["protein shake", "whey", "protein powder"]);
  resolvedQuickProteinFoods = QUICK_PROTEIN_FOODS.map(f => {
    if (f.name === "Protein bar" && barMatch) return barMatch;
    if (f.name === "Whey protein shake" && shakeMatch) return shakeMatch;
    return f;
  });
  el.innerHTML = resolvedQuickProteinFoods.map((f, i) =>
    `<div class="chip" data-quick-protein="${i}">${f.name} · ${f.protein}g</div>`
  ).join("");
}

document.getElementById("quickProteinChips").addEventListener("click", async (e) => {
  const chip = e.target.closest("[data-quick-protein]");
  if (!chip) return;
  const food = resolvedQuickProteinFoods[parseInt(chip.dataset.quickProtein, 10)];
  await addFoodEntry({ ...food, source: "quick" });
});


// ---- quick-add drinks ----
// Typical per-serving values, deliberately round (IPAs run higher: roughly 6-7% ABV is about 190-210 cal per 12 oz). Tagged alcohol:true so the
// log can tell drinks apart later; they count toward calories like anything else.
const QUICK_DRINKS = [
  { name: "IPA pint (16 oz)", calories: 270, protein: 2, carbs: 20, fat: 0 },
  { name: "IPA (12 oz)", calories: 200, protein: 1, carbs: 15, fat: 0 },
  { name: "Lager (12 oz)", calories: 150, protein: 1, carbs: 13, fat: 0 },
  { name: "Wine (5 oz)", calories: 125, protein: 0, carbs: 4, fat: 0 },
  { name: "Liquor (1.5 oz)", calories: 100, protein: 0, carbs: 0, fat: 0 },
  { name: "Cocktail", calories: 200, protein: 0, carbs: 15, fat: 0 },
];
function renderQuickDrinkChips() {
  const el = document.getElementById("quickDrinkChips");
  if (!el) return;
  el.innerHTML = QUICK_DRINKS.map((f, i) => `<div class="chip" data-quick-drink="${i}">${f.name} · ${f.calories}</div>`).join("");
}
document.getElementById("quickDrinkChips").addEventListener("click", async (e) => {
  const chip = e.target.closest("[data-quick-drink]");
  if (!chip) return;
  await addFoodEntry({ ...QUICK_DRINKS[parseInt(chip.dataset.quickDrink, 10)], source: "quick", alcohol: true });
});

// toISOString() returns the UTC date, but todaysFoodLogs/foodLogsForDate filter
// using toDateString() (local time) — in US timezones during evening hours,
// the UTC date is already "tomorrow", so defaulting date inputs to the UTC
// date caused today's entries to appear missing. Always use local date instead.
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todaysFoodLogs() {
  const todayStr = new Date().toDateString();
  return (state.foodLogs || []).filter(f => new Date(f.date).toDateString() === todayStr);
}

function foodLogsForDate(dateStr) {
  const targetStr = new Date(dateStr + "T00:00:00").toDateString();
  return (state.foodLogs || []).filter(f => new Date(f.date).toDateString() === targetStr);
}

// Computed fresh at render time (not a stored flag) so it's correct
// regardless of when the current pendingWorkout object was created —
// a pendingWorkout persisted before this check existed, or one that's sat
// around since yesterday, still gets the right answer today.
function hasLoggedWorkoutToday() {
  const today = localDateStr();
  return (state.logs || []).some(l => localDateStr(new Date(l.date)) === today);
}

// ---- weekly intake average + "not fully tracked" days ----
// The scale responds to what you eat over weeks, not on any single day, so the
// number worth watching is the 7-day average, not a daily pass/fail. Averages
// use the last 7 COMPLETED days (today is still in progress), skip days with
// nothing logged, and skip any day you've marked as not fully tracked, so a
// travel or partial-log day can't drag the average down.
function dayKeyOf(date) { return localDateStr(date instanceof Date ? date : new Date(date)); }
function isDayMarkedPartial(dateStr) { return !!(state.foodDayFlags && state.foodDayFlags[dateStr]); }
function computeWeeklyIntake(now = new Date()) {
  const byDay = {};
  (state.foodLogs || []).forEach(f => {
    const k = dayKeyOf(f.date);
    byDay[k] = (byDay[k] || 0) + (f.calories || 0);
  });
  const counted = [];
  let partial = 0, untracked = 0;
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const k = dayKeyOf(d);
    if (isDayMarkedPartial(k)) { partial++; continue; }
    if (byDay[k] === undefined) { untracked++; continue; }
    counted.push(byDay[k]);
  }
  const avg = counted.length ? Math.round(counted.reduce((a, b) => a + b, 0) / counted.length) : null;
  return { avg, counted: counted.length, partial, untracked };
}
// Weekly calorie budget (Mon-Sun). Skipped days are NOT left out: they show as "not logged" so they can't hide.
const DEFAULT_WEEK_BUDGET = 14000;
function renderWeekBudget() {
  const el = document.getElementById("weekBudget");
  if (!el) return;
  const budget = state.settings.weeklyCalBudget || DEFAULT_WEEK_BUDGET;
  const now = new Date();
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  let eaten = 0, notLogged = 0, daysLeft = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const ds = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const logs = foodLogsForDate(ds);
    const cal = logs.reduce((n, f) => n + (f.calories || 0), 0);
    eaten += cal;
    const isToday = ds === localDateStr();
    if (d > now && !isToday) daysLeft++;
    else if (!isToday && (logs.length === 0 || isDayMarkedPartial(ds))) notLogged++;
  }
  const left = budget - eaten;
  const frac = Math.min(1, eaten / budget);
  const daysLeftInclToday = daysLeft + 1;
  const big = left >= 0
    ? `<span style="font-family:var(--font-mono); font-size:30px; font-weight:600; color:var(--accent);">${left.toLocaleString()}</span> <span class="meta">cal left this week</span>`
    : `<span style="font-family:var(--font-mono); font-size:30px; font-weight:600; color:var(--text-muted);">${Math.abs(left).toLocaleString()}</span> <span class="meta">cal over this week's budget</span>`;
  const perDay = left > 0 && daysLeftInclToday > 1 ? ` · about ${Math.round(left / daysLeftInclToday).toLocaleString()} a day for the ${daysLeftInclToday} day${daysLeftInclToday === 1 ? "" : "s"} left` : "";
  el.innerHTML = `<div class="field-label" style="text-transform:uppercase; letter-spacing:0.6px; display:flex; justify-content:space-between;"><span>This week (Mon to Sun)</span><button class="danger-link" id="editWeekBudget" style="color:var(--accent);">Budget ${budget.toLocaleString()}</button></div>
    <div class="mt6">${big}</div>
    <div style="height:8px; border-radius:4px; background:var(--border, var(--surface-neutral)); margin:8px 0; overflow:hidden;"><div style="height:100%; width:${Math.round(frac * 100)}%; background:var(--accent);"></div></div>
    <div class="meta">${eaten.toLocaleString()} logged${perDay}.${notLogged ? ` ${notLogged} day${notLogged === 1 ? "" : "s"} this week with nothing logged. A rough total counts.` : ""}</div>`;
}
document.addEventListener("click", async (e) => {
  if (!e.target.closest("#editWeekBudget")) return;
  const cur = state.settings.weeklyCalBudget || DEFAULT_WEEK_BUDGET;
  const v = parseInt(prompt("Weekly calorie budget (7 days)", String(cur)), 10);
  if (!v || v < 7000 || v > 25000) return;
  state.settings.weeklyCalBudget = v;
  await persistNow();
  renderWeekBudget();
});
function renderWeeklyIntake() {
  const el = document.getElementById("weeklyIntake");
  if (!el) return;
  const t = (state.settings.macroTargets || {}).calories;
  const w = computeWeeklyIntake();
  const notCounted = w.partial + w.untracked;
  let html = `<div class="field-label" style="text-transform:uppercase; letter-spacing:0.6px;">7-day average</div>`;
  if (w.counted < 3) {
    html += `<div class="meta mt6">Needs at least 3 tracked days out of the last 7 to show an average (${w.counted} so far). Days you skip or mark as not fully tracked are left out, so nothing here counts against you.</div>`;
  } else {
    html += macroBar("Calories per day", w.avg, t);
    const diff = t ? w.avg - t : null;
    html += `<div class="meta mt6">${diff === null ? "" : (Math.abs(diff) <= 75 ? "About on target. " : diff > 0 ? `${diff} cal/day above target. ` : `${Math.abs(diff)} cal/day below target. `)}Based on ${w.counted} of the last 7 days${notCounted ? ` (${notCounted} left out: not tracked or marked partial)` : ""}.</div>`;
  }
  el.innerHTML = html;
}
async function toggleDayPartial(dateStr) {
  state.foodDayFlags = state.foodDayFlags || {};
  if (state.foodDayFlags[dateStr]) delete state.foodDayFlags[dateStr];
  else state.foodDayFlags[dateStr] = "partial";
  await persistNow();
  renderMacroSummary();
  renderFoodLogList();
}
function renderPartialControls() {
  const todayStr = localDateStr();
  const btn = document.getElementById("markTodayPartialBtn");
  if (btn) btn.textContent = isDayMarkedPartial(todayStr) ? "Today is marked as not fully tracked. Undo" : "Mark today as not fully tracked";
  const row = document.getElementById("foodLogPartialRow");
  const dateInput = document.getElementById("foodLogDate");
  if (row && dateInput) {
    const d = dateInput.value || todayStr;
    const marked = isDayMarkedPartial(d);
    const closed = d === todayStr && state.foodDayClosed && state.foodDayClosed[todayStr];
    const canEnd = d === todayStr && !closed && todaysFoodLogs().length;
    row.innerHTML = `${marked ? '<span style="font-size:11px; color:var(--text-muted); margin-right:8px;">Not fully tracked</span>' : ""}<button type="button" class="danger-link" data-partial-more aria-label="Day options" style="color:var(--text-muted); font-size:18px; letter-spacing:2px; line-height:1; padding:0 4px; height:20px;">⋯</button>
      <div class="hidden" data-day-menu style="position:absolute; right:0; top:26px; z-index:20; min-width:220px; background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:6px; box-shadow:0 6px 20px rgba(0,0,0,.4); text-align:left;">
        <button class="danger-link" data-toggle-partial="${d}" style="display:block; width:100%; text-align:left; padding:10px; color:var(--text);">${marked ? "Undo: not fully tracked" : "Mark day as not fully tracked"}</button>
        ${canEnd ? '<button class="danger-link" data-food-end style="display:block; width:100%; text-align:left; padding:10px; color:var(--text);">End tracking for today</button>' : ""}
      </div>`;
  }
}
document.addEventListener("click", (e) => {
  const more = e.target.closest("[data-partial-more]");
  if (more) { more.parentElement.querySelector("[data-day-menu]").classList.toggle("hidden"); return; }
  if (!e.target.closest("[data-day-menu]")) document.querySelectorAll("[data-day-menu]").forEach(m => m.classList.add("hidden"));
  const t = e.target.closest("[data-toggle-partial]");
  if (t) toggleDayPartial(t.dataset.togglePartial);
});
document.getElementById("markTodayPartialBtn").addEventListener("click", () => toggleDayPartial(localDateStr()));

// ---- "right now" status: last meal, gentle nudge, end-of-day ----
const BANANA = { name: "Banana", calories: 105, protein: 1, carbs: 27, fat: 0 };
const APPLE = { name: "Apple", calories: 95, protein: 0, carbs: 25, fat: 0 };
// Quick pairings: a protein staple (resolved from QUICK_PROTEIN_FOODS so it
// picks up the person's own logged versions) plus a piece of fruit.
const SNACK_COMBOS = [
  { protein: "Whey protein shake", extra: BANANA },
  { protein: "Greek yogurt (1 cup)", extra: BANANA },
  { protein: "Cottage cheese (1 cup)", extra: BANANA },
  { protein: "Protein bar", extra: APPLE },
  { protein: "2 hard-boiled eggs", extra: BANANA },
];
function timeLabel(d) { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function gapLabel(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
function lastFoodEntry() {
  const logs = (state.foodLogs || []).filter(f => f.date);
  if (!logs.length) return null;
  return logs.reduce((a, b) => (new Date(b.date) > new Date(a.date) ? b : a));
}
function comboItems(c) {
  const base = (typeof resolvedQuickProteinFoods !== "undefined" ? resolvedQuickProteinFoods : QUICK_PROTEIN_FOODS).find(f => f.name === c.protein)
    || QUICK_PROTEIN_FOODS.find(f => f.name === c.protein);
  return base ? [base, c.extra] : null;
}
// Pure so it can be tested: given the clock and logs, what (if anything) to nudge.
function foodNudge(now = new Date()) {
  const todayStr = localDateStr(now);
  if (state.foodDayClosed && state.foodDayClosed[todayStr]) return null;
  if (isDayMarkedPartial(todayStr)) return null;
  const last = lastFoodEntry();
  if (!last) return null;
  const hour = now.getHours();
  if (hour < 7 || hour >= 21) return null;
  const gapMs = now - new Date(last.date);
  const ateToday = localDateStr(new Date(last.date)) === todayStr;
  if (!ateToday && hour < 10) return null; // breakfast not expected yet
  if (gapMs < 5 * 3600000) return null;
  const t = state.settings.macroTargets || {};
  const totals = todaysFoodLogs().reduce((n, f) => n + (f.calories || 0), 0);
  const calLeft = (t.calories || 0) - totals;
  if (t.calories && calLeft < 150) return null; // already at or near target
  const options = SNACK_COMBOS.map(c => ({ c, items: comboItems(c) })).filter(o => o.items)
    .map(o => ({ ...o, cal: o.items.reduce((n, i) => n + i.calories, 0), pro: o.items.reduce((n, i) => n + i.protein, 0) }))
    .filter(o => !t.calories || o.cal <= calLeft)
    .sort((a, b) => b.pro - a.pro).slice(0, 2);
  if (!options.length) return null;
  return { gapMs, last, ateToday, options };
}
function renderFoodNow() {
  const el = document.getElementById("foodNow");
  if (!el) return;
  const now = new Date();
  const todayStr = localDateStr(now);
  const closedAt = state.foodDayClosed && state.foodDayClosed[todayStr];
  const todays = todaysFoodLogs();
  const last = lastFoodEntry();
  let html = "";
  if (closedAt) {
    const cal = todays.reduce((n, f) => n + (f.calories || 0), 0);
    const pro = todays.reduce((n, f) => n + (f.protein || 0), 0);
    html = `<div class="meta" style="color:var(--text);"><strong>Tracking ended for today</strong> at ${timeLabel(new Date(closedAt))}. ${cal} cal · ${pro} g protein logged. Nothing more to log.</div>
      <button class="danger-link" data-food-reopen style="color:var(--accent); margin-top:6px;">Reopen today</button>`;
  } else {
  }
  el.innerHTML = html;
}
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-food-end]")) {
    document.querySelectorAll("[data-day-menu]").forEach(m => m.classList.add("hidden"));
    state.foodDayClosed = state.foodDayClosed || {};
    state.foodDayClosed[localDateStr()] = new Date().toISOString();
    await persistNow();
    renderFoodNow(); renderPartialControls();
    showToast("Tracking ended for today. Nothing more to log.", async () => {
      delete state.foodDayClosed[localDateStr()];
      await persistNow();
      renderFoodNow(); renderPartialControls();
    });
    return;
  }
  if (e.target.closest("[data-food-reopen]")) {
    delete state.foodDayClosed[localDateStr()];
    await persistNow();
    renderFoodNow();
    return;
  }
  const combo = e.target.closest("[data-food-combo]");
  if (combo) {
    const n = foodNudge();
    const o = n && n.options[parseInt(combo.dataset.foodCombo, 10)];
    if (!o) return;
    await addFoodEntries(o.items.map(i => ({ ...i, source: "quick" })), o.items.map(i => i.name).join(" + "));
  }
});
setInterval(renderFoodNow, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) renderFoodNow(); });

function macroBar(label, value, target) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return `
    <div class="mt8">
      <div class="meta" style="display:flex; justify-content:space-between;">
        <span>${label}</span><span>${value} / ${target || "?"}</span>
      </div>
      <div style="background:var(--surface-2); border-radius:2px; height:6px; margin-top:4px; overflow:hidden;">
        <div style="background:var(--accent); height:100%; width:${pct}%;"></div>
      </div>
    </div>`;
}

function renderMacroSummary() {
  const el = document.getElementById("macroSummary");
  const proteinEl = document.getElementById("proteinRemaining");
  const today = todaysFoodLogs();
  const totals = today.reduce((acc, f) => ({
    calories: acc.calories + (f.calories || 0),
    protein: acc.protein + (f.protein || 0),
    carbs: acc.carbs + (f.carbs || 0),
    fat: acc.fat + (f.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const t = state.settings.macroTargets || {};

  const proteinLeft = Math.max(0, (t.protein || 0) - totals.protein);
  if (proteinEl) {
    proteinEl.innerHTML = proteinLeft > 0
      ? `<div style="font-family:var(--font-mono); font-size:32px; font-weight:600; color:var(--accent);">${proteinLeft}g</div><div class="meta">protein left today</div>`
      : `<div style="font-family:var(--font-mono); font-size:32px; font-weight:600; color:var(--accent);">✓</div><div class="meta">protein target hit today</div>`;
  }

  el.innerHTML =
    macroBar("Calories", totals.calories, t.calories) +
    macroBar("Protein (g)", totals.protein, t.protein) +
    macroBar("Carbs (g)", totals.carbs, t.carbs) +
    macroBar("Fat (g)", totals.fat, t.fat);
  renderFoodHero(totals, t, today.length);
  renderRecentFoods();
  renderFoodHistory();
  renderWeeklyIntake();
  renderWeekBudget();
  try { renderWeekClose(); } catch (e) {}
  renderPartialControls();
  renderFoodNow();
}

// Protein is the headline; calories stay small and neutral (no red, no "over" wording).
let todayOpen = false;
function weekBudgetNumbers() {
  const budget = state.settings.weeklyCalBudget || DEFAULT_WEEK_BUDGET;
  const now = new Date(), mon = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  let eaten = 0;
  for (let i = 0; i < 7; i++) { const d = new Date(mon); d.setDate(mon.getDate() + i); eaten += foodLogsForDate(localDateStr(d)).reduce((n, f) => n + (f.calories || 0), 0); }
  return { budget, eaten, left: budget - eaten };
}
function foodRing(frac, centerTop, centerSub, color) {
  const C = 2 * Math.PI * 34;
  return `<svg class="fh-ring" width="80" height="80" viewBox="0 0 84 84" role="img"><circle cx="42" cy="42" r="34" fill="none" stroke="var(--track)" stroke-width="9"/><circle cx="42" cy="42" r="34" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - Math.max(0, Math.min(1, frac)))).toFixed(1)}" transform="rotate(-90 42 42)"/>${centerTop === "✓" ? `<path d="M30 43l9 9 16-18" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>` : `<text x="42" y="44" text-anchor="middle" font-family="Big Shoulders Display, sans-serif" font-size="${String(centerTop).length > 5 ? 17 : 21}" font-weight="600" fill="var(--text)">${centerTop}</text>`}<text x="42" y="58" text-anchor="middle" font-family="Manrope, sans-serif" font-size="8" fill="var(--text-muted)" letter-spacing="1">${centerSub}</text></svg>`;
}
function renderFoodHero(totals, t, entryCount) {
  const kick = document.getElementById("tfFoodKicker");
  if (kick) {
    const d = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    kick.textContent = d + " · " + entryCount + (entryCount === 1 ? " entry" : " entries");
  }
  const el = document.getElementById("foodHero");
  if (!el) return;
  const pT = t.protein || 0, cT = t.calories || 0;
  const pLeft = Math.max(0, pT - totals.protein);
  const pRing = foodRing(pT ? totals.protein / pT : 0, pT && pLeft === 0 ? "✓" : (pT ? pLeft + "g" : totals.protein + "g"), pT ? "LEFT" : "TODAY", "var(--accent)");
  const cLeft = cT - totals.calories;
  const cRing = foodRing(cT ? totals.calories / cT : 0, cT ? Math.abs(cLeft).toLocaleString() : totals.calories.toLocaleString(), cT ? (cLeft >= 0 ? "LEFT" : "OVER") : "TODAY", cLeft < 0 ? "var(--warn)" : "var(--accent)");
  const wk = weekBudgetNumbers();
  const wkPct = wk.budget ? Math.min(100, Math.round(wk.eaten / wk.budget * 100)) : 0;
  const side = (k, cur, goal, unit) => `<div class="fh-t"><span class="fh-k">${k}</span><b class="fh-v"><em>${cur}</em>${goal ? `<i>/ ${goal}${unit}</i>` : `<i>${unit}</i>`}</b></div>`;
  const wkTxt = wk.left >= 0 ? `<em>${wk.left.toLocaleString()}</em> left` : `<em class="over">${Math.abs(wk.left).toLocaleString()}</em> over`;
  el.innerHTML = `<div class="fh-row">
      <div class="fh-half">${pRing}${side("Protein", totals.protein, pT, " g")}</div>
      <div class="fh-half">${cRing}${side("Calories", totals.calories.toLocaleString(), cT ? cT.toLocaleString() : 0, "")}</div>
    </div>
    <div class="fh-week" data-today-toggle role="button" tabindex="0" aria-label="This week of ${wk.budget.toLocaleString()} calories"><span class="fh-k">Week</span><div class="fh-bar"><i style="width:${wkPct}%; ${wk.left < 0 ? "background:var(--warn);" : ""}"></i></div><span class="fh-wn">${wkTxt} <span class="tf-chev">${todayOpen ? "▴" : "▾"}</span></span></div>`;
  const det = document.getElementById("todayDetails");
  if (det) det.classList.toggle("hidden", !todayOpen);
  const tm = document.getElementById("todayMacros");
  if (tm) tm.innerHTML = macroBar("Carbs (g)", totals.carbs, t.carbs) + macroBar("Fat (g)", totals.fat, t.fat);
}
document.getElementById("todayCard").addEventListener("click", (e) => {
  if (!e.target.closest("[data-today-toggle]")) return;
  todayOpen = !todayOpen;
  document.getElementById("todayDetails").classList.toggle("hidden", !todayOpen);
  const ch = document.querySelector("#foodHero .tf-chev"); if (ch) ch.textContent = todayOpen ? "▴" : "▾";
});

// Foods you log often, re-addable in one tap.
// Hidden foods are stored by lowercase name; "(×2)" servings suffixes count as the same food.
function isFoodHidden(k) { const h = state.hiddenRecentFoods || []; return h.includes(k) || h.includes(k.replace(/\s*\(×[\d.]+\)\s*$/, "")); }
let recentFoodList = [];
let recentFoodsOpen = false;
function renderRecentFoods() {
  const wrap = document.getElementById("recentWrap"), el = document.getElementById("recentFoods");
  if (!wrap || !el) return;
  const cutoff = Date.now() - 60 * 86400000;
  const map = {};
  // Skip anything already in the log for the day being viewed; those rows have their own "+1 serving".
  const dateInput = document.getElementById("foodLogDate");
  const viewDate = (dateInput && dateInput.value) || localDateStr();
  const loggedNow = new Set(foodLogsForDate(viewDate).map(f => String(f.name || "").trim().toLowerCase()));
  (state.foodLogs || []).forEach(f => {
    if (!f.name || new Date(f.date).getTime() < cutoff) return;
    const k = f.name.trim().toLowerCase();
    if (isFoodHidden(k) || loggedNow.has(k)) return;
    const m = map[k] || (map[k] = { count: 0, last: f });
    m.count++;
    if (new Date(f.date) > new Date(m.last.date)) m.last = f;
  });
  recentFoodList = Object.values(map)
    .sort((a, b) => b.count - a.count || new Date(b.last.date) - new Date(a.last.date))
    .slice(0, 12).map(m => m.last)
    .sort((a, b) => (a.alcohol ? 1 : 0) - (b.alcohol ? 1 : 0)).slice(0, 6);
  wrap.classList.toggle("hidden", !recentFoodList.length && !(state.foodLogs || []).length);
  const shownRecent = recentFoodList.length;
  el.innerHTML = recentFoodList.slice(0, shownRecent).map((f, i) => `<div class="chip" data-recent-food="${i}"><span class="rn">${escapeHtml(f.name)}</span>${f.calories ? `<span class="rp">${f.calories}</span>` : ""}</div>`).join("") + '<div class="chip tf-all" data-my-foods-open role="button" tabindex="0">All ›</div>';
}
document.getElementById("recentFoods").addEventListener("click", async (e) => {
  if (e.target.closest("[data-recent-more]")) { recentFoodsOpen = !recentFoodsOpen; renderRecentFoods(); return; }
  if (e.target.closest("[data-my-foods-open]")) { toggleMyFoods(); return; }
  const hide = e.target.closest("[data-recent-hide]");
  if (hide) {
    e.stopPropagation();
    const hf = recentFoodList[parseInt(hide.dataset.recentHide, 10)];
    if (!hf) return;
    const key = hf.name.trim().toLowerCase();
    state.hiddenRecentFoods = (state.hiddenRecentFoods || []).concat(key);
    renderRecentFoods();
    await persistNow();
    showToast("Hidden from recent foods.", async () => {
      state.hiddenRecentFoods = state.hiddenRecentFoods.filter(k => k !== key);
      renderRecentFoods(); await persistNow();
    });
    return;
  }
  const chip = e.target.closest("[data-recent-food]");
  if (!chip) return;
  const f = recentFoodList[parseInt(chip.dataset.recentFood, 10)];
  if (!f) return;
  const { name, calories, protein, carbs, fat, alcohol } = f;
  await addFoodEntry({ name, calories: calories || 0, protein: protein || 0, carbs: carbs || 0, fat: fat || 0, ...(alcohol ? { alcohol: true } : {}), source: "recent" });
});

// My foods: everything you have logged before, most-used first. One tap logs it again with the
// exact same numbers, so repeat foods never need another scan (and never vary).
let myFoodsList = [];
function renderMyFoods() {
  const el = document.getElementById("myFoodsList");
  if (!el) return;
  const q = (document.getElementById("myFoodsSearch").value || "").trim().toLowerCase();
  const map = {};
  (state.foodLogs || []).forEach(f => {
    if (!f.name || !(f.calories || f.protein)) return;
    const k = f.name.trim().toLowerCase().replace(/\s*\(×[\d.]+\)\s*$/, "");
    if (isFoodHidden(k)) return;
    const m = map[k] || (map[k] = { count: 0, last: f });
    m.count++;
    if (new Date(f.date) > new Date(m.last.date)) m.last = f;
  });
  myFoodsList = Object.values(map)
    .filter(m => !q || m.last.name.toLowerCase().includes(q))
    .sort((a, b) => b.count - a.count || new Date(b.last.date) - new Date(a.last.date))
    .slice(0, 40).map(m => {
      // Show one unit: an entry saved as "Egg (×2)" is listed as "Egg" with half the numbers.
      const f = m.last, prev = parseFloat((f.name.match(/\(×([\d.]+)\)\s*$/) || [])[1]) || 1;
      return { ...f, name: f.name.replace(/\s*\(×[\d.]+\)\s*$/, ""), calories: Math.round((f.calories || 0) / prev), protein: Math.round((f.protein || 0) / prev), carbs: Math.round((f.carbs || 0) / prev), fat: Math.round((f.fat || 0) / prev), _count: m.count };
    });
  el.innerHTML = myFoodsList.length ? myFoodsList.map((f, i) => `
    <div class="tf-hist-row" style="gap:8px; align-items:center;">
      <div style="min-width:0; flex:1;"><div class="d" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(f.name)}</div><div class="s">${f.calories || 0} cal · ${f.protein || 0} g protein · logged ${f._count}×</div></div>
      <button class="danger-link" style="color:var(--accent);" data-my-add="${i}" data-mult="1">+1</button>
      <button class="danger-link" style="color:var(--accent);" data-my-add="${i}" data-mult="2">×2</button>
      <button class="danger-link tf-my-hide" data-my-hide="${i}" aria-label="Hide ${escapeHtml(f.name)} from my foods">Hide</button>
    </div>`).join("") : '<div class="empty">No matches.</div>';
}
function toggleMyFoods(force) {
  const p = document.getElementById("myFoodsPanel");
  const show = typeof force === "boolean" ? force : p.classList.contains("hidden");
  p.classList.toggle("hidden", !show);
  if (show) renderMyFoods();
}
document.getElementById("myFoodsOpen").addEventListener("click", () => toggleMyFoods());
document.getElementById("myFoodsSearch").addEventListener("input", renderMyFoods);
document.getElementById("myFoodsList").addEventListener("click", async (e) => {
  const hb = e.target.closest("[data-my-hide]");
  if (hb) {
    const hf = myFoodsList[parseInt(hb.dataset.myHide, 10)]; if (!hf) return;
    const key = hf.name.trim().toLowerCase();
    state.hiddenRecentFoods = (state.hiddenRecentFoods || []).concat(key);
    renderMyFoods(); renderRecentFoods();
    await persistNow();
    showToast("Hidden from your foods.", async () => {
      state.hiddenRecentFoods = state.hiddenRecentFoods.filter(k => k !== key);
      renderMyFoods(); renderRecentFoods(); await persistNow();
    });
    return;
  }
  const b = e.target.closest("[data-my-add]"); if (!b) return;
  const f = myFoodsList[parseInt(b.dataset.myAdd, 10)]; if (!f) return;
  const mult = parseFloat(b.dataset.mult) || 1;
  const base = f.name.replace(/\s*\(×[\d.]+\)\s*$/, "");
  // Entries already scaled earlier (name ends "(×2)") are brought back to one unit first.
  const prev = parseFloat((f.name.match(/\(×([\d.]+)\)\s*$/) || [])[1]) || 1;
  const u = mult / prev;
  await addFoodEntry({
    name: mult === 1 ? base : `${base} (×${mult})`,
    calories: Math.round((f.calories || 0) * u), protein: Math.round((f.protein || 0) * u),
    carbs: Math.round((f.carbs || 0) * u), fat: Math.round((f.fat || 0) * u),
    ...(f.alcohol ? { alcohol: true } : {}), source: "my",
  });
});

// Past days: totals per day for the last 14 days; tap one to open it in the log above.
function renderFoodHistory() {
  const el = document.getElementById("foodHistory");
  if (!el) return;
  const rows = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const k = localDateStr(d);
    const logs = foodLogsForDate(k);
    if (!logs.length) continue;
    const pro = logs.reduce((n, f) => n + (f.protein || 0), 0);
    const cal = logs.reduce((n, f) => n + (f.calories || 0), 0);
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    rows.push(`<div class="tf-hist-row" data-hist-date="${k}" role="button" tabindex="0"><div><div class="d">${label}</div><div class="s">${logs.length} ${logs.length === 1 ? "entry" : "entries"} · ${cal.toLocaleString()} cal${isDayMarkedPartial(k) ? " · partial day" : ""}</div></div><div class="p">${pro}<small> g protein</small></div></div>`);
  }
  el.innerHTML = rows.length ? rows.join("") : '<div class="empty">Nothing logged in the last 14 days.</div>';
  try { renderDayStrip(); } catch (e) {}
}
function renderDayStrip() {
  const el = document.getElementById("dayStrip");
  if (!el) return;
  const now = new Date();
  const dailyBudget = (state.settings.weeklyCalBudget || DEFAULT_WEEK_BUDGET) / 7;
  const sel = (document.getElementById("foodLogDate").value || localDateStr());
  const cols = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i), k = localDateStr(d);
    const logs = foodLogsForDate(k), cal = logs.reduce((n, f) => n + (f.calories || 0), 0);
    cols.push({ k, cal, n: logs.length, lab: d.toLocaleDateString("en-US", { weekday: "short" })[0] });
  }
  const top = Math.max(dailyBudget * 1.3, ...cols.map(c => c.cal)) * 1.05, H = 30;
  const yb = H - (dailyBudget / top) * H;
  el.innerHTML = `<div style="position:relative;"><div style="display:flex; align-items:flex-end; gap:6px; height:${H}px; position:relative;">${cols.map(c => {
    const h = c.n ? Math.max(4, Math.round(c.cal / top * H)) : 4;
    const col = !c.n ? "var(--border)" : c.cal <= dailyBudget * 1.1 ? "var(--accent)" : c.cal <= dailyBudget * 1.3 ? "var(--warn)" : "var(--danger)";
    return `<div data-strip-date="${c.k}" role="button" tabindex="0" style="flex:1; height:${H}px; display:flex; align-items:flex-end; cursor:pointer;"><i style="display:block; width:100%; height:${h}px; border-radius:4px; background:${col};${c.k === sel ? " outline:2px solid var(--text); outline-offset:1px;" : ""}"></i></div>`;
  }).join("")}</div>
  <div style="display:flex; gap:6px; margin-top:4px;">${cols.map(c => `<div style="flex:1; text-align:center; font-size:11px; color:${c.k === sel ? "var(--text)" : "var(--text-muted)"};">${c.lab}</div>`).join("")}</div></div>
`;
}
document.getElementById("foodHistoryOpen").addEventListener("click", () => {
  const d = document.getElementById("foodHistoryDetails"); d.open = !d.open;
  if (d.open) d.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
document.getElementById("dayStrip").addEventListener("click", (e) => {
  const c = e.target.closest("[data-strip-date]");
  if (!c) return;
  document.getElementById("foodLogDate").value = c.dataset.stripDate === localDateStr() ? "" : c.dataset.stripDate;
  renderFoodLogList();
  window.scrollTo({ top: document.getElementById("tfLogLabel").getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
});
document.getElementById("foodHistory").addEventListener("click", (e) => {
  const row = e.target.closest("[data-hist-date]");
  if (!row) return;
  document.getElementById("foodLogDate").value = row.dataset.histDate === localDateStr() ? "" : row.dataset.histDate;
  renderFoodLogList();
  window.scrollTo({ top: document.getElementById("tfLogLabel").getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
});
function updatePhotoOptionsLabel() {
  const open = !document.getElementById("photoOptions").classList.contains("hidden");
  const names = { package: "Package", plated: "Plated", restaurant: "Restaurant", drink: "Drink" };
  const pt = document.getElementById("photoOptionsToggle");
  pt.setAttribute("aria-expanded", open ? "true" : "false");
  pt.setAttribute("aria-label", "Photo options" + (scanKind && names[scanKind] ? ": " + names[scanKind] : ""));
  pt.classList.toggle("open", open || !!(scanKind && names[scanKind]));
}
document.getElementById("photoOptionsToggle").addEventListener("click", () => {
  document.getElementById("photoOptions").classList.toggle("hidden");
  updatePhotoOptionsLabel();
});
document.getElementById("scanKindChips").addEventListener("click", () => setTimeout(updatePhotoOptionsLabel, 0));
document.getElementById("tfBackToday").addEventListener("click", () => {
  document.getElementById("foodLogDate").value = "";
  renderFoodLogList();
});
document.getElementById("pastDayBack").addEventListener("click", () => {
  document.getElementById("foodLogDate").value = "";
  renderFoodLogList();
});
document.getElementById("dayTotalBtn").addEventListener("click", () => {
  document.getElementById("manualName").value = "Day total (estimated)";
  document.getElementById("manualCalories").focus();
});
// Quick add / Exact numbers tiles open their panel below; tapping again closes it.
function toggleAddPanel(which) {
  const panels = { quick: ["quickAddPanel", "tfQuickTile"], exact: ["exactPanel", "tfExactTile"] };
  Object.keys(panels).forEach(k => {
    const [pid, tid] = panels[k];
    const show = k === which && document.getElementById(pid).classList.contains("hidden");
    document.getElementById(pid).classList.toggle("hidden", !show);
    document.getElementById(tid).classList.toggle("open", show);
  });
}
document.getElementById("tfQuickTile").addEventListener("click", () => toggleAddPanel("quick"));
document.getElementById("foodLogList").addEventListener("click", (e) => {
  if (e.target.closest("[data-empty-quick]")) { toggleAddPanel("quick"); document.getElementById("tfQuickTile").scrollIntoView({ behavior: "smooth", block: "center" }); }
});
document.getElementById("tfExactTile").addEventListener("click", () => toggleAddPanel("exact"));

let foodLogOpen = false;     // log starts collapsed: summary + latest entry
let foodRowOpen = null;      // which entry's actions are showing
function renderFoodLogList() {
  const el = document.getElementById("foodLogList");
  const dateInput = document.getElementById("foodLogDate");
  const selectedDate = dateInput.value || localDateStr();
  try { renderRecentFoods(); } catch (e) {}
  renderPartialControls();
  const isToday = selectedDate === localDateStr();
  const lab = document.getElementById("tfLogLabel");
  if (lab) lab.textContent = isToday ? "Today" : new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const back = document.getElementById("tfBackToday");
  if (back) back.classList.toggle("hidden", isToday);
  const pb = document.getElementById("pastDayBanner");
  if (pb) {
    const t = foodAddTarget();
    pb.classList.toggle("hidden", !t.past);
    document.getElementById("pastDayBannerText").textContent = t.past ? "Adding to " + t.label + ", not today" : "";
  }
  try { renderDayStrip(); } catch (e) {}
  const dayLogs = foodLogsForDate(selectedDate).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!dayLogs.length) {
    const c0 = document.getElementById("tfLogCount"); if (c0) c0.textContent = "";
    el.innerHTML = isToday
      ? '<div class="tf-foodempty"><div>Nothing logged yet. Start with a protein hit.</div><button type="button" data-empty-quick>Quick add</button></div>'
      : '<div class="empty">Nothing logged for this day.</div>';
    return;
  }
  const totCal = dayLogs.reduce((n, f) => n + (f.calories || 0), 0);
  const totPro = dayLogs.reduce((n, f) => n + (f.protein || 0), 0);
  const newest = dayLogs.slice().reverse();                  // newest first
  const shown = foodLogOpen ? newest : newest.slice(0, 3);   // collapsed: the latest three entries
  const cnt = document.getElementById("tfLogCount");
  if (cnt) cnt.textContent = dayLogs.length + (dayLogs.length === 1 ? " entry" : " entries");
  const rowHtml = (f) => {
    const realIndex = state.foodLogs.indexOf(f);
    const open = foodRowOpen === realIndex;
    return `
      <div class="tf-fl-row${open ? " open" : ""}">
        <div class="tf-fl-main" data-row-toggle="${realIndex}" role="button" tabindex="0">
          <div class="tf-fl-name"><div class="n">${f.name}</div>
          <div class="m">${timeLabel(new Date(f.date))}${f.source === "photo" && f.est !== false ? " · est." : ""}${open ? ` · ${f.carbs}c · ${f.fat}f` : ""}</div></div>
          <div class="tf-fl-pro">${f.calories}<small> cal · ${f.protein}g</small></div>
        </div>
        <div class="tf-fl-actions${open ? "" : " hidden"}">
          <button class="danger-link" style="color:var(--accent);" data-repeat-food="${realIndex}">+1 serving</button>
          <button class="danger-link" style="color:var(--accent);" data-edit-food="${realIndex}">Edit</button>
          <button class="danger-link" style="margin-left:auto;" data-del-food="${realIndex}">Delete</button>
        </div>
        <div class="hidden" data-edit-panel="${realIndex}" style="margin:8px 12px 12px;">
          <input type="text" data-field="name" value="${f.name.replace(/"/g,'&quot;')}" placeholder="Food name" style="margin-bottom:8px;">
          <div class="field mb8">
            <div class="field-label">Time eaten</div>
            <input type="time" data-field="time" value="${String(new Date(f.date).getHours()).padStart(2, "0")}:${String(new Date(f.date).getMinutes()).padStart(2, "0")}">
          </div>
          <div class="field mb8">
            <div class="field-label">Servings (scales the numbers below)</div>
            <input type="text" inputmode="decimal" data-servings="${realIndex}" value="1" data-base="${f.calories || 0},${f.protein || 0},${f.carbs || 0},${f.fat || 0}">
          </div>
          <div class="row">
            <div class="field"><div class="field-label">Calories</div><input type="text" inputmode="numeric" data-field="calories" value="${f.calories}"></div>
            <div class="field"><div class="field-label">Protein (g)</div><input type="text" inputmode="numeric" data-field="protein" value="${f.protein}"></div>
          </div>
          <div class="row mt8">
            <div class="field"><div class="field-label">Carbs (g)</div><input type="text" inputmode="numeric" data-field="carbs" value="${f.carbs}"></div>
            <div class="field"><div class="field-label">Fat (g)</div><input type="text" inputmode="numeric" data-field="fat" value="${f.fat}"></div>
          </div>
          <button class="primary" data-save-food="${realIndex}" style="margin-top:10px;">Save changes</button>
        </div>
      </div>`;
  };
  const more = dayLogs.length > 3 ? `<div class="tf-fl-more" data-log-toggle role="button" tabindex="0">${foodLogOpen ? "Show less" : "Show all " + dayLogs.length + " ›"}</div>` : "";
  el.innerHTML = `<div class="tf-fl-group">${shown.map(rowHtml).join("")}</div>` + more;
}

document.getElementById("foodLogList").addEventListener("click", (e) => {
  if (e.target.closest("[data-log-toggle]")) { foodLogOpen = !foodLogOpen; foodRowOpen = null; renderFoodLogList(); return; }
  const row = e.target.closest("[data-row-toggle]");
  if (row) { const i = parseInt(row.dataset.rowToggle, 10); foodRowOpen = foodRowOpen === i ? null : i; renderFoodLogList(); }
});
document.getElementById("foodLogDate").addEventListener("change", renderFoodLogList);

// Editing servings rescales the macro fields from the values the panel opened
// with (not from each other), so typing 2, then 1.5, never compounds.
document.getElementById("foodLogList").addEventListener("input", (e) => {
  const input = e.target.closest("[data-servings]");
  if (!input) return;
  const servings = parseFloat(input.value);
  if (!(servings >= 0)) return;
  const [cal, pro, carb, fat] = input.dataset.base.split(",").map(Number);
  const panel = input.closest("[data-edit-panel]");
  const set = (field, v) => { panel.querySelector(`[data-field="${field}"]`).value = Math.round(v * servings); };
  set("calories", cal); set("protein", pro); set("carbs", carb); set("fat", fat);
});

document.getElementById("foodLogList").addEventListener("click", async (e) => {
  const repeatIdx = e.target.dataset.repeatFood;
  if (repeatIdx !== undefined) {
    const original = state.foodLogs[parseInt(repeatIdx, 10)];
    if (original) {
      await addFoodEntry({
        name: original.name,
        calories: original.calories,
        protein: original.protein,
        carbs: original.carbs,
        fat: original.fat,
        source: original.source,
      });
    }
    return;
  }
  const editIdx = e.target.dataset.editFood;
  if (editIdx !== undefined) {
    document.querySelectorAll("[data-edit-panel]").forEach(p => {
      if (p.dataset.editPanel !== editIdx) p.classList.add("hidden");
    });
    document.querySelector(`[data-edit-panel="${editIdx}"]`).classList.toggle("hidden");
    return;
  }
  const saveIdx = e.target.dataset.saveFood;
  if (saveIdx !== undefined) {
    const panel = document.querySelector(`[data-edit-panel="${saveIdx}"]`);
    const idx = parseInt(saveIdx, 10);
    const getVal = (field) => panel.querySelector(`[data-field="${field}"]`).value;
    let newDate = state.foodLogs[idx].date;
    const timeVal = getVal("time");
    if (/^\d{2}:\d{2}$/.test(timeVal)) {
      const d = new Date(state.foodLogs[idx].date);
      const [hh, mm] = timeVal.split(":").map(Number);
      d.setHours(hh, mm, 0, 0);
      newDate = d.toISOString();
    }
    state.foodLogs[idx] = {
      ...state.foodLogs[idx],
      date: newDate,
      name: getVal("name").trim() || state.foodLogs[idx].name,
      calories: parseInt(getVal("calories"), 10) || 0,
      protein: parseInt(getVal("protein"), 10) || 0,
      carbs: parseInt(getVal("carbs"), 10) || 0,
      fat: parseInt(getVal("fat"), 10) || 0,
    };
    await persistNow();
    renderMacroSummary();
    renderFoodLogList();
    return;
  }
  const idx = e.target.dataset.delFood;
  if (idx === undefined) return;
  const delIdx = parseInt(idx, 10), removed = state.foodLogs[delIdx];
  state.foodLogs.splice(delIdx, 1);
  foodRowOpen = null;
  await persistNow();
  renderMacroSummary();
  renderFoodLogList();
  if (removed) showToast(`Deleted ${removed.name || "entry"}`, async () => {
    state.foodLogs.push(removed);
    await persistNow();
    renderMacroSummary();
    renderFoodLogList();
  });
});

// Small confirmation toast so a tap on a quick-add chip visibly registers.
// Undo removes exactly the entry that was just added.
let toastTimer = null;
function showToast(message, onUndo) {
  let el = document.getElementById("appToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "appToast";
    el.style.cssText = "position:fixed; left:16px; right:16px; bottom:96px; z-index:50; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; background:var(--surface-2); color:var(--text); border:1px solid var(--accent); border-radius:6px; font-size:14px; box-shadow:0 4px 16px rgba(0,0,0,0.4);";
    document.body.appendChild(el);
  }
  el.innerHTML = `<span>${escapeHtml(message)}</span>${onUndo ? `<button class="danger-link" id="appToastUndo" style="color:var(--accent); padding:0;">Undo</button>` : ""}`;
  el.style.display = "flex";
  if (onUndo) {
    document.getElementById("appToastUndo").addEventListener("click", async () => {
      el.style.display = "none";
      await onUndo();
    }, { once: true });
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = "none"; }, 4500);
}

// If you are viewing an earlier day in the log, new entries are saved to THAT day (at noon).
function foodAddTarget() {
  const v = (document.getElementById("foodLogDate").value || "").trim();
  const today = localDateStr();
  if (v && v < today) {
    return { past: true, dateStr: v, iso: new Date(v + "T12:00:00").toISOString(),
      label: new Date(v + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) };
  }
  return { past: false, dateStr: today, iso: null, label: "" };
}
async function addFoodEntries(entries, label) {
  const todayStr = localDateStr();
  const target = foodAddTarget();
  if (!target.past && state.foodDayClosed && state.foodDayClosed[todayStr]) {
    if (!confirm("You ended tracking for today. Add this anyway and reopen the day?")) return false;
    delete state.foodDayClosed[todayStr];
  }
  const records = entries.map(e => ({ date: target.past ? target.iso : new Date().toISOString(), ...e }));
  records.forEach(r => state.foodLogs.push(r));
  await persistNow();
  renderMacroSummary();
  renderFoodLogList();
  renderQuickProteinChips();
  const cal = records.reduce((n, r) => n + (r.calories || 0), 0);
  showToast(`Added ${label || (records.length === 1 ? records[0].name : records.length + " items")} · ${cal} cal${target.past ? " to " + target.label : ""}`, async () => {
    records.forEach(r => { const i = state.foodLogs.indexOf(r); if (i !== -1) state.foodLogs.splice(i, 1); });
    await persistNow();
    renderMacroSummary();
    renderFoodLogList();
    renderQuickProteinChips();
  });
  return true;
}
async function addFoodEntry(entry) {
  return addFoodEntries([entry]);
}

// -- photo scan --
let scanBaseValues = { calories: 0, protein: 0, carbs: 0, fat: 0 };
let scanKind = "";
document.getElementById("scanKindChips").addEventListener("click", (e) => {
  const c = e.target.closest("[data-kind]"); if (!c) return;
  scanKind = c.dataset.kind || "";
  document.querySelectorAll("#scanKindChips .chip").forEach(x => x.classList.toggle("active", x === c));
});
function setScanServings(n) {
  const el = document.getElementById("scanServings");
  el.value = String(n);
  el.dispatchEvent(new Event("input"));
}
document.getElementById("scanServingChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-sv]"); if (b) setScanServings(parseFloat(b.dataset.sv));
});

document.getElementById("scanServings").addEventListener("input", (e) => {
  const servings = parseFloat(e.target.value) || 0;
  document.getElementById("scanCalories").value = Math.round(scanBaseValues.calories * servings);
  document.getElementById("scanProtein").value = Math.round(scanBaseValues.protein * servings);
  document.getElementById("scanCarbs").value = Math.round(scanBaseValues.carbs * servings);
  document.getElementById("scanFat").value = Math.round(scanBaseValues.fat * servings);
});

// Opening the camera sends the phone to its camera app, and Android may kill
// this PWA in the background to free memory. When that happens the page just
// reloads and the photo never arrives, with no error. Leave a breadcrumb
// before opening the camera and check for it on startup, so a reload shows
// a plain explanation (and keeps the typed note) instead of silence.
function scanBreadcrumb(action, value) {
  try {
    if (action === "set") sessionStorage.setItem("scanPendingAt", String(Date.now()));
    else if (action === "clear") sessionStorage.removeItem("scanPendingAt");
    else if (action === "note") sessionStorage.setItem("scanNote", value || "");
  } catch (e) {}
}
function checkScanInterrupted() {
  try {
    const at = parseInt(sessionStorage.getItem("scanPendingAt") || "", 10);
    if (!at) return;
    sessionStorage.removeItem("scanPendingAt");
    if (Date.now() - at > 15 * 60 * 1000) return;
    const note = sessionStorage.getItem("scanNote") || "";
    if (note) document.getElementById("scanNote").value = note;
    const el = document.getElementById("foodScanStatus");
    el.style.display = "block";
    el.textContent = "The app restarted while the camera was open (the phone ran low on memory), so the photo never reached the scan. Tap the box to retake it. Closing other apps first helps, and your note was kept.";
  } catch (e) {}
}
// The camera was closed without taking a photo: not an interruption.
document.getElementById("foodPhotoInput").addEventListener("cancel", () => scanBreadcrumb("clear"));
// Full-resolution camera photos (often 8-12+ MP) can exhaust memory when
// converted to base64 directly, especially on Android. Downscale via canvas
// first — plenty of detail survives for a food ID/macro estimate at 1200px.
function resizeImageFile(file, maxDim = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't decode the photo."));
    };
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ base64: dataUrl.split(",")[1], media_type: "image/jpeg" });
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.src = objectUrl;
  });
}

// Uses createImageBitmap (browser-native decode, more memory-efficient than
// an <img> element) + canvas.toBlob (binary output, not a base64 string) to
// shrink oversized camera photos before upload. Explicitly closes the bitmap
// to free memory right away rather than waiting on GC. Falls back to the
// original file untouched if anything here fails or isn't supported —
// worst case, upload just proceeds at full size like before.
//
// Critical detail: the resize target is passed straight into createImageBitmap
// via resizeWidth/resizeQuality, so the browser's native decoder downsamples
// WHILE decoding rather than materializing a full-resolution bitmap first and
// scaling after. Many current Android camera photos are 48MP+; decoding one of
// those to a full bitmap before shrinking it can spike memory by 150-200MB+,
// which is what was triggering Chrome's low-memory kill/reload mid-scan —
// a full page reload, not a JS error, so nothing ever reached the try/catch
// and the app just silently landed back on the default tab with the in-flight
// scan lost. Decoding pre-downscaled avoids ever creating that huge
// intermediate bitmap.
// THE BUG THIS REPLACES: the old catch block gave up by returning the raw,
// undownscaled file — which is exactly the near-guaranteed-to-fail path.
// Claude's API hard-rejects any image over 10MB base64-encoded, and a
// modern phone's full-res camera photo (48MP+ JPEGs commonly run
// 8-20MB) blows past that every time. So any time the resize step failed
// for ANY reason — a transient decode hiccup, an odd EXIF/format quirk,
// momentary memory pressure — the scan didn't just degrade, it silently
// switched to a payload that was essentially guaranteed to be rejected by
// the API a moment later. That's what "constantly stops working" actually
// was: not random, just a resize failure being masked as an unrelated
// upload failure every time it happened.
//
// Fix: retry the SAME safe resize-during-decode path (the thing that
// prevents the original low-memory crash) at progressively smaller
// targets instead of ever falling back to a full-resolution file. If every
// tier fails, refuse with a clear message rather than uploading something
// doomed — manual entry is right there as a fallback.
async function getUploadBlob(file, maxBytes = 3 * 1024 * 1024) {
  if (!("createImageBitmap" in window)) {
    if (file.size > maxBytes) {
      throw new Error("Your browser can't resize this photo and it's too large to upload as-is. Use manual entry below instead.");
    }
    return file;
  }
  if (file.size <= maxBytes) return file; // already small enough, skip processing entirely

  for (const maxDim of [1400, 900, 600]) {
    let bitmap;
    try {
      // resizeWidth alone (no resizeHeight) preserves aspect ratio per spec,
      // and decode+downsample happens as one native step — this is what
      // keeps a 48MP photo from ever being materialized at full resolution.
      bitmap = await createImageBitmap(file, { resizeWidth: maxDim, resizeQuality: "medium" });
      const { width, height } = bitmap;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

      let q = 0.8;
      let blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", q));
      let attempts = 0;
      while (blob && blob.size > maxBytes && attempts < 6) {
        q = Math.max(0.3, q - 0.12);
        blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", q));
        attempts++;
      }
      if (blob && blob.size <= maxBytes) return blob;

      // Quality floor reached and still too big — shrink dimensions further
      // within this same already-downscaled bitmap (never redraws from the
      // original file) until it fits or gets too small to bother with.
      let w = width, h = height;
      while (blob && blob.size > maxBytes && w > 300) {
        w = Math.round(w * 0.75);
        h = Math.round(h * 0.75);
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
        blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.5));
      }
      if (blob && blob.size <= maxBytes) return blob;
      // Still oversized at this tier — fall through and try a smaller maxDim.
    } catch (err) {
      // This tier's decode/resize failed — try the next smaller target on
      // the same safe path rather than giving up or falling back to raw.
    } finally {
      if (bitmap) bitmap.close();
    }
  }
  throw new Error("Couldn't shrink this photo enough to upload safely. Try a different photo, or use manual entry below.");
}

function fillScanReview(est) {
  scanBaseValues = { calories: est.calories || 0, protein: est.protein || 0, carbs: est.carbs || 0, fat: est.fat || 0 };
  document.getElementById("scanName").value = est.name || "";
  document.getElementById("scanServings").value = "1";
  // Serving info: what one "serving" means, plus quick buttons when the package holds several.
  const spc = parseFloat(est.servings_per_container);
  document.getElementById("scanServingInfo").textContent = [est.serving_note, spc > 1 ? `Package holds about ${spc} servings.` : ""].filter(Boolean).join(" · ");
  document.getElementById("scanServingChips").innerHTML = spc > 1
    ? `<div class="chip" data-sv="0.5">½</div><div class="chip" data-sv="1">1 serving</div><div class="chip" data-sv="${spc}">Whole package (×${spc})</div>`
    : "";
  document.getElementById("scanCalories").value = est.calories || "";
  document.getElementById("scanProtein").value = est.protein || "";
  document.getElementById("scanCarbs").value = est.carbs || "";
  document.getElementById("scanFat").value = est.fat || "";
  document.getElementById("foodScanReview").classList.remove("hidden");
  document.getElementById("scanNote").value = "";
}
async function scanFoodBlob(file) {
  const statusEl = document.getElementById("foodScanStatus");
  statusEl.style.display = "block";
  statusEl.textContent = "Analyzing photo…";
  document.getElementById("foodScanReview").classList.add("hidden");
  try {
    if (!WORKER_URL) throw new Error("no worker url configured");
    const uploadBlob = await getUploadBlob(file);
    console.log("Scanning photo, original:", file.size, "upload size:", uploadBlob.size);
    const note = document.getElementById("scanNote").value.trim();
    // Encoding happens here, not in the Worker — the blob is already small
    // (resized above) so this is fast and memory-safe, and it avoids the
    // Worker's 10ms free-tier CPU budget, which a server-side base64 loop
    // over even a couple MB can exceed on larger photos.
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(uploadBlob);
    });
    const resp = await fetchWithRetry(WORKER_URL.replace(/\/$/, "") + "/api/food-scan", withAuth({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: { media_type: uploadBlob.type || file.type || "image/jpeg", data: base64 },
        kind: scanKind || undefined,
        note: note ? `${note} (If this lists several foods, return one combined total for the whole meal. Always answer with the JSON object only.)` : note,
      }),
    }));
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      throw new Error(`${resp.status}: ${errBody.slice(0, 300)}`);
    }
    const data = await resp.json();
    const text = data.content?.[0]?.text || "{}";
    // The model sometimes answers in prose (or wraps the JSON in commentary)
    // when a note is attached, e.g. when the note lists several foods or asks
    // something. Pull the first {...} object out of whatever came back before
    // giving up, and if there's still nothing usable, show what it actually
    // said rather than a bare JSON parse error.
    let est;
    try {
      est = extractJson(text);
    } catch (parseErr) {
      const m = text.match(/\{[\s\S]*?\}/);
      try { est = m ? JSON.parse(m[0]) : null; } catch (e2) { est = null; }
      if (!est || typeof est !== "object") {
        throw new Error("the AI replied with text instead of an estimate: \"" + text.trim().slice(0, 160) + "\"");
      }
    }
    fillScanReview(est);
    statusEl.textContent = est.confidence === "low"
      ? "Low confidence: check the portion, or retake with a note like '2 slices'."
      : "Review the estimate below, then add it.";
  } catch (err) {
    statusEl.textContent = "Scan failed: " + err.message;
  }
}

document.getElementById("foodPhotoInput").addEventListener("change", (e) => {
  scanBreadcrumb("clear");
  const file = e.target.files[0];
  e.target.value = ""; // allow picking the same photo again
  if (file) scanFoodBlob(file);
});

// ---- In-app camera ----
// Launching the phone's camera app is what gets this app killed for memory
// on Android. Capturing from a live preview inside the page keeps the app in
// the foreground the whole time. Falls back to the file picker if the camera
// can't be opened (no permission, no camera, unsupported browser).
let cameraStream = null;
function closeCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  const ov = document.getElementById("cameraOverlay");
  if (ov) ov.remove();
}
async function openCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("no camera api");
  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1600 }, height: { ideal: 1200 } },
    audio: false,
  });
  const ov = document.createElement("div");
  ov.id = "cameraOverlay";
  ov.style.cssText = "position:fixed; inset:0; z-index:9999; background:#000; display:flex; flex-direction:column;";
  ov.innerHTML = `
    <video id="cameraVideo" autoplay playsinline muted style="flex:1; min-height:0; width:100%; object-fit:contain; background:#000;"></video>
    <div style="display:flex; gap:12px; padding:16px; padding-bottom:max(16px, env(safe-area-inset-bottom)); background:#000;">
      <button class="secondary fx1" id="cameraCancelBtn">Cancel</button>
      <button class="primary" id="cameraSnapBtn" style="flex:2;">Take photo</button>
    </div>`;
  document.body.appendChild(ov);
  const video = document.getElementById("cameraVideo");
  video.srcObject = cameraStream;
  // Start at the widest view the camera offers, so a whole plate fits without backing away.
  try {
    const track = cameraStream.getVideoTracks()[0];
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (caps.zoom && typeof caps.zoom.min === "number") await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min }] });
  } catch (e) { /* zoom control not supported on this phone: ignore */ }
  document.getElementById("cameraCancelBtn").addEventListener("click", closeCamera);
  document.getElementById("cameraSnapBtn").addEventListener("click", async () => {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return; // preview not ready yet
    const scale = Math.min(1, 1400 / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85));
    closeCamera();
    if (blob) scanFoodBlob(blob);
  });
}
document.getElementById("foodPhotoDrop").addEventListener("click", async () => {
  try {
    await openCamera();
  } catch (err) {
    closeCamera();
    // Camera unavailable or blocked: use the phone's picker instead.
    scanBreadcrumb("note", document.getElementById("scanNote").value);
    scanBreadcrumb("set");
    document.getElementById("foodPhotoInput").click();
  }
});
document.getElementById("foodPhotoChoose").addEventListener("click", () => {
  scanBreadcrumb("note", document.getElementById("scanNote").value);
  scanBreadcrumb("set");
  document.getElementById("foodPhotoInput").click();
});

// ---- Barcode scan: exact label numbers for packaged food ----
// Uses the browser's BarcodeDetector when the phone has one; otherwise (or as a backup)
// you can type the number printed under the barcode. Lookup runs through the worker.
async function lookupBarcode(code) {
  const statusEl = document.getElementById("foodScanStatus");
  statusEl.style.display = "block";
  statusEl.textContent = "Looking up " + code + "…";
  document.getElementById("foodScanReview").classList.add("hidden");
  try {
    const resp = await fetchWithRetry(WORKER_URL.replace(/\/$/, "") + "/api/barcode?code=" + encodeURIComponent(code), withAuth({ method: "GET" }));
    if (!resp.ok) throw new Error("lookup failed (" + resp.status + ")");
    const d = await resp.json();
    if (!d.found) { statusEl.textContent = "That barcode isn't in the food database. Use PHOTO on the package instead."; return; }
    fillScanReview({ ...d, name: d.name + (d.basis === "100g" ? " (100 g)" : " (1 serving)"), confidence: "high" });
    statusEl.textContent = d.basis === "100g"
      ? "Label numbers are per 100 g here. Set Servings to match what you ate (1 = 100 g)."
      : "Exact label numbers for one serving. Adjust servings if you ate more.";
  } catch (err) {
    statusEl.textContent = "Barcode lookup failed: " + err.message;
  }
}
async function openBarcodeScanner() {
  let stream = null, timer = null, done = false;
  const ov = document.createElement("div");
  ov.id = "barcodeOverlay";
  ov.style.cssText = "position:fixed; inset:0; z-index:9999; background:#000; display:flex; flex-direction:column;";
  ov.innerHTML = `
    <video id="barcodeVideo" autoplay playsinline muted style="flex:1; min-height:0; width:100%; object-fit:contain; background:#000;"></video>
    <div id="barcodeMsg" style="color:#fff; text-align:center; padding:8px 16px;">Point the camera at the barcode</div>
    <div style="display:flex; gap:8px; padding:0 16px 8px;"><input type="text" inputmode="numeric" id="barcodeTyped" placeholder="or type the number under the barcode" style="flex:1; border-radius:12px;"><button class="primary" id="barcodeGo">Look up</button></div>
    <div style="padding:8px 16px 16px; padding-bottom:max(16px, env(safe-area-inset-bottom));"><button class="secondary w100" id="barcodeCancel">Cancel</button></div>`;
  document.body.appendChild(ov);
  const finish = (code) => {
    if (done) return; done = true;
    clearInterval(timer);
    if (stream) stream.getTracks().forEach(t => t.stop());
    ov.remove();
    if (code) lookupBarcode(code);
  };
  document.getElementById("barcodeCancel").addEventListener("click", () => finish(null));
  document.getElementById("barcodeGo").addEventListener("click", () => {
    const v = document.getElementById("barcodeTyped").value.replace(/\D/g, "");
    if (v.length >= 6) finish(v); else document.getElementById("barcodeMsg").textContent = "Enter the full barcode number (6 to 14 digits).";
  });
  if (!("BarcodeDetector" in window)) {
    document.getElementById("barcodeMsg").textContent = "This browser can't read barcodes with the camera. Type the number below.";
    document.getElementById("barcodeVideo").style.display = "none";
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1600 }, height: { ideal: 1200 } }, audio: false });
    if (done) { stream.getTracks().forEach(t => t.stop()); return; }
    const video = document.getElementById("barcodeVideo");
    video.srcObject = stream;
    const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    timer = setInterval(async () => {
      if (done || !video.videoWidth) return;
      try {
        const found = await detector.detect(video);
        if (found && found.length) finish(found[0].rawValue);
      } catch (e) { /* keep trying */ }
    }, 350);
  } catch (e) {
    document.getElementById("barcodeMsg").textContent = "Camera not available. Type the number below.";
  }
}
document.getElementById("barcodeBtn").addEventListener("click", openBarcodeScanner);

document.getElementById("saveScanBtn").addEventListener("click", async () => {
  let name = document.getElementById("scanName").value.trim();
  if (!name) { alert("Enter a food name."); return; }
  // If you changed the servings, say so in the name so the log reads honestly later.
  const sv = parseFloat(document.getElementById("scanServings").value);
  if (sv && sv !== 1 && !/×\s*[\d.]+\)?\s*$/.test(name)) name += ` (×${sv})`;
  await addFoodEntry({
    name,
    calories: parseInt(document.getElementById("scanCalories").value, 10) || 0,
    protein: parseInt(document.getElementById("scanProtein").value, 10) || 0,
    carbs: parseInt(document.getElementById("scanCarbs").value, 10) || 0,
    fat: parseInt(document.getElementById("scanFat").value, 10) || 0,
    source: "photo",
    est: scanKind !== "package", // plate/restaurant/drink guesses are estimates; a package label is not
  });
  ["scanName", "scanCalories", "scanProtein", "scanCarbs", "scanFat"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("scanServings").value = "1";
  scanKind = "";
  try { updatePhotoOptionsLabel(); } catch (e) {}
  document.querySelectorAll("#scanKindChips .chip").forEach(x => x.classList.toggle("active", !x.dataset.kind));
  document.getElementById("scanServingInfo").textContent = "";
  document.getElementById("scanServingChips").innerHTML = "";
  document.getElementById("foodScanReview").classList.add("hidden");
  document.getElementById("foodScanStatus").style.display = "none";
});

// -- manual known-macro entry --
document.getElementById("saveManualBtn").addEventListener("click", async () => {
  const name = document.getElementById("manualName").value.trim();
  if (!name) { alert("Enter a food name."); return; }
  await addFoodEntry({
    name,
    calories: parseInt(document.getElementById("manualCalories").value, 10) || 0,
    protein: parseInt(document.getElementById("manualProtein").value, 10) || 0,
    carbs: parseInt(document.getElementById("manualCarbs").value, 10) || 0,
    fat: parseInt(document.getElementById("manualFat").value, 10) || 0,
    source: "manual",
  });
  ["manualName", "manualCalories", "manualProtein", "manualCarbs", "manualFat"].forEach(id => document.getElementById(id).value = "");
});

// -- ring strap setting (Settings) --
document.getElementById("saveRingStrapBtn").addEventListener("click", async () => {
  const clamp = (v) => v === "" || v == null || isNaN(v) ? null : Math.min(12, Math.max(1, Math.round(parseFloat(v) * 2) / 2));
  state.ringStrap = state.ringStrap || {};
  state.ringStrap.push = clamp(document.getElementById("ringStrapPush").value);
  await persistNow();
  alert("Ring strap setting saved.");
});

// -- body composition (Settings) --
document.getElementById("saveHeightBtn").addEventListener("click", async () => {
  const val = parseFloat(document.getElementById("heightInches").value);
  const goalWeightVal = parseFloat(document.getElementById("goalWeightInput").value);
  const goalBodyFatVal = parseFloat(document.getElementById("goalBodyFatInput").value);
  // Height is the one field this card always needed; goals are optional, so
  // only height is required to save at all. Each goal field is independently
  // optional — clearing one shouldn't require re-entering the other.
  if (isNaN(val) || val <= 0) { alert("Enter a height in inches first."); return; }
  state.settings.heightInches = val;
  state.settings.goalWeight = (!isNaN(goalWeightVal) && goalWeightVal > 0) ? goalWeightVal : null;
  state.settings.goalBodyFatPct = (!isNaN(goalBodyFatVal) && goalBodyFatVal > 0) ? goalBodyFatVal : null;
  await persistNow();
  renderProgressCharts();
  alert("Saved.");
});

// -- macro targets (Settings) --
document.getElementById("saveTargetsBtn").addEventListener("click", async () => {
  state.settings.macroTargets = {
    calories: parseInt(document.getElementById("targetCalories").value, 10) || 0,
    protein: parseInt(document.getElementById("targetProtein").value, 10) || 0,
    carbs: parseInt(document.getElementById("targetCarbs").value, 10) || 0,
    fat: parseInt(document.getElementById("targetFat").value, 10) || 0,
  };
  const wg = parseInt(document.getElementById("weeklyGoalInput").value, 10);
  state.settings.weeklyWorkoutGoal = wg > 0 && wg <= 7 ? wg : 3;
  await persistNow();
  try { renderSettingsTiles(); } catch (e) {}
  renderMacroSummary();
  alert("Targets saved.");
});

// "Workouts logged" and "Walks/rucks logged" are tap-to-expand, same as the
// chart tiles — the row shows a total, tapping it reveals every underlying
// entry. This container's HTML is fully rebuilt on every render (unlike the
// chart tiles, which have fixed containers), so the toggle uses one
// delegated click listener on the parent rather than per-row listeners that
// would be destroyed and need re-attaching each render.
const journeyDetailOpen = { workouts: false, cardio: false };
function renderJourneyStats() {
  const el = document.getElementById("journeyStats");
  if (!el) return;
  const s = computeJourneyStats();
  const rows = [];
  rows.push(`<div class="list-item"><div class="name">Current streak</div><div class="meta">${s.current} day${s.current === 1 ? "" : "s"}${s.longest > s.current ? ` (best: ${s.longest})` : ""}</div></div>`);

  rows.push(`<div class="list-item" data-journey-toggle="workouts" style="cursor:pointer;"><div class="name">Workouts logged (all time)</div><div class="meta">${s.totalWorkoutDays} · ${journeyDetailOpen.workouts ? "hide" : "see"} log</div></div>`);
  {
    const activeProg = programs.find(p => p.id === state.activeProgramId);
    if (activeProg && getProgramPace(activeProg).mode === "count") {
      rows.push(`<div class="list-item"><div class="name">This program</div><div class="meta">${getProgramPace(activeProg).completed} of ${totalProgramWorkouts(activeProg)} workouts</div></div>`);
    }
  }
  if (journeyDetailOpen.workouts) {
    const logs = (state.logs || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    rows.push(logs.length ? logs.map(l => `
      <div class="list-item"><div class="name">${new Date(l.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${l.exercise}</div><div class="meta">${l.result}</div></div>
    `).join("") : `<div class="empty">No workouts logged yet.</div>`);
  }

  if (s.totalCardioSessions) {
    rows.push(`<div class="list-item" data-journey-toggle="cardio" style="cursor:pointer;"><div class="name">Walks/rucks logged</div><div class="meta">${s.totalCardioSessions} sessions · ${s.totalCardioDistance.toFixed(1)}mi · ${s.totalCardioMinutes}min · ${journeyDetailOpen.cardio ? "hide" : "see"} log</div></div>`);
    if (journeyDetailOpen.cardio) {
      const cardio = (state.cardioLogs || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
      rows.push(cardio.map(c => `
        <div class="list-item"><div class="name">${new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${c.type === "ruck" ? "Ruck" : "Walk"}</div><div class="meta">${c.distance ? `${c.distance}mi · ` : ""}${c.duration ? `${c.duration}min` : ""}${c.weight ? ` · ${c.weight}lb` : ""}</div></div>
      `).join(""));
    }
  }

  if (s.weightChange !== null) {
    const dir = s.weightChange < 0 ? "down" : s.weightChange > 0 ? "up" : "unchanged";
    rows.push(`<div class="list-item"><div class="name">Weight since you started</div><div class="meta">${Math.abs(s.weightChange).toFixed(1)}lb ${dir}${s.firstDate ? ` (since ${s.firstDate})` : ""}</div></div>`);
  }
  el.innerHTML = rows.join("");
}
document.getElementById("journeyStats").addEventListener("click", (e) => {
  const row = e.target.closest("[data-journey-toggle]");
  if (!row) return;
  journeyDetailOpen[row.dataset.journeyToggle] = !journeyDetailOpen[row.dataset.journeyToggle];
  renderJourneyStats();
});

function renderBodyFatSummary() {
  const el = document.getElementById("bodyFatSummary");
  const tiles = [];
  let notes = "";

  // --- Weight ---
  const wg = computeWeightGoalForecast();
  if (!wg) {
    notes += `<div class="tf-empty" style="padding:0 2px 8px;">Log a weigh-in to start tracking toward a goal.</div>`;
  } else {
    let frac = 0, sub = "now";
    if (wg.goalWeight) {
      const span = wg.startWeight - wg.goalWeight;
      frac = span !== 0 ? (wg.startWeight - wg.currentWeight) / span : 0;
      sub = "goal " + wg.goalWeight;
    }
    tiles.push(`<div class="tf-rt">${tfRing(frac, String(wg.currentWeight), "Weight " + wg.currentWeight + " pounds", "var(--accent)", 96)}<div class="rv">${wg.currentWeight}<small> lb</small></div><div class="rl">${sub}${wg.goalWeight ? "<br>started " + wg.startWeight : ""}</div></div>`);
    if (!wg.goalWeight) notes += `<div class="rl" style="color:var(--text-muted); font-size:13px; margin-top:8px;">Set a goal weight in Settings to see a forecast.</div>`;
    else if (wg.status === "reached") notes += `<div class="tf-hl"><span class="t" style="color:var(--accent);">Goal weight reached</span></div>`;
    else if (wg.status === "onTrack" && Math.abs(wg.weeksToGoal) <= 104) {
      const weeks = Math.abs(wg.weeksToGoal);
      const wl = weeks < 1 ? "under a week" : `~${Math.round(weeks)} wk`;
      notes += `<div class="tf-hl"><span class="t">${wl} to goal at ${wg.trendLbPerWeek >= 0 ? "+" : ""}${wg.trendLbPerWeek.toFixed(2)} lb/wk</span><span class="tf-pill2">on track</span></div>`;
    } else {
      notes += `<div class="tf-hl"><span class="t">Holding steady for now</span><span class="tf-pill2 gray">keep logging</span></div>`;
    }
  }

  // --- Body fat ---
  const bf = computeBodyFatTrend();
  if (!bf) {
    notes += `<div class="rl" style="color:var(--text-muted); font-size:13px; margin-top:10px;">Log neck + waist with a weigh-in to get a body-fat estimate here.</div>`;
    if (clearFlagType("bodyFatTrend")) { persistNow(); renderFlagsBanner(); }
  } else {
    const bfg = (typeof computeBodyFatGoalForecast === "function") ? computeBodyFatGoalForecast() : null;
    const goalPct = bfg && bfg.goalPct;
    const firstBf = (state.measurements || []).filter(m => typeof m.bodyFatPct === "number").sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    let frac = 0;
    if (goalPct && firstBf && firstBf.bodyFatPct !== goalPct) frac = (firstBf.bodyFatPct - bf.latest) / (firstBf.bodyFatPct - goalPct);
    tiles.push(`<div class="tf-rt">${tfRing(frac, bf.latest + "%", "Body fat " + bf.latest + " percent", "var(--gold)", 96)}<div class="rv">${bf.latest}<small> % body fat</small></div><div class="rl">${goalPct ? "goal " + goalPct + "%" : "RFM estimate"}<br>${formatDateOnly(bf.latestDate)}</div></div>`);
    if (bf.ptsPerWeek === null) {
      notes += `<div class="tf-hl"><span class="t">Log again next weigh-in to start a trend</span></div>`;
      if (clearFlagType("bodyFatTrend")) { persistNow(); renderFlagsBanner(); }
    } else {
      const down = bf.ptsPerWeek <= -0.1, up = bf.ptsPerWeek >= 0.1;
      const word = down ? "Trending down" : up ? "Trending up" : "Holding steady";
      const message = `Body fat (RFM method): ${bf.latest}% as of ${formatDateOnly(bf.latestDate)} — ${word.toLowerCase()} (${bf.ptsPerWeek >= 0 ? "+" : ""}${bf.ptsPerWeek.toFixed(2)} pts/week).`;
      let extra = "";
      if (goalPct && bfg.status === "reached") extra = "goal reached";
      else if (goalPct && bfg.status === "onTrack" && Math.abs(bfg.weeksToGoal) <= 104) extra = "~" + Math.round(Math.abs(bfg.weeksToGoal)) + " wk to " + goalPct + "%";
      notes += `<div class="tf-hl"><span class="t">${word} · ${bf.ptsPerWeek >= 0 ? "+" : ""}${bf.ptsPerWeek.toFixed(2)} pts/wk</span>${extra ? `<span class="tf-pill2">${extra}</span>` : `<span class="tf-pill2 gray">${down ? "good" : "steady"}</span>`}</div>`;
      const flagChanged = Math.abs(bf.ptsPerWeek) >= 0.1 ? upsertFlag("bodyFatTrend", message, bf.ptsPerWeek > 0 ? "up" : "down") : clearFlagType("bodyFatTrend");
      if (flagChanged) { persistNow(); renderFlagsBanner(); }
    }
  }
  el.innerHTML = (tiles.length ? `<div class="tf-tiles">${tiles.join("")}</div>` : "") + notes;
}

// "7-day avg: 202.1 lb (down 0.6 vs the week before)". Needs 2+ readings in
// the latest week; the comparison is only added when the prior week has data.
function renderAvgLine(elId, entries, field, unit) {
  const el = document.getElementById(elId);
  if (!el) return;
  const w = weekOverWeek(entries, field);
  if (!w || w.nCurrent < 2) { el.textContent = ""; return; }
  let text = `7-day avg: ${w.current.toFixed(1)} ${unit}`;
  if (w.previous != null) {
    const d = w.current - w.previous;
    text += Math.abs(d) < 0.05
      ? " (same as the week before)"
      : ` (${d > 0 ? "up" : "down"} ${Math.abs(d).toFixed(1)} vs the week before)`;
  }
  el.textContent = text;
}

function renderWaistTrend(measurementsAsc) {
  const withWaist = measurementsAsc.filter(m => typeof m.waist === "number");
  const chartEl = document.getElementById("waistChart");
  if (!chartEl) return;
  const block = document.getElementById("waistTrendBlock");
  if (withWaist.length < 2) {
    document.getElementById("waistAvgLine").textContent = "";
    // Dismissed => hide the whole empty block; it returns on its own once
    // there are 2+ waist readings to chart.
    if (block) block.classList.toggle("hidden", !!state.dismissedWaistEmptyHint);
    chartEl.className = "empty";
    chartEl.innerHTML = `Log waist on a couple of days to see it here.
      <div><button class="danger-link mt6" data-dismiss-waist-hint="1">Got it, don't show this again</button></div>`;
    return;
  }
  if (block) block.classList.remove("hidden");
  chartEl.className = "";
  renderLineChart("waistChart", withWaist.map(m => ({ label: m.date.slice(5), value: m.waist })), {
    yLabel: "in",
    avg: rollingAverageSeries(withWaist, "waist"),
  });
  renderAvgLine("waistAvgLine", withWaist, "waist", "in");
}

// Same chart + 7-day average as waist. Hidden (no nag text) until there are
// 2+ body-fat readings, since the summary above already explains how to get one.
function renderBodyFatChart(measurementsAsc) {
  const block = document.getElementById("bodyFatChartBlock");
  if (!block) return;
  const withBf = measurementsAsc.filter(m => typeof m.bodyFatPct === "number");
  block.classList.toggle("hidden", withBf.length < 2);
  if (withBf.length < 2) return;
  renderLineChart("bodyFatChart", withBf.map(m => ({ label: m.date.slice(5), value: m.bodyFatPct })), {
    yLabel: "%",
    avg: rollingAverageSeries(withBf, "bodyFatPct"),
  });
  renderAvgLine("bodyFatAvgLine", withBf, "bodyFatPct", "%");
}

function renderBloatPatterns() {
  const el = document.getElementById("bloatPatterns");
  if (!el) return;
  const p = computeBloatPatterns();
  if (!p) { el.innerHTML = ""; return; }
  let html = `<div class="name">Bloat days</div>
    <div class="meta">Waist up ${BLOAT_WAIST_DELTA_IN}in+ vs your recent average while the scale stayed flat — ${p.total} so far.</div>`;
  if (p.total < 3) {
    html += `<div class="meta mt6">Need a few more before any pattern means much.</div>`;
  } else if (p.tags.length) {
    html += p.tags.map(t =>
      `<div class="meta mt6">${escapeHtml(t.tag)} — on ${t.count} of ${p.total} bloat days</div>`).join("");
    html += `<div class="meta" style="margin-top:6px; font-style:italic;">A pattern, not proof — a tag that shows up a lot can just be common in your week.</div>`;
  }
  if (p.foods.length) {
    html += `<div class="meta mt8">Foods you noted:</div>` + p.foods.map(f =>
      `<div class="meta">${escapeHtml(f.date.slice(5))}: ${escapeHtml(f.text)}</div>`).join("");
  }
  el.innerHTML = html;
}
