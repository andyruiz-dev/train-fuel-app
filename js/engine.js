// ---- 7-day rolling averages + "bloat day" detection ----
// Averages are display-only (the pace/trend maths above is untouched). A
// "bloat day" is waist clearly up vs. its own recent baseline while scale
// weight is flat — a common water/sodium/bloating signature. Detection needs
// a real baseline (2+ prior waist readings in the previous 7 days), so it
// stays quiet until daily logging has built one.
const DAY_MS = 24 * 60 * 60 * 1000;
const ROLLING_AVG_DAYS = 7;
const BLOAT_WAIST_DELTA_IN = 0.5;
const BLOAT_WEIGHT_FLAT_LB = 1.0;
const BLOAT_TAGS = ["High sodium", "Alcohol", "New food", "Poor sleep", "Late/big meal", "Restaurant/takeout", "No BM in 2+ days"];

// "2026-10-04" is date-only; new Date() reads it as UTC midnight, which shows
// as the previous day in US time zones. Format it as a local calendar date.
function formatDateOnly(d) {
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function meanOf(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// entries: ascending by date, each already known to have a numeric `field`.
// Returns an array aligned with entries: mean of the entries within the
// trailing window (inclusive of that day), or null when fewer than 2 points.
function rollingAverageSeries(entries, field, days = ROLLING_AVG_DAYS) {
  return entries.map(e => {
    const t = new Date(e.date).getTime();
    const win = entries.filter(x => {
      const xt = new Date(x.date).getTime();
      return xt <= t && xt > t - days * DAY_MS;
    });
    return win.length >= 2 ? meanOf(win.map(x => x[field])) : null;
  });
}

// Latest 7-day mean vs. the 7 days before it. previous is null if that
// earlier window has no data.
function weekOverWeek(entries, field, days = ROLLING_AVG_DAYS) {
  if (!entries.length) return null;
  const latestT = new Date(entries[entries.length - 1].date).getTime();
  const cur = entries.filter(e => new Date(e.date).getTime() > latestT - days * DAY_MS);
  const prev = entries.filter(e => {
    const t = new Date(e.date).getTime();
    return t <= latestT - days * DAY_MS && t > latestT - 2 * days * DAY_MS;
  });
  return {
    current: meanOf(cur.map(e => e[field])),
    nCurrent: cur.length,
    previous: prev.length ? meanOf(prev.map(e => e[field])) : null,
  };
}

function detectBloatDay(entry, allEntries) {
  if (typeof entry.waist !== "number" || typeof entry.weight !== "number") return null;
  const t = new Date(entry.date).getTime();
  const prior = (allEntries || []).filter(m => {
    if (m.date === entry.date) return false;
    const mt = new Date(m.date).getTime();
    return mt < t && mt >= t - ROLLING_AVG_DAYS * DAY_MS;
  });
  const waists = prior.filter(m => typeof m.waist === "number").map(m => m.waist);
  const weights = prior.filter(m => typeof m.weight === "number").map(m => m.weight);
  if (waists.length < 2 || weights.length < 2) return null;
  const waistUp = entry.waist - meanOf(waists);
  const weightDiff = entry.weight - meanOf(weights);
  if (waistUp >= BLOAT_WAIST_DELTA_IN && Math.abs(weightDiff) <= BLOAT_WEIGHT_FLAT_LB) {
    return { waistUp, weightDiff };
  }
  return null;
}

// Counts only — a tag that shows up often can simply be common in your week,
// so this reports co-occurrence and says so, never cause.
function computeBloatPatterns() {
  const days = (state.measurements || []).filter(m => m.bloatFlag)
    .slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!days.length) return null;
  const counts = {};
  days.forEach(m => (m.bloatTags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
  const tags = Object.entries(counts).map(([tag, count]) => ({ tag, count }))
    .filter(x => x.count >= 2).sort((a, b) => b.count - a.count);
  const foods = days.filter(m => m.bloatFoods).slice(-5).reverse()
    .map(m => ({ date: m.date, text: m.bloatFoods }));
  return { total: days.length, tags, foods };
}

// Start → goal → forecast for the Body composition card. "Start" is always
// the first-ever logged weight (no separate input for it — matches how the
// rest of the app treats "first log" as the baseline everywhere else, e.g.
// the Journey stats). "Goal" is optional (state.settings.goalWeight, set in
// Settings) — without one this just reports start/current with no forecast.
// The forecast projects the 14-day trend (computeWeightTrend) forward; if
// that trend is flat or moving away from the goal, there's deliberately no
// fabricated ETA — see computeBodyFatGoalForecast for the mirrored logic.
function computeWeightGoalForecast() {
  const ms = (state.measurements || [])
    .filter(m => typeof m.weight === "number")
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!ms.length) return null;
  const start = ms[0];
  const latest = ms[ms.length - 1];
  const goal = state.settings?.goalWeight || null;
  const trend = computeWeightTrend(14);
  const out = {
    startWeight: start.weight, startDate: start.date,
    currentWeight: latest.weight, currentDate: latest.date,
    goalWeight: goal, trendLbPerWeek: trend ? trend.lbPerWeek : null,
  };
  if (goal) {
    const remaining = goal - latest.weight;
    out.remaining = remaining;
    if (Math.abs(remaining) < 0.1) {
      out.status = "reached";
    } else if (trend && Math.abs(trend.lbPerWeek) >= 0.05 && Math.sign(trend.lbPerWeek) === Math.sign(remaining)) {
      out.weeksToGoal = remaining / trend.lbPerWeek;
      out.status = "onTrack";
    } else {
      out.status = "noEta";
    }
  }
  return out;
}

// Mirrors computeWeightGoalForecast, but over body-fat % (needs neck+waist
// logged, so this naturally returns null far more often than the weight
// version — only shown once computeBodyFatTrend already has data).
function computeBodyFatGoalForecast() {
  const ms = (state.measurements || [])
    .filter(m => typeof m.bodyFatPct === "number")
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!ms.length) return null;
  const start = ms[0];
  const latest = ms[ms.length - 1];
  const goal = state.settings?.goalBodyFatPct || null;
  const trend = computeBodyFatTrend();
  const out = {
    startPct: start.bodyFatPct, startDate: start.date,
    currentPct: latest.bodyFatPct, currentDate: latest.date,
    goalPct: goal,
  };
  if (goal) {
    const remaining = goal - latest.bodyFatPct;
    out.remaining = remaining;
    if (Math.abs(remaining) < 0.1) {
      out.status = "reached";
    } else if (trend && Math.abs(trend.ptsPerWeek) >= 0.05 && Math.sign(trend.ptsPerWeek) === Math.sign(remaining)) {
      out.weeksToGoal = remaining / trend.ptsPerWeek;
      out.status = "onTrack";
    } else {
      out.status = "noEta";
    }
  }
  return out;
}

function formatWeeksFromNow(weeks) {
  const d = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// The raw pace check, with no waiting rules. Used directly only where a
// safety signal matters (isLosingTooFast). Anything that nudges the person's
// calories goes through computeMacroSuggestion() below, which holds back
// until there's a real, steady baseline.
function computeMacroSuggestionRaw(windowDays = 14) {
  const trend = computeWeightTrend(windowDays);
  if (!trend) return null;
  const { pctPerWeek, excludedFlagged } = trend;
  // Slow-and-steady recomp pace for bodyweight training: 0.25-0.5% of body
  // weight per week (about 0.5-1 lb at 200 lb). Faster than this prompts an
  // add-back, slower a trim, and both only after the 4-week baseline rules.
  const targetMin = -0.5, targetMax = -0.25; // % per week, negative = loss
  const excludedNote = excludedFlagged ? ` (excluding ${excludedFlagged} flagged day${excludedFlagged === 1 ? "" : "s"})` : "";

  if (pctPerWeek > targetMax) {
    // Losing slower than target by scale weight alone — but a stalled scale
    // with body-fat % still trending down is a recomposition (fat loss and
    // muscle gain roughly offsetting on the scale), not a real stall, and
    // cutting calories here would work against the muscle-gain side of
    // that. Check the body-fat trend (only present if neck+waist have been
    // logged at least twice) before assuming the scale number is the whole
    // story. -0.1 pts/week is a small, deliberately loose threshold — Navy
    // method tape measurements are noisy rep to rep, so this is meant to
    // catch a real trend over weeks, not react to one reading.
    const bf = computeBodyFatTrend();
    if (bf && bf.ptsPerWeek <= -0.1) {
      return {
        message: `Scale is ~flat (${Math.abs(pctPerWeek).toFixed(2)}%/week${excludedNote}), but body-fat is trending down (${bf.ptsPerWeek.toFixed(2)} pts/week, RFM method) — looks like a recomposition, not a stall. Holding macros steady rather than cutting.`,
        deltaCalories: 0,
      };
    }
    // losing slower than target (or gaining) — trim calories
    const pace = Math.abs(pctPerWeek) < 0.05 ? "Weight is flat"
      : pctPerWeek > 0 ? `Weight is trending up about ${pctPerWeek.toFixed(2)}%/week`
      : `Losing about ${Math.abs(pctPerWeek).toFixed(2)}%/week`;
    return {
      message: `${pace}${excludedNote} — slower than the ${Math.abs(targetMax)}-${Math.abs(targetMin)}% loss target range. Suggest trimming ~125 cal (from carbs).`,
      deltaCalories: -125,
    };
  }
  if (pctPerWeek < targetMin) {
    // losing faster than target — likely muscle loss risk, add calories back
    return {
      message: `Losing about ${Math.abs(pctPerWeek).toFixed(2)}%/week${excludedNote} — faster than the ${Math.abs(targetMax)}-${Math.abs(targetMin)}% target range, which risks muscle loss. Suggest adding ~125 cal back (to carbs).`,
      deltaCalories: 125,
    };
  }
  return { message: `On pace at ${Math.abs(pctPerWeek).toFixed(2)}%/week${excludedNote} — right in the ${Math.abs(targetMax)}-${Math.abs(targetMin)}% recomp target range. No change suggested.`, deltaCalories: 0 };
}

// ---- when macro suggestions are allowed ----
// Calorie targets only get a suggested change after a full 4 weeks of steady
// weigh-ins, and then at most once per 4 weeks. Week-to-week scale moves are
// mostly water, and chasing them produces a yo-yo of cutting then adding that
// is hard on both progress and your relationship with food. So: no nudges
// while the baseline is still forming, and a long pause after any change so
// it has time to show up in the trend.
const MACRO_BASELINE_DAYS = 28;
const MACRO_MIN_WEIGHINS = 20; // of those 28 days
const MACRO_NEW_PROGRAM_DAYS = 14;
function programStartMs(programId) {
  if (!programId) return null;
  const saved = state.programStartedAt && state.programStartedAt[programId];
  if (saved) { const t = new Date(saved).getTime(); if (!Number.isNaN(t)) return t; }
  const m = String(programId).match(/(\d{12,})$/);
  return m ? Number(m[1]) : null;
}
function macroSuggestionReadiness() {
  const now = Date.now();
  const cutoff = now - MACRO_BASELINE_DAYS * DAY_MS;
  const ms = (state.measurements || []).filter(m => typeof m.weight === "number");
  const inWindow = ms.filter(m => new Date(m.date + "T00:00:00").getTime() >= cutoff);
  const earliest = ms.length ? Math.min(...ms.map(m => new Date(m.date + "T00:00:00").getTime())) : null;
  const daysCovered = earliest == null ? 0 : Math.min(MACRO_BASELINE_DAYS, Math.floor((now - earliest) / DAY_MS) + 1);
  const sinceApplied = daysSinceMacroSuggestionApplied();
  if (sinceApplied !== null && sinceApplied < MACRO_BASELINE_DAYS) {
    return { ready: false, reason: "cooldown", daysCovered, weighIns: inWindow.length, daysLeft: Math.max(1, Math.ceil(MACRO_BASELINE_DAYS - sinceApplied)), sinceApplied };
  }
  // New-program settling period: a new style of training can move the scale
  // (soreness, water) for a couple of weeks without meaning anything about fat
  // loss, so calorie suggestions wait. Start date = when you tapped Use, or
  // for a program picked before this existed, the timestamp in its id.
  const startedMs = programStartMs(state.activeProgramId);
  if (startedMs != null) {
    const daysIn = (now - startedMs) / DAY_MS;
    if (daysIn >= 0 && daysIn < MACRO_NEW_PROGRAM_DAYS) {
      return { ready: false, reason: "newprogram", daysCovered, weighIns: inWindow.length, daysLeft: Math.max(1, Math.ceil(MACRO_NEW_PROGRAM_DAYS - daysIn)) };
    }
  }
  if (daysCovered < MACRO_BASELINE_DAYS || inWindow.length < MACRO_MIN_WEIGHINS) {
    return { ready: false, reason: "baseline", daysCovered, weighIns: inWindow.length };
  }
  return { ready: true, daysCovered, weighIns: inWindow.length };
}

function computeMacroSuggestion() {
  const r = macroSuggestionReadiness();
  if (!r.ready) {
    if (r.reason === "cooldown") {
      const d = Math.floor(r.sinceApplied);
      return {
        message: `Your last calorie change was ${d < 1 ? "today" : d === 1 ? "1 day ago" : d + " days ago"}. It takes about 4 weeks to show up in your trend, so nothing new is suggested yet. Next check in ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"}.`,
        deltaCalories: 0, gated: true,
      };
    }
    if (r.reason === "newprogram") {
      return {
        message: `You just started a new program. A new style of training can move the scale for a couple of weeks (soreness, water) without meaning anything about fat loss, so no calorie changes are suggested for ${r.daysLeft} more day${r.daysLeft === 1 ? "" : "s"}.`,
        deltaCalories: 0, gated: true,
      };
    }
    return {
      message: `Building your baseline: ${r.weighIns} weigh-ins over ${r.daysCovered} of ${MACRO_BASELINE_DAYS} days so far. No calorie changes are suggested until there's about 4 weeks of steady data, because day-to-day and week-to-week moves are mostly water.`,
      deltaCalories: 0, gated: true,
    };
  }
  return computeMacroSuggestionRaw(MACRO_BASELINE_DAYS);
}

async function applyMacroSuggestion(delta) {
  const t = state.settings.macroTargets;
  const caloriesBefore = t.calories || 0;
  const carbsBefore = t.carbs || 0;
  const carbDelta = Math.round(delta / 4);
  t.calories = Math.max(0, caloriesBefore + delta);
  t.carbs = Math.max(0, carbsBefore + carbDelta);
  // Record that this was acted on — computeMacroSuggestion() is purely a
  // function of the current weight trend, with no memory of its own, so
  // without this the exact same suggestion (and "Apply suggestion" button)
  // just reappeared on the very next render, letting the same ~125 cal
  // get applied repeatedly before the trend had any chance to reflect it.
  state.macroSuggestionAppliedAt = new Date().toISOString();
  // Full before/after record, not just the delta — lets undoLastMacroSuggestion
  // restore the exact prior numbers rather than re-deriving them, and lets a
  // person see exactly what changed and when instead of having to trust it
  // happened correctly. Capped at the most recent 10 so this can't grow
  // forever.
  state.macroSuggestionHistory = state.macroSuggestionHistory || [];
  state.macroSuggestionHistory.push({
    id: `macsug-${Date.now()}`,
    appliedAt: state.macroSuggestionAppliedAt,
    deltaCalories: delta,
    deltaCarbs: carbDelta,
    caloriesBefore, caloriesAfter: t.calories,
    carbsBefore, carbsAfter: t.carbs,
  });
  if (state.macroSuggestionHistory.length > 10) {
    state.macroSuggestionHistory = state.macroSuggestionHistory.slice(-10);
  }
  await persistNow();
  renderMacroSummary();
  renderWeeklyReview();
  renderMacroSuggestionHistory();
  document.getElementById("targetCalories").value = t.calories;
  document.getElementById("targetCarbs").value = t.carbs;
}

// Reverses the most recent logged application, restoring the exact
// before-values rather than re-deriving them. Only offered (see
// renderMacroSuggestionHistory) when the current targets still match that
// entry's after-values — i.e. nothing else has touched calories/carbs since
// — so this can't silently clobber a manual edit made after the fact.
async function undoLastMacroSuggestion() {
  const history = state.macroSuggestionHistory || [];
  const last = history[history.length - 1];
  if (!last) return;
  const t = state.settings.macroTargets;
  t.calories = last.caloriesBefore;
  t.carbs = last.carbsBefore;
  state.macroSuggestionHistory = history.slice(0, -1);
  // Clear the cooldown too — an undone application shouldn't count as "I
  // already decided this week," so the real suggestion can be offered again.
  const stillHasHistory = state.macroSuggestionHistory.length > 0;
  state.macroSuggestionAppliedAt = stillHasHistory
    ? state.macroSuggestionHistory[state.macroSuggestionHistory.length - 1].appliedAt
    : "";
  await persistNow();
  renderMacroSummary();
  renderWeeklyReview();
  renderMacroSuggestionHistory();
  document.getElementById("targetCalories").value = t.calories;
  document.getElementById("targetCarbs").value = t.carbs;
}

function renderMacroSuggestionHistory() {
  const el = document.getElementById("macroSuggestionHistory");
  if (!el) return;
  const history = state.macroSuggestionHistory || [];
  if (!history.length) { el.innerHTML = ""; return; }
  const last = history[history.length - 1];
  const t = state.settings.macroTargets || {};
  // Only safe to undo if nothing has changed the targets since this entry
  // was applied (a manual Save targets edit in between would make
  // "restore to caloriesBefore" wrong, since caloriesBefore predates that edit).
  const canUndo = t.calories === last.caloriesAfter && t.carbs === last.carbsAfter;
  const fmtDelta = (n) => (n > 0 ? "+" : "") + n;
  const when = new Date(last.appliedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  el.innerHTML = `
    <div class="meta" style="margin-top:4px; padding-top:10px; border-top:1px solid var(--border);">
      Last suggestion applied ${when}: ${fmtDelta(last.deltaCalories)} cal, ${fmtDelta(last.deltaCarbs)}g carbs
      (${last.caloriesBefore} → ${last.caloriesAfter} cal).
    </div>
    ${canUndo ? `<button class="danger-link mt6" id="undoMacroSuggestionBtn">Undo this</button>` : `<div class="meta mt4">(Targets changed manually since — undo disabled to avoid overwriting that.)</div>`}
  `;
  const undoBtn = document.getElementById("undoMacroSuggestionBtn");
  if (undoBtn) undoBtn.addEventListener("click", undoLastMacroSuggestion);
}

// A suggestion stays "already applied" for 7 days — one review cycle —
// regardless of how many times this renders in between, so trimming/adding
// calories can't be double-applied before the next weigh-in trend actually
// reflects the change.
function daysSinceMacroSuggestionApplied() {
  if (!state.macroSuggestionAppliedAt) return null;
  const appliedMs = new Date(state.macroSuggestionAppliedAt).getTime();
  if (Number.isNaN(appliedMs)) return null;
  return (Date.now() - appliedMs) / (24 * 60 * 60 * 1000);
}

const REASON_SUGGESTIONS = {
  "Traveling": "Cross-training and short bodyweight-only sessions travel well — lean on those when your routine is disrupted.",
  "Poor sleep": "Sleep debt affects appetite regulation and recovery — worth prioritizing wind-down when you can.",
  "Missed workout": "A shorter session beats a skipped one — even one exercise keeps the rotation moving.",
  "Missed cross-training": "A short walk still counts, even if it's not the full planned distance.",
  "Didn't track food": "Logging roughly (Quick-add/manual entry) beats not logging at all on your busiest days.",
  "Alcohol": "Alcohol adds calories and can affect sleep/recovery quality on top of that.",
  "No BM in 2+ days": "A couple of days without going adds gut weight to the scale. It usually evens out once things move, so it isn't fat gained. Fiber, water and a walk help; travel and alcohol often cause it.",
  "Stress": "Stress affects both appetite and water retention — a change here isn't necessarily fat gained or lost.",
  "Rehydrated (drank a lot of water)": "A jump after drinking a lot of water, especially if you were dehydrated, is mostly water. It usually settles in a day or two, and this day is left out of your weight trend.",
  "Illness": "Weight loss from being sick isn't the kind of progress to chase — let this one reset once you're recovered.",
  "Dehydration/low water intake": "A large drop from dehydration is water, not fat — rehydrating usually reverses it within a day or two.",
  "Big workout": "A very demanding session can shift water short-term — this should settle back within a few days.",
  "Didn't eat much": "Under-eating occasionally happens, but consistently skipping meals can work against the muscle-building side of this.",
};

function computeDaysSinceLastActivity() {
  const dates = [];
  (state.logs || []).forEach(l => dates.push(new Date(l.date)));
  (state.cardioLogs || []).forEach(c => dates.push(new Date(c.date)));
  if (!dates.length) return null;
  const mostRecent = new Date(Math.max(...dates.map(d => d.getTime())));
  const today = new Date();
  const gap = Math.floor((new Date(today.toDateString()) - new Date(mostRecent.toDateString())) / (24 * 60 * 60 * 1000));
  return gap;
}

function renderWelcomeBackBanner() {
  const el = document.getElementById("welcomeBackBanner");
  if (!el) return;
  const gap = computeDaysSinceLastActivity();
  const today = localDateStr();
  if (gap === null || gap < 3 || state.welcomeBackDismissedDate === today) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="card">
      <div class="meta" style="color:var(--text);"><strong>Welcome back.</strong> ${gap} days away — that's just life, and showing up again is the part that counts. Nothing's lost and nothing is owed: your program picks up right where you are, and today's workout is ready whenever you are.</div>
      <button class="danger-link mt6" id="dismissWelcomeBackBtn">Dismiss</button>
    </div>`;
  document.getElementById("dismissWelcomeBackBtn").addEventListener("click", async () => {
    state.welcomeBackDismissedDate = today;
    await persistNow();
    renderWelcomeBackBanner();
  });
}

// ---- streaks, journey stats, and celebrations ----
function computeStreaks() {
  const activeDays = new Set();
  (state.logs || []).forEach(l => activeDays.add(new Date(l.date).toDateString()));
  (state.cardioLogs || []).forEach(c => activeDays.add(new Date(c.date).toDateString()));
  if (!activeDays.size) return { current: 0, longest: 0 };

  let d = new Date();
  if (!activeDays.has(d.toDateString())) d.setDate(d.getDate() - 1); // today not logged yet — check from yesterday
  let current = 0;
  while (activeDays.has(d.toDateString())) {
    current++;
    d.setDate(d.getDate() - 1);
  }

  const sortedDays = [...activeDays].map(s => new Date(s)).sort((a, b) => a - b);
  let longest = 0, run = 0, prev = null;
  sortedDays.forEach(day => {
    if (prev && Math.round((day - prev) / 86400000) === 1) run++;
    else run = 1;
    longest = Math.max(longest, run);
    prev = day;
  });
  return { current, longest: Math.max(longest, current) };
}

function computeJourneyStats() {
  const totalWorkoutDays = new Set((state.logs || []).map(l => new Date(l.date).toDateString())).size;
  const totalCardioSessions = (state.cardioLogs || []).length;
  const totalCardioDistance = (state.cardioLogs || []).reduce((sum, c) => sum + (c.distance || 0), 0);
  const totalCardioMinutes = (state.cardioLogs || []).reduce((sum, c) => sum + (c.duration || 0), 0);
  const measurements = (state.measurements || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const weightChange = measurements.length >= 2 ? (measurements[measurements.length - 1].weight - measurements[0].weight) : null;
  const firstDate = measurements[0]?.date || null;
  const streaks = computeStreaks();
  return { totalWorkoutDays, totalCardioSessions, totalCardioDistance, totalCardioMinutes, weightChange, firstDate, ...streaks };
}

function pushCelebration(msg) {
  state.celebrations = state.celebrations || [];
  state.celebrations.push(msg);
}

// Called after a workout logs — checks for level-ups and workout-count milestones.
function checkWorkoutMilestones(oldLevels) {
  // Iterate whatever groups actually exist in progressLevels (push, pull,
  // legs, hinge, core, ruck) rather than a fixed list — push/pull still live
  // here too (kept in sync as the max of their h/v plane levels), so this
  // must not be scoped down to the 4-item flat-only MUSCLE_GROUPS used by
  // the Starting Level Settings UI further down.
  Object.keys(state.progressLevels || {}).forEach(mg => {
    if ((state.progressLevels[mg] || 1) > (oldLevels[mg] || 1)) {
      pushCelebration(`${mg.charAt(0).toUpperCase() + mg.slice(1)} leveled up to ${state.progressLevels[mg]}!`);
    }
  });
  const totalWorkoutDays = new Set((state.logs || []).map(l => new Date(l.date).toDateString())).size;
  const workoutMilestones = [10, 25, 50, 100, 150, 200, 250, 300, 365];
  workoutMilestones.forEach(m => {
    if (totalWorkoutDays >= m && !state.milestonesSeen.workoutDays.includes(m)) {
      state.milestonesSeen.workoutDays.push(m);
      pushCelebration(`${m} workout days logged — real consistency.`);
    }
  });
}

// Called after logging weight — checks for total-loss milestones from your first entry.
function checkWeightMilestones() {
  const measurements = (state.measurements || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  if (measurements.length < 2) return;
  const totalLoss = measurements[0].weight - measurements[measurements.length - 1].weight;
  const weightMilestones = [5, 10, 15, 20, 25, 30, 40, 50];
  weightMilestones.forEach(m => {
    if (totalLoss >= m && !state.milestonesSeen.weightLbs.includes(m)) {
      state.milestonesSeen.weightLbs.push(m);
      pushCelebration(`${m}lb down since you started — keep going.`);
    }
  });
}

function renderCelebrations() {
  const el = document.getElementById("celebrationBanner");
  if (!el) return;
  if (!state.celebrations || !state.celebrations.length) { el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="card" style="border-left-color:var(--gold);">
      ${state.celebrations.map(c => `<div class="meta" style="color:var(--text); margin-bottom:4px;">🎉 ${c}</div>`).join("")}
      <button class="danger-link mt4" id="dismissCelebrationsBtn">Dismiss</button>
    </div>`;
  document.getElementById("dismissCelebrationsBtn").addEventListener("click", async () => {
    state.celebrations = [];
    await persistNow();
    renderCelebrations();
  });
}

// Flags are the "can't be cleared until reviewed" counterpart to
// celebrations: a finding worth your attention (a macro suggestion, a
// body-fat trend) that stays pinned at the top of Today until you've
// explicitly looked at it, not something that fades on its own or gets
// buried in a tab you have to remember to open.
//
// One flag per `type` at a time. Re-upserting with the SAME message as an
// already-acknowledged flag is a no-op — if nothing's changed since you
// last reviewed it, it shouldn't nag you again. A genuinely different
// message (the suggestion flipped direction, a new trend appeared)
// un-acknowledges it, since that's new information you haven't seen yet.
// Returns whether anything actually changed, so callers only persist when
// there's something to save.
function upsertFlag(type, message, key) {
  state.flags = state.flags || [];
  const existing = state.flags.find(f => f.type === type);
  if (existing) {
    // With a key, only a real change re-raises the flag; the text can drift quietly.
    if (key !== undefined ? existing.key === key : existing.message === message) { existing.message = message; return false; }
    existing.message = message;
    existing.key = key;
    existing.date = localDateStr();
    existing.acknowledged = false;
    return true;
  }
  state.flags.push({ id: `${type}-${Date.now()}`, type, message, key, date: localDateStr(), acknowledged: false });
  return true;
}

// Removes a flag entirely once its underlying condition no longer applies
// (e.g. the macro suggestion went back to "on pace, no change") — there's
// nothing left to review, so it shouldn't linger waiting for an ack it'll
// never need.
function clearFlagType(type) {
  const before = state.flags.length;
  state.flags = (state.flags || []).filter(f => f.type !== type);
  return state.flags.length !== before;
}

// Each flag type's own card is where the real action lives (e.g. "Apply
// suggestion" on the nutrition card) — this banner used to repeat that
// card's full message verbatim with only a "Reviewed" button, which made
// tapping "Reviewed" look like it had handled the suggestion when it
// hadn't. Instead, the banner now shows a short pointer and jumps you to
// the real card; "Reviewed" still just dismisses the flag, same as before.
const FLAG_DISPLAY = {
  macroSuggestion: { label: "New nutrition suggestion — see This week", detailsId: "weeklyReviewDetails" },
  bodyFatTrend: { label: "Body-fat trend updated — see Body composition", detailsId: "bodyCompDetails" },
};

function renderFlagsBanner() {
  const el = document.getElementById("flagsBanner");
  if (!el) return;
  const unacked = (state.flags || []).filter(f => !f.acknowledged);
  if (!unacked.length) { el.classList.add("hidden"); el.innerHTML = ""; renderMorningChecklist(); return; }
  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="card" style="border-left-color:var(--danger);">
      <div class="meta" style="font-weight:600; color:var(--text); margin-bottom:6px;">⚑ Needs a look</div>
      ${unacked.map(f => {
        const display = FLAG_DISPLAY[f.type];
        const label = display ? display.label : f.message;
        return `
        <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div class="meta" data-flag-goto="${f.id}" style="color:var(--text); cursor:pointer; flex:1;">${label}${display ? " ›" : ""}</div>
          <button class="secondary" data-flag-ack="${f.id}">Reviewed</button>
        </div>`;
      }).join("")}
    </div>`;
  el.querySelectorAll("[data-flag-goto]").forEach(row => {
    row.addEventListener("click", () => {
      const flag = unacked.find(f => f.id === row.dataset.flagGoto);
      const display = flag && FLAG_DISPLAY[flag.type];
      if (!display) return;
      const target = document.getElementById(display.detailsId);
      if (!target) return;
      if ("open" in target) target.open = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  el.querySelectorAll("[data-flag-ack]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const flag = (state.flags || []).find(f => f.id === btn.dataset.flagAck);
      if (flag) flag.acknowledged = true;
      await persistNow();
      renderFlagsBanner();
    });
  });
  renderMorningChecklist();
}

// Daily check-in: a lightweight, decoupled-from-weigh-ins log of energy +
// what's going on, every day (not just on a big weight swing). Reuses the
// same reason-tag vocabulary as the weigh-in check-in rather than inventing
// a second taxonomy, plus one energy rating — this is the raw signal the
// correlation engine (Coach's Note) will eventually join against workout
// and food logs. One entry per calendar day; re-saving the same day updates
// it in place rather than creating a duplicate.
let activeDailyCheckinEnergy = null;
const activeDailyCheckinTags = new Set();

function renderDailyCheckin() {
  const tagsEl = document.getElementById("checkinTagChips");
  const energyEl = document.getElementById("checkinEnergyChips");
  const hintEl = document.getElementById("dailyCheckinSavedHint");
  if (!tagsEl || !energyEl || !hintEl) return;

  tagsEl.innerHTML = ALL_CHECKIN_TAGS.map(t => `<div class="chip" data-tag="${t}">${t}</div>`).join("");

  const today = localDateStr();
  const existing = (state.dailyCheckins || []).find(c => c.date === today);
  activeDailyCheckinTags.clear();
  activeDailyCheckinEnergy = existing ? existing.energy : null;
  (existing ? existing.tags : []).forEach(t => activeDailyCheckinTags.add(t));

  energyEl.querySelectorAll("[data-energy]").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.energy === activeDailyCheckinEnergy);
  });
  tagsEl.querySelectorAll("[data-tag]").forEach(chip => {
    chip.classList.toggle("active", activeDailyCheckinTags.has(chip.dataset.tag));
  });
  hintEl.textContent = existing ? "Saved for today — tap to update." : "";

  // Always collapsed by default — tap to open. (Previously this opened
  // itself until today's entry existed; that still left it open-by-default
  // every morning, which read as cluttered rather than collapsed.)
  const details = document.getElementById("dailyCheckinDetails");
  if (details) details.open = false;
  renderMorningChecklist();
}

// Same collapsed-by-default treatment for the weigh-in card.
function renderWeighInDetailsState() {
  const details = document.getElementById("weighInDetails");
  if (!details) return;
  details.open = false;
}

document.getElementById("checkinEnergyChips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-energy]");
  if (!chip) return;
  activeDailyCheckinEnergy = chip.dataset.energy === activeDailyCheckinEnergy ? null : chip.dataset.energy;
  document.getElementById("checkinEnergyChips").querySelectorAll("[data-energy]").forEach(c =>
    c.classList.toggle("active", c.dataset.energy === activeDailyCheckinEnergy));

  // Tapping an energy level saves today's check-in right away (no separate Save needed for it).
  document.getElementById("saveDailyCheckinBtn").click();
});

document.getElementById("checkinTagChips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-tag]");
  if (!chip) return;
  chip.classList.toggle("active");
  const tag = chip.dataset.tag;
  if (activeDailyCheckinTags.has(tag)) activeDailyCheckinTags.delete(tag);
  else activeDailyCheckinTags.add(tag);
});

// One Save for the combined "Log today" card: runs whichever of the two original
// handlers has something to save (weight typed, energy/tags picked, or an
// existing check-in that is being cleared). The originals stay in the page, hidden.
document.getElementById("logTodayBtn").addEventListener("click", () => {
  const hasWeight = document.getElementById("weightInput").value.trim() !== "";
  const today = localDateStr();
  const hasExisting = (state.dailyCheckins || []).some(c => c.date === today);
  const wantsCheckin = !!activeDailyCheckinEnergy || activeDailyCheckinTags.size > 0 || hasExisting;
  if (!hasWeight && !wantsCheckin) { document.getElementById("weightInput").focus(); return; }
  if (hasWeight) document.getElementById("logWeightBtn").click();
  if (wantsCheckin) document.getElementById("saveDailyCheckinBtn").click();
});

document.getElementById("saveDailyCheckinBtn").addEventListener("click", async () => {
  const today = localDateStr();
  const wasCleared = !activeDailyCheckinEnergy && !activeDailyCheckinTags.size;
  state.dailyCheckins = (state.dailyCheckins || []).filter(c => c.date !== today);
  if (!wasCleared) {
    state.dailyCheckins.push({ date: today, energy: activeDailyCheckinEnergy, tags: [...activeDailyCheckinTags] });
  }
  await persistNow();
  renderCoachNote();
  renderCoachTeaser();
  // Re-render last: rebuilds the chip state from what was just saved, and —
  // the actual fix here — collapses the details once today's entry exists,
  // which this handler previously never did (it only set the hint text
  // directly and left the card open regardless).
  renderDailyCheckin();
  if (wasCleared) document.getElementById("dailyCheckinSavedHint").textContent = "Cleared for today.";
});

// ---- Coach correlation engine ----
// Joins daily check-ins (energy + reason tags) against workout and food
// logs — same-day AND next-day — to find real patterns, in the spirit of
// WHOOP Journal / Built With Science+: "associated with," never "caused
// by"; every finding shows its entry counts rather than acting like a
// black-box verdict; and the evidence bar is a flat minimum-group-size (5
// days with the tag, 5 without it) rather than a fixed lookback window,
// since logging is sparser here than on a wearable — all history counts,
// not just the last 90 days.
const COACH_MIN_GROUP = 5;

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

function workoutMissedRateForDate(dateStr) {
  const dayLogs = (state.logs || []).filter(l => localDateStr(new Date(l.date)) === dateStr);
  if (!dayLogs.length) return null;
  return dayLogs.filter(l => l.result === "missed").length / dayLogs.length;
}

function proteinHitForDate(dateStr) {
  const foods = foodLogsForDate(dateStr);
  if (!foods.length) return null;
  const target = (state.settings.macroTargets || {}).protein;
  if (!target) return null;
  const totalProtein = foods.reduce((a, f) => a + (f.protein || 0), 0);
  return totalProtein >= target * 0.9 ? 1 : 0;
}

// Energy as an OUTCOME (not just a signal) — this is what actually answers
// "was my low energy tied to nutrition" the direction you asked about: a
// reason tag or missed protein on day X predicting low energy on day X (or
// X+1), rather than only the reverse (low energy predicting worse logging).
function lowEnergyForDate(dateStr) {
  const c = (state.dailyCheckins || []).find(x => x.date === dateStr);
  if (!c || !c.energy) return null;
  return c.energy === "low" ? 1 : 0;
}

function hasAnyLogOnDate(dateStr) {
  const workoutDay = (state.logs || []).some(l => localDateStr(new Date(l.date)) === dateStr);
  const foodDay = foodLogsForDate(dateStr).length > 0;
  return workoutDay || foodDay;
}

// Splits all logged check-ins into "has this signal" / "doesn't" groups for
// one outcome metric, keeping only days that actually have that outcome's
// data. Returns null when either group is below the evidence minimum.
function compareCheckinGroups(checkins, matchFn, outcomeFn) {
  const withGroup = [], withoutGroup = [];
  checkins.forEach(c => {
    const outcome = outcomeFn(c.date);
    if (outcome == null) return;
    (matchFn(c) ? withGroup : withoutGroup).push(outcome);
  });
  if (withGroup.length < COACH_MIN_GROUP || withoutGroup.length < COACH_MIN_GROUP) return null;
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  return { withAvg: avg(withGroup), withoutAvg: avg(withoutGroup), nWith: withGroup.length, nWithout: withoutGroup.length };
}

// Specifically watches for your documented real relapse pattern — travel or
// a stressful stretch leading to a multi-day logging gap — rather than
// relying on the generic tag/outcome comparisons above to happen to notice
// it. Needs at least 3 Traveling/Stress-tagged days in history, and only
// fires when at least half of those were followed by 2+ silent days in the
// next 3, so a single rough week doesn't trigger it.
function computeRelapseRisk() {
  const taggedDates = (state.dailyCheckins || [])
    .filter(c => (c.tags || []).some(t => t === "Traveling" || t === "Stress"))
    .map(c => c.date);
  if (taggedDates.length < COACH_MIN_GROUP) return null;

  let gapFollowCount = 0;
  taggedDates.forEach(d => {
    const silentDays = [1, 2, 3].filter(n => !hasAnyLogOnDate(addDays(d, n))).length;
    if (silentDays >= 2) gapFollowCount++;
  });

  const rate = gapFollowCount / taggedDates.length;
  if (rate < 0.5) return null;
  return { rate, n: taggedDates.length, gapFollowCount };
}

function computeCoachInsights() {
  const checkins = (state.dailyCheckins || []).filter(c => (c.tags && c.tags.length) || c.energy);
  const found = [];

  function addInsight(label, matchFn, outcomeFn, outcomeNoun, pctThreshold) {
    const r = compareCheckinGroups(checkins, matchFn, outcomeFn);
    if (!r) return;
    const diff = r.withAvg - r.withoutAvg;
    if (Math.abs(diff) < pctThreshold) return;
    const withPct = Math.round(r.withAvg * 100);
    const withoutPct = Math.round(r.withoutAvg * 100);
    const direction = diff > 0 ? "higher" : "lower";
    // Reuse the same physiological one-liners already written for the
    // weigh-in check-in reasons, so a finding reads as an explanation, not
    // just a bare statistic.
    const why = REASON_SUGGESTIONS[label] ? ` ${REASON_SUGGESTIONS[label]}` : "";
    found.push({
      strength: Math.abs(diff) * Math.min(r.nWith, r.nWithout),
      text: `${label} is associated with a ${direction} rate of ${outcomeNoun} (${withPct}% vs ${withoutPct}% on days without it — based on ${r.nWith} vs ${r.nWithout} logged days).${why}`,
    });
  }

  const lagged = (outcomeFn, lagDays) => (dateStr) => outcomeFn(addDays(dateStr, lagDays));

  ALL_CHECKIN_TAGS.forEach(tag => {
    const matchFn = c => (c.tags || []).includes(tag);
    addInsight(tag, matchFn, workoutMissedRateForDate, "missed reps on logged workouts", 0.15);
    addInsight(tag, matchFn, proteinHitForDate, "hitting your protein target", 0.2);
    addInsight(tag, matchFn, lagged(workoutMissedRateForDate, 1), "missed reps on the following day's workout", 0.15);
    addInsight(tag, matchFn, lagged(lowEnergyForDate, 1), "low energy the following day", 0.2);
  });
  addInsight("Low energy", c => c.energy === "low", workoutMissedRateForDate, "missed reps on logged workouts", 0.15);
  addInsight("Low energy", c => c.energy === "low", proteinHitForDate, "hitting your protein target", 0.2);

  // The relapse-pattern check is ranked above anything the generic engine
  // finds — it's tied to a struggle you've described directly, not a
  // pattern-matched coincidence, so it deserves top billing when it fires.
  const relapse = computeRelapseRisk();
  if (relapse) {
    found.push({
      strength: Infinity,
      text: `Travel or stress days have led to a 2+ day logging gap in the days right after ${Math.round(relapse.rate * 100)}% of the time (${relapse.gapFollowCount} of ${relapse.n} instances) — this looks like the pattern that's derailed your routine before. Worth lining up a lighter fallback plan before the next trip or crunch period.`,
    });
  }

  found.sort((a, b) => b.strength - a.strength);
  return { totalCheckins: checkins.length, insights: found.slice(0, 3).map(f => f.text) };
}

// Coach's Note surfaces the engine's findings once there's enough evidence;
// until then it shows a plain, honest placeholder — never a faked insight,
// and never left blank.
// Shown at the top of the Coach tab (the default/first tab) whenever there's
// no active program — otherwise a brand-new user's first launch is just
// "still gathering data" with no visible path to the one thing that actually
// gets them started. Programs lives behind a header icon, not the bottom
// nav, so this points at it explicitly rather than assuming it'll be found.
function renderStartHereBanner() {
  const el = document.getElementById("startHereBanner");
  if (!el) return;
  if (state.activeProgramId) { el.classList.add("hidden"); el.innerHTML = ""; return; }
  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="card" style="border-left-color:var(--accent);">
      <div class="meta" style="font-weight:600; color:var(--text); margin-bottom:6px;">👋 Start here</div>
      <div class="meta">Pick or build a training program to get going — generate one, or upload your own, from Programs.</div>
      <button class="secondary mt8" id="openProgramsFromStartHere">Go to Programs</button>
    </div>`;
  document.getElementById("openProgramsFromStartHere").addEventListener("click", () => {
    const programsBtn = document.getElementById("programsBtn");
    if (programsBtn) programsBtn.click();
  });
}

// A single "what's left to do this morning" checklist at the top of Coach —
// the tab Andy actually opens first thing, per his stated routine (weigh in,
// then check in, then see his day). Before this, the same three things
// (weigh-in, daily check-in, any flags needing a "Reviewed") were three
// separate collapsed cards you had to already know to check — nothing
// prompted for them as a set. Hides entirely once nothing's left for today,
// rather than sitting there as a permanent "all done" fixture.
// Today shows one thin line (only while something is pending) and the Coach tab gets a dot.
// Both disappear once everything for the day is logged.
function updatePendingIndicators(rows) {
  const chip = document.getElementById("tfPending");
  if (chip) {
    if (rows.length) {
      chip.classList.remove("hidden");
      chip.querySelector("span").textContent = rows.map(r => r.label.toLowerCase()).join(" · ") + " still to do";
    } else {
      chip.classList.add("hidden");
    }
  }
  const coachBtn = document.querySelector('nav.tabs .tab-btn[data-tab="coach"]');
  if (coachBtn) coachBtn.classList.toggle("has-dot", rows.length > 0);
  renderCoachTop(rows);
}
// Coach screen: header line, which tiles still need doing, last weight, and the week dots.
function renderCoachTop(rows) {
  const left = rows.filter(r => r.id === "clWeighIn" || r.id === "clCheckin");
  const kick = document.getElementById("tfCoachKicker");
  if (kick) {
    const d = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    kick.textContent = d + (left.length ? ` · ${left.length} check-in${left.length === 1 ? "" : "s"} left` : " · all caught up");
  }
  const wi = document.getElementById("weighInDetails"), ci = document.getElementById("dailyCheckinDetails");
  if (wi) wi.classList.toggle("tf-pend", rows.some(r => r.id === "clWeighIn"));
  if (ci) ci.classList.toggle("tf-pend", rows.some(r => r.id === "clCheckin"));
  const last = document.getElementById("tfLastWeight");
  if (last) {
    const m = (state.measurements || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date)).pop();
    if (!m) last.textContent = "Last: none yet";
    else if (m.date === localDateStr()) last.textContent = `Logged today: ${m.weight} lb`;
    else last.textContent = `Last: ${m.weight} · ${new Date(m.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    const wi = document.getElementById("weightInput");
    if (wi) wi.placeholder = !m ? "Weight" : (m.date === localDateStr() ? `Today ${m.weight}` : `Last ${m.weight}`);
  }
  const wkc = document.getElementById("tfWeekCard");
  if (wkc) wkc.innerHTML = weekStripHtml();
  renderCoachHero();
  if (typeof renderChestBoosters === "function") renderChestBoosters();
}
function renderMorningChecklist() {
  const el = document.getElementById("morningChecklist");
  if (!el) return;
  const today = localDateStr();
  const weighInPending = !(state.measurements || []).some(m => m.date === today);
  const checkinPending = !(state.dailyCheckins || []).some(c => c.date === today);
  const flagCount = (state.flags || []).filter(f => !f.acknowledged).length;

  if (!weighInPending && !checkinPending && !flagCount) {
    el.classList.add("hidden");
    el.innerHTML = "";
    updatePendingIndicators([]);
    return;
  }

  const rows = [];
  if (weighInPending) rows.push({ id: "clWeighIn", label: "Log weight" });
  if (checkinPending) rows.push({ id: "clCheckin", label: "Daily check-in" });
  if (flagCount) rows.push({ id: "clFlags", label: `${flagCount} flag${flagCount === 1 ? "" : "s"} to review` });

  updatePendingIndicators(rows);
  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="card" style="border-left-color:var(--accent);">
      <div class="meta" style="font-weight:600; color:var(--text); margin-bottom:6px;">Still to do today</div>
      ${rows.map(r => `<div class="meta" id="${r.id}" style="cursor:pointer; padding:4px 0; display:flex; justify-content:space-between; align-items:center;"><span>${r.label}</span><span aria-hidden="true">›</span></div>`).join("")}
    </div>`;

  const goTo = (targetId, open) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (open && "open" in target) target.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const weighInRow = document.getElementById("clWeighIn");
  if (weighInRow) weighInRow.addEventListener("click", () => goTo("weighInDetails", true));
  const checkinRow = document.getElementById("clCheckin");
  if (checkinRow) checkinRow.addEventListener("click", () => goTo("dailyCheckinDetails", true));
  const flagsRow = document.getElementById("clFlags");
  if (flagsRow) flagsRow.addEventListener("click", () => goTo("flagsBanner", false));
}

document.getElementById("tfPending").addEventListener("click", () => {
  const coachBtn = document.querySelector('nav.tabs .tab-btn[data-tab="coach"]');
  if (coachBtn) coachBtn.click();
});
// Kettlebell progression hints, from two sources: how each bell exercise went
// in your last few sessions (max / ok / missed), and a few plain words in your
// open notes. Deliberately conservative: reps first, a heavier bell only after
// three straight top-rep sessions, and presses get extra patience because the
// next bell size up is a big jump for them. The plan is to stay on one bell for
// the whole 12 weeks: until the final week the Coach only ever says "add reps",
// and the get-up (a skill lift) never prompts a bigger bell at all.
// Suggested target + optional tempo tip for one kettlebell move, shown on the
// set screen and in the exercise sheet. Advice only: it never changes the
// prescription and never suggests fewer reps. Uses the last logged results
// (and the actual reps, for sessions logged from now on).
const BELL_TEMPO_TIPS = [
  [/floor press/i, "3-second lowering, 1-second pause with the elbow on the floor."],
  [/press/i, "press up as normal, then a slow 3-second lowering."],
  [/goblet|squat/i, "3-second lowering with a 1-second pause at the bottom."],
  [/lunge/i, "slow 3-second lowering on every rep."],
  [/romanian|rdl|deadlift/i, "3-second lowering, brief pause just off the floor."],
  [/row/i, "squeeze for 1 second at the top, then a 3-second lowering."],
  [/get-up/i, "pause 1 to 2 seconds in each position."],
];
function bellTargetHint(name, repsStr) {
  if (!isBellExercise(name)) return null;
  const logs = (state.logs || []).filter(l => l.exercise === name).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-3);
  if (!logs.length) return null;
  const last = logs[logs.length - 1];
  const twoMax = logs.length >= 2 && logs.slice(-2).every(l => l.result === "max");
  const hold = isHoldExercise(name);
  const r = parseRepRange(repsStr || "");
  const top = r.max || r.min || 0;
  const unit = hold ? "s" : " reps";
  const lastTxt = last.actuals && last.actuals.length ? `Last time: ${last.actuals.join(", ")}. ` : "";
  let line, tip = null;
  if (last.result === "missed") {
    line = `${lastTxt}Same target again. Hit it before adding anything.`;
  } else if (twoMax) {
    if (/get-up/i.test(name)) line = `${lastTxt}You've topped it twice. Add a rep, or slow it down.`;
    else if (hold) line = `${lastTxt}You've topped it twice. Try ${top + 5}s.`;
    else line = `${lastTxt}You've topped it twice. Try ${top + 1} to ${top + 2} per set.`;
    const t = !hold && BELL_TEMPO_TIPS.find(([re]) => re.test(name));
    if (t) tip = `Or keep the reps and make them harder: ${t[1]}`;
  } else if (last.result === "max") {
    line = `${lastTxt}You hit the top last time. One more clean session, then add.`;
  } else {
    line = `${lastTxt}Aim for the full ${top}${unit} on every set.`;
  }
  return { line, tip };
}
function bellHintHtml(name, repsStr) {
  const h = bellTargetHint(name, repsStr);
  if (!h) return "";
  return `<div class="tf-hint"><b>Target</b> ${escapeHtml(h.line)}${h.tip ? `<div class="t">${escapeHtml(h.tip)}</div>` : ""}</div>`;
}
const BELL_NEXT_SIZE = "44 lb (20 kg)";
function computeBellCoach() {
  const bell = new Set((exercises || []).filter(e => e.equipment === "kettlebell").map(e => e.name));
  const byEx = {};
  (state.logs || []).forEach(l => { if (bell.has(l.exercise)) (byEx[l.exercise] = byEx[l.exercise] || []).push(l); });
  const out = [], light = [], lightPress = [];
  const kbProg = (programs || []).find(p => p.id === state.activeProgramId);
  const lateProgram = !!(kbProg && kbProg.structure && computeWeekNumber(kbProg) >= 12);
  Object.entries(byEx).forEach(([name, logs]) => {
    logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = logs.slice(-3).map(l => l.result);
    const hold = isHoldExercise(name);
    // The per-move "missed" / "top reps twice" lines now live in the Target box
    // on each set screen, so this card only speaks up for the bigger-bell prompt
    // and your notes.
    if (last[last.length - 1] === "missed") {
      // nothing here: the Target box says "same target again"
    } else if (last.length >= 3 && last.every(r => r === "max") && lateProgram && !/get-up/i.test(name)) {
      (/press/i.test(name) ? lightPress : light).push(name);
    }
  });
  if (light.length) out.unshift(`You've hit top reps three sessions running on ${light.join(", ")}. The 35 lb bell is getting light for those; the next size up is ${BELL_NEXT_SIZE}.`);
  if (lightPress.length) out.push(`${lightPress.join(", ")}: top reps three sessions running. Before a heavier bell, try 5 reps per side with a slow 3-second lowering. The next size is a big jump for pressing.`);
  // Open notes: a few plain words only. Anything else, ask Claude to read them.
  (state.sessionNotes || []).filter(n => !n.done).forEach(n => {
    const t = String(n.text || "").toLowerCase();
    const where = n.context ? ` (${n.context})` : "";
    if (/\b(hurt|hurts|pain|painful|sharp|pinch|pinches|tweak|tweaked)\b/.test(t)) out.push(`Your note${where} mentions pain. Back off that move, check your form, and if it keeps happening, get it looked at.`);
    else if (/\b(too easy|easy|light|boring|breeze)\b/.test(t)) out.push(`Your note${where} says it felt easy. Add reps first and keep the same bell for now.`);
    else if (/\b(too heavy|heavy|hard|struggl\w*|sloppy|shaky|grind\w*)\b/.test(t)) out.push(`Your note${where} says it felt hard. Hold the same reps and bell until they feel smooth.`);
  });
  return out;
}
function tfInsightList(items, bright) {
  if (!items.length) return "";
  const row = (t) => `<div class="tf-ins"><i></i><span>${t}</span></div>`;
  const first = items.slice(0, 2).map(row).join("");
  const rest = items.slice(2);
  return first + (rest.length ? `<details class="tf-insmore"><summary>${rest.length} more</summary>${rest.map(row).join("")}</details>` : "");
}
function renderBellCoach() {
  const card = document.getElementById("bellCoachCard"), el = document.getElementById("bellCoach");
  if (!card || !el) return;
  const hints = computeBellCoach();
  if (!hints.length) { card.classList.add("hidden"); el.innerHTML = ""; return; }
  card.classList.remove("hidden");
  el.innerHTML = tfInsightList(hints.map(h => escapeHtml(h)), true) +
    `<div class="meta" style="font-size:12px;">Based on your logged results and a few words in your open notes (easy, heavy, pain). Ask Claude to read your notes for anything more.</div>`;
}

function renderCoachNote() {
  renderBellCoach();
  const el = document.getElementById("coachNote");
  if (!el) return;
  const card = document.getElementById("coachNoteCard");
  const result = computeCoachInsights();
  result.insights = coachExtraInsights().concat(result.insights || []);
  // "Got it" hides the card for a week. Keyed on the findings with their
  // numbers stripped: the same findings stay quiet as counts tick up, while
  // a different finding (or a week passing) brings the card back.
  const key = result.insights.length
    ? result.insights.map(i => String(i).replace(/[0-9.%]+/g, "#")).join("|")
    : "placeholder";
  const dis = state.coachNoteDismissed;
  if (card) {
    if (dis && dis.key === key && Date.now() - dis.at < 7 * 24 * 60 * 60 * 1000) {
      card.classList.add("hidden");
      return;
    }
    card.classList.remove("hidden");
  }
  const body = result.insights.length
    ? tfInsightList(result.insights, false)
    : `<div class="meta">${
        result.totalCheckins === 0
          ? "Still gathering enough days to spot real patterns — check back once you've logged a few daily check-ins."
          : `Logged ${result.totalCheckins} daily check-in${result.totalCheckins === 1 ? "" : "s"} so far — keep going and patterns will start showing up here once there's enough matched data (roughly 5 days with and without a given reason).`
      }</div>`;
  el.innerHTML = body + `<button class="tf-clamp-btn mt6" id="dismissCoachNote">Got it, hide for a week</button>`;
  document.getElementById("dismissCoachNote").addEventListener("click", async () => {
    state.coachNoteDismissed = { key, at: Date.now() };
    if (card) card.classList.add("hidden");
    await persistNow();
  });
}

// A condensed teaser on Today surfacing the single strongest Coach finding,
// so it's seen where attention already is instead of only existing inside
// a tab you have to remember to open. Deliberately only appears once there
// is a real, evidence-backed finding — unlike the Coach tab itself, this
// does NOT show the "still gathering data" placeholder here, to avoid
// nagging with an empty-handed banner every day before there's anything to
// say. Can be dismissed with "Got it" (hidden for a week, or until a
// different finding comes up) since it otherwise shows every day.
function renderCoachTeaser() {
  const el = document.getElementById("coachTeaser");
  if (!el) return;
  const result = computeCoachInsights();
  if (!result.insights.length) { el.classList.add("hidden"); el.innerHTML = ""; return; }
  // Dismissed for a week. Keyed on the finding with its numbers stripped, so
  // the same finding stays quiet as its counts tick up, and a different
  // finding (or a week passing) brings the card back.
  const insightKey = String(result.insights[0]).replace(/[0-9.%]+/g, "#");
  const dis = state.coachTeaserDismissed;
  if (dis && dis.key === insightKey && Date.now() - dis.at < 7 * 24 * 60 * 60 * 1000) {
    el.classList.add("hidden"); el.innerHTML = ""; return;
  }
  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="card" style="border-left-color:var(--accent);">
      <div class="meta" style="font-weight:600; color:var(--text); margin-bottom:6px;">🧠 Coach found something</div>
      <div class="meta" style="color:var(--text);">${result.insights[0]}</div>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="secondary fx1" id="openCoachFromTeaser">See Coach tab</button>
        <button class="secondary fx1" id="dismissCoachTeaser">Got it</button>
      </div>
    </div>`;
  document.getElementById("dismissCoachTeaser").addEventListener("click", async () => {
    state.coachTeaserDismissed = { key: insightKey, at: Date.now() };
    el.classList.add("hidden"); el.innerHTML = "";
    await persistNow();
  });
  document.getElementById("openCoachFromTeaser").addEventListener("click", () => {
    const coachBtn = document.querySelector('.tab-btn[data-tab="coach"]');
    if (coachBtn) coachBtn.click();
  });
}

// Split by check-in direction instead of lumping every logged reason
// together under one hardcoded "upticks" header — that previously mixed
// reasons for weight INCREASES in with the overall weekly number even when
// the net trend for the week was a loss, which reads as contradictory
// (e.g. "losing too fast" next to "upticks linked to: poor sleep, alcohol…"
// with nothing explaining the loss itself). A day-to-day drop only ever
// prompts a check-in if it's a >=1.5% single-day move, so smaller drops that
// add up to the week's trend often have no logged reason at all — up and
// down are reported separately now so that gap is visible instead of hidden.
function computeWeightCheckInSummary() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = (state.measurements || []).filter(m => new Date(m.date).getTime() >= weekAgo && m.reasons && m.reasons.length);
  if (!recent.length) return null;
  const countsByDir = { up: {}, down: {} };
  recent.forEach(m => {
    const dir = m.checkInDirection === "down" ? "down" : "up";
    m.reasons.forEach(r => { countsByDir[dir][r] = (countsByDir[dir][r] || 0) + 1; });
  });
  const toSorted = counts => Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, suggestion: REASON_SUGGESTIONS[reason] || "" }));
  const up = toSorted(countsByDir.up);
  const down = toSorted(countsByDir.down);
  if (!up.length && !down.length) return null;
  return { up, down };
}

// Long-term view across ALL history, not just this week — a reason only
// counts as a "pattern" once it's shown up more than once, so a single
// one-off mention doesn't get over-weighted.
function computeReasonPatterns() {
  const all = (state.measurements || []).filter(m => m.reasons && m.reasons.length);
  if (!all.length) return null;
  const byReason = {};
  all.forEach(m => {
    const dir = m.checkInDirection === "down" ? "down" : "up";
    m.reasons.forEach(r => {
      if (!byReason[r]) byReason[r] = { up: 0, down: 0 };
      byReason[r][dir]++;
    });
  });
  const patterns = Object.entries(byReason)
    .map(([reason, counts]) => ({ reason, ...counts, total: counts.up + counts.down }))
    .filter(p => p.total >= 2)
    .sort((a, b) => b.total - a.total);
  return patterns.length ? patterns : null;
}

// Capped to a handful by default (this list only ever grows as more reasons
// repeat across your weigh-in history, never shrinks) — tap the hint to see
// the rest, same tap-to-expand pattern as everything else on this tab.
const REASON_PATTERNS_COLLAPSED_COUNT = 3;
let reasonPatternsOpen = false;
function renderReasonPatterns() {
  const el = document.getElementById("reasonPatterns");
  const hintEl = document.getElementById("reasonPatternsHint");
  const patterns = computeReasonPatterns();
  if (!patterns) {
    el.innerHTML = '<div class="empty">Not enough repeated reasons yet to spot a pattern.</div>';
    hintEl.textContent = "";
    return;
  }
  const shown = reasonPatternsOpen ? patterns : patterns.slice(0, REASON_PATTERNS_COLLAPSED_COUNT);
  el.innerHTML = shown.map(p => {
    const parts = [];
    if (p.up) parts.push(`${p.up}× upticks`);
    if (p.down) parts.push(`${p.down}× big drops`);
    return `<div class="list-item"><div><div class="name">${p.reason}</div><div class="meta">${parts.join(" · ")}</div></div></div>`;
  }).join("");
  hintEl.textContent = patterns.length > REASON_PATTERNS_COLLAPSED_COUNT
    ? (reasonPatternsOpen ? "Show fewer" : `See all ${patterns.length} patterns`)
    : "";
}
document.getElementById("reasonPatternsHint").addEventListener("click", () => {
  reasonPatternsOpen = !reasonPatternsOpen;
  renderReasonPatterns();
});

let weeklyReviewLogsOpen = false;
function tfRing(frac, center, label, color, size) {
  const r = 30, C = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
  size = size || 78;
  return `<svg width="${size}" height="${size}" viewBox="0 0 76 76" role="img" aria-label="${escapeHtml(label)}"><circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="7"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${color || "var(--accent)"}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - f)).toFixed(1)}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" font-family="Big Shoulders Display, sans-serif" font-size="15" font-weight="600" fill="var(--text)">${escapeHtml(center)}</text></svg>`;
}
function tfBarRows(items, cls) {
  const max = Math.max(1, ...items.map(c => c.count));
  return `<div class="tf-bars">${items.map(c => `<details class="tf-bar ${cls || ""}"><summary><div class="bt"><span>${escapeHtml(c.reason)}</span><b>${c.count}×</b></div><div class="tr"><i style="width:${Math.round((c.count / max) * 100)}%"></i></div></summary>${c.suggestion ? `<div class="bd">${escapeHtml(c.suggestion)}</div>` : ""}</details>`).join("")}</div>`;
}
function tfClampText(el) {
  if (!el) return;
  const old = el.nextElementSibling && el.nextElementSibling.classList.contains("tf-clamp-btn") ? el.nextElementSibling : null;
  if (old) old.remove();
  el.classList.remove("tf-clamp");
  if (el.scrollHeight < 1) return;
  el.classList.add("tf-clamp");
  if (el.scrollHeight - el.clientHeight < 4) { el.classList.remove("tf-clamp"); return; }
  const b = document.createElement("button"); b.type = "button"; b.className = "tf-clamp-btn"; b.textContent = "Read more";
  b.addEventListener("click", () => { const c = el.classList.toggle("tf-clamp"); b.textContent = c ? "Read more" : "Show less"; });
  el.after(b);
}
function renderWeeklyReview() {
  const el = document.getElementById("weeklyReview");
  const program = programs.find(p => p.id === state.activeProgramId);
  const weekNumber = computeWeekNumber(program);
  let phaseLabel = "no active program";
  let deloadNote = "";
  if (program) {
    const { phase } = currentPhaseFor(program);
    phaseLabel = phase?.phase || "n/a";
    if (phase?.deload_weeks?.includes(weekNumber)) deloadNote = " · deload week";
  }

  const wi = computeWeeklyIntake();
  const weeklyIntakeLine = wi.counted >= 3
    ? `<div class="meta mb6">7-day average intake: ${wi.avg} cal/day${state.settings?.macroTargets?.calories ? ` (target ${state.settings.macroTargets.calories})` : ""} · ${wi.counted} of 7 days counted.</div>`
    : "";
  let paceLine = `Week ${weekNumber} · ${phaseLabel}${deloadNote}`;
  let paceNote = "";
  if (program) {
    const pace = getProgramPace(program);
    if (pace.mode === "count") {
      const total = totalProgramWorkouts(program);
      if (pace.completed >= total) {
        paceLine = `${total} of ${total} workouts done · ${phaseLabel}`;
        paceNote = "Program complete. Nice work. Generate a new one whenever you're ready.";
      } else {
        paceLine = `Workout ${pace.completed + 1} of ${total} · Week ${weekNumber} · ${phaseLabel}${deloadNote}`;
        paceNote = `${pace.completed} completed so far. Paced by workouts, not the calendar.`;
      }
    }
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentLogs = (state.logs || []).filter(l => new Date(l.date).getTime() >= weekAgo);
  const counts = { max: 0, hold: 0, missed: 0 };
  recentLogs.forEach(l => { if (counts[l.result] !== undefined) counts[l.result]++; });

  const suggestion = computeMacroSuggestion();
  const daysSinceApplied = daysSinceMacroSuggestionApplied();
  const checkInSummary = computeWeightCheckInSummary();

  // Any suggestion that isn't the plain "on pace, no change" default is
  // worth flagging for an explicit review — a calorie change either
  // direction, or the recomposition override, both count. "On pace" and
  // "not enough data yet" aren't actionable, so they clear any stale flag
  // instead of creating one.
  const suggestionIsNotable = suggestion && (suggestion.deltaCalories !== 0 || suggestion.message.includes("recomposition"));
  // Calorie-target suggestions are on hold until the Nov 17 review (the card says so),
  // so no flag until then. After that, a flag re-raises only when the suggestion itself
  // changes (the direction/size), not every morning when a daily average in the text moves.
  const holdingSuggestions = localDateStr() < "2026-11-17";
  const flagKey = suggestionIsNotable ? `${suggestion.deltaCalories}|${suggestion.message.includes("recomposition")}` : "";
  const flagChanged = (suggestionIsNotable && !holdingSuggestions)
    ? upsertFlag("macroSuggestion", suggestion.message, flagKey)
    : clearFlagType("macroSuggestion");
  if (flagChanged) { persistNow(); renderFlagsBanner(); }

  // Display is the card deck (one place for the whole weekly review).
  try { renderWeekClose(); } catch (e) { el.innerHTML = '<div class="empty">Could not build the review.</div>'; }
}

// ---- Insight engine: why did the scale move, blind spots, and the weekly close-out ----
// Nothing here removes or hides a weigh-in. It reads your own logs and weights and explains them.
const ALCOHOL_RE = /\b(beers?|bourbon|bulleit|whiskey|whisky|vodka|wine|tequila|margarita|cocktail|saint arnold|ipa|lager|ale|rum|gin|shots?|mezcal|champagne|martini|old fashioned|bud light|miller|coors|modelo|corona|white claw)\b/i;
const SALTY_RE = /\b(pizza|wings?|wingstop|fries|burger|tacos?|lasagna|ramen|bbq|restaurant|takeout|nachos|queso|fried|chick-fil-a|mcdonald'?s|chipotle|sushi|pho)\b/i;
function isAlcoholEntry(f) { return !!f.alcohol || ALCOHOL_RE.test(f.name || ""); }
function addDaysStr(ds, n) { const d = new Date(ds + "T12:00:00"); d.setDate(d.getDate() + n); return localDateStr(d); }
function dayInfo(ds) {
  const o = { n: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, alc: 0, salty: 0 };
  foodLogsForDate(ds).forEach(f => {
    const c = f.calories || 0;
    o.n++; o.kcal += c; o.protein += f.protein || 0; o.carbs += f.carbs || 0; o.fat += f.fat || 0;
    if (isAlcoholEntry(f)) o.alc += c;
    if (SALTY_RE.test(f.name || "")) o.salty += c;
  });
  return o;
}
function sortedWeights() { return (state.measurements || []).filter(m => m.weight > 0).slice().sort((a, b) => a.date.localeCompare(b.date)); }
function daysBetween(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }
function findJumps(minLb = 1.5) {
  const ms = sortedWeights(), out = [];
  for (let i = 1; i < ms.length; i++) {
    const gap = daysBetween(ms[i - 1].date, ms[i].date), d = ms[i].weight - ms[i - 1].weight;
    if (gap <= 3 && d >= minLb) out.push({ i, date: ms[i].date, delta: d, base: ms[i - 1].weight });
  }
  return out;
}
function jumpClearDays(j) {
  const ms = sortedWeights();
  for (let k = j.i + 1; k < ms.length; k++) if (ms[k].weight <= j.base + 0.8) return Math.max(1, daysBetween(ms[j.i].date, ms[k].date));
  return null;
}
function jumpFacts(date) {
  const ms = sortedWeights(), i = ms.findIndex(m => m.date === date);
  if (i < 1) return null;
  const cur = ms[i], prev = ms[i - 1], delta = cur.weight - prev.weight;
  if (delta < 1.5 || daysBetween(prev.date, cur.date) > 3) return null;
  const a = dayInfo(addDaysStr(date, -1)), b = dayInfo(addDaysStr(date, -2));
  const usual = [];
  for (let k = 3; k <= 16; k++) { const ds = addDaysStr(date, -k), di = dayInfo(ds); if (di.n >= 3 && !isDayMarkedPartial(ds)) usual.push(di); }
  const avg = f => usual.length ? usual.reduce((s, x) => s + x[f], 0) / usual.length : null;
  const uKcal = avg("kcal"), uCarb = avg("carbs");
  const lines = [], causes = [], parts = [];
  const alc = a.alc + b.alc, salty = Math.max(a.salty, b.salty);
  if (!a.n && !b.n) {
    lines.push("Nothing was logged the two days before, so I can't say what drove it. A rough total still counts.");
  } else {
    if (uKcal != null && a.kcal > 0) {
      const fat = Math.max(0, a.kcal - uKcal) / 3500;
      lines.push(`Calories the day before: ${Math.round(a.kcal).toLocaleString()} vs your usual ${Math.round(uKcal).toLocaleString()}. That is at most about ${fat.toFixed(1)} lb of fat, so most of a ${delta.toFixed(1)} lb jump is water and gut contents, not fat.`);
    }
    if (alc >= 300) { causes.push(`Alcohol: about ${Math.round(alc)} cal in the last 2 days. It dehydrates you, then you hold water to compensate.`); parts.push(`alcohol (about ${Math.round(alc)} cal)`); }
    if (salty >= 600) { causes.push(`Salty or restaurant food (about ${Math.round(salty)} cal). Sodium makes you hold water.`); parts.push(`salty food (about ${Math.round(salty)} cal)`); }
    if (uCarb != null && a.carbs >= 200 && a.carbs >= uCarb * 1.25) { causes.push(`Carbs ${Math.round(a.carbs)} g vs your usual ${Math.round(uCarb)} g. Each gram of stored carb holds about 3 g of water.`); parts.push("extra carbs"); }
    if (!causes.length) causes.push("Nothing in your logs stands out. That usually points to gut contents, sleep, or sodium that wasn't logged.");
  }
  const tags = (cur.reasons || []).filter(r => r !== WATER_REASON);
  if (tags.length) causes.push("You tagged: " + tags.join(", ") + (cur.waterOz ? ` and about ${cur.waterOz} oz of water` : "") + ".");
  else if ((cur.reasons || []).includes(WATER_REASON)) causes.push("You tagged lots of water" + (cur.waterOz ? ` (about ${cur.waterOz} oz)` : "") + ".");
  const cleared = findJumps().filter(j => j.date < date).map(jumpClearDays).filter(x => x != null).sort((x, y) => x - y);
  let med = null;
  if (cleared.length >= 2) {
    med = cleared[Math.floor(cleared.length / 2)];
    lines.push(`Your last ${cleared.length} jumps like this cleared in about ${med} day${med === 1 ? "" : "s"}. Expect to be back near ${prev.weight} lb by ${formatDateOnly(addDaysStr(date, med))}. If it is still ${(prev.weight + 0.8).toFixed(1)} or higher on ${formatDateOnly(addDaysStr(date, 4))}, treat it as real and we look closer.`);
  }
  const short = `Up ${delta.toFixed(1)} lb is most likely water, not fat${parts.length ? ": " + parts.join(" and ") + " in the last 2 days" : ""}.${med ? ` Your last jumps like this cleared in about ${med} day${med === 1 ? "" : "s"}.` : ""}`;
  return { delta, lines, causes, short };
}
function explainJump(date) {
  const f = jumpFacts(date);
  if (!f) return null;
  return `<div style="font-weight:600; margin-bottom:4px;">Up ${f.delta.toFixed(1)} lb: what likely happened</div>` +
    f.lines.map(l => `<div class="mt6">${escapeHtml(l)}</div>`).join("") +
    f.causes.map(l => `<div class="mt6">• ${escapeHtml(l)}</div>`).join("");
}
function coachExtraInsights() {
  const out = [];
  try {
    const ms = sortedWeights(), last = ms[ms.length - 1];
    if (last && daysBetween(last.date, localDateStr()) <= 1) { const f = jumpFacts(last.date); if (f) out.push(f.short); }
    computeBlindSpots().slice(0, 2).forEach(x => out.push(x.text));
  } catch (e) {}
  return out;
}
function computeBlindSpots() {
  const ms = sortedWeights(), pairs = [];
  for (let i = 1; i < ms.length; i++) {
    if (daysBetween(ms[i - 1].date, ms[i].date) !== 1) continue;
    const ds = ms[i - 1].date, di = dayInfo(ds);
    if (di.n < 3 || isDayMarkedPartial(ds)) continue;
    pairs.push({ delta: ms[i].weight - ms[i - 1].weight, di });
  }
  if (pairs.length < 12) return [];
  const carbs = pairs.map(p => p.di.carbs).sort((x, y) => x - y);
  const carbCut = Math.max(200, carbs[Math.floor(carbs.length * 0.75)]);
  const tests = [
    ["300+ alcohol calories", p => p.di.alc >= 300],
    [`${carbCut}+ g of carbs`, p => p.di.carbs >= carbCut],
    ["2,400+ calories", p => p.di.kcal >= 2400],
    ["700+ calories of salty or restaurant food", p => p.di.salty >= 700],
  ];
  const out = [];
  tests.forEach(([label, fn]) => {
    const yes = pairs.filter(fn).map(p => p.delta), no = pairs.filter(p => !fn(p)).map(p => p.delta);
    if (yes.length < 4 || no.length < 4) return;
    const diff = meanOf(yes) - meanOf(no);
    if (diff >= 0.3) out.push({ diff, text: `After days with ${label}, your next-morning weight runs ${diff.toFixed(1)} lb higher than after other days (${yes.length} days).` });
  });
  return out.sort((x, y) => y.diff - x.diff);
}

// ---- Close the week ----
let weekCloseOffset = null;
let weekCloseStep = 0;
function weekDayList(offset) {
  const now = new Date(), mon = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return localDateStr(d); });
}
function tfDonut(slices, centerTop, centerBottom) {
  const total = slices.reduce((s, x) => s + x.v, 0);
  const r = 46, C = 2 * Math.PI * r;
  let off = 0, arcs = "";
  slices.forEach(s => {
    if (s.v <= 0 || !total) return;
    const len = (s.v / total) * C;
    arcs += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${s.c}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"/>`;
    off += len;
  });
  return `<svg width="132" height="132" viewBox="0 0 120 120" role="img" aria-label="Calories by source"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="16"/>${arcs}<text x="60" y="58" text-anchor="middle" font-family="Big Shoulders Display, sans-serif" font-size="19" font-weight="600" fill="var(--text)">${escapeHtml(centerTop)}</text><text x="60" y="74" text-anchor="middle" font-size="9" fill="var(--text-faint-2)">${escapeHtml(centerBottom)}</text></svg>`;
}
function renderWeekClose() {
  const el = document.getElementById("weeklyReview");
  if (!el) return;
  const today = localDateStr();
  if (weekCloseOffset === null) weekCloseOffset = ((new Date().getDay() + 6) % 7) === 0 ? -1 : 0;
  const days = weekDayList(weekCloseOffset), elapsed = days.filter(d => d <= today);
  const complete = elapsed.length === 7;
  const budget = state.settings?.weeklyCalBudget || DEFAULT_WEEK_BUDGET;
  const t = state.settings?.macroTargets || {};
  const infos = elapsed.map(d => ({ d, ...dayInfo(d) }));
  const loggedDays = infos.filter(x => x.n > 0);
  const unlogged = infos.filter(x => x.n === 0 && x.d !== today);
  const total = infos.reduce((s, x) => s + x.kcal, 0);
  // Calories by source. Alcohol is its own slice; entries logged with calories but no macros show as "Unsorted".
  const src = { protein: 0, carbs: 0, fat: 0, alcohol: 0, unsorted: 0 };
  days.forEach(d => foodLogsForDate(d).forEach(f => {
    const cal = f.calories || 0;
    if (isAlcoholEntry(f)) { src.alcohol += cal; return; }
    let p = 4 * (f.protein || 0), c = 4 * (f.carbs || 0), fa = 9 * (f.fat || 0);
    const m = p + c + fa;
    if (m > cal && m > 0) { const k = cal / m; p *= k; c *= k; fa *= k; }
    src.protein += p; src.carbs += c; src.fat += fa; src.unsorted += Math.max(0, cal - (p + c + fa));
  }));
  const slices = [
    { k: "Protein", v: src.protein, c: "var(--accent)" }, { k: "Carbs", v: src.carbs, c: "var(--warn)" },
    { k: "Fat", v: src.fat, c: "var(--fat)" }, { k: "Alcohol", v: src.alcohol, c: "var(--danger)" }, { k: "Unsorted", v: src.unsorted, c: "var(--text-dim)" },
  ];
  const sTot = slices.reduce((s, x) => s + x.v, 0) || 1;
  const legend = slices.filter(s => s.v > 0).map(s => `<div style="display:flex; align-items:center; gap:8px; font-size:13px; margin:3px 0;"><i style="width:10px; height:10px; border-radius:3px; background:${s.c}; display:inline-block;"></i><span class="fx1">${s.k}</span><b style="font-family:var(--font-mono); font-weight:500;">${Math.round(s.v).toLocaleString()}</b><span class="meta" style="width:36px; text-align:right;">${Math.round(s.v / sTot * 100)}%</span></div>`).join("");
  const wkLogs = (state.logs || []).filter(l => days.includes(dayKeyOf(l.date)));
  const workoutDays = new Set(wkLogs.map(l => dayKeyOf(l.date))).size;
  const wkCardio = (state.cardioLogs || []).filter(c => days.includes(dayKeyOf(c.date)));
  const cardioMin = wkCardio.reduce((s, c) => s + (c.duration || 0), 0), cardioDist = wkCardio.reduce((s, c) => s + (c.distance || 0), 0);
  const goal = state.settings?.weeklyWorkoutGoal || 3;
  const prevDays = weekDayList(weekCloseOffset - 1);
  const wIn = ds => sortedWeights().filter(m => ds.includes(m.date)).map(m => m.weight);
  const wNow = wIn(days), wPrev = wIn(prevDays);
  const avgNow = wNow.length ? meanOf(wNow) : null, avgPrev = wPrev.length ? meanOf(wPrev) : null;
  const jumps = findJumps().filter(j => days.includes(j.date));
  const proteinAvg = loggedDays.length ? loggedDays.reduce((s, x) => s + x.protein, 0) / loggedDays.length : 0;
  const alcPct = total ? src.alcohol / total : 0;
  const dayName = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
  const right = [], wrong = [], attn = [];
  if (elapsed.length >= 3 && !unlogged.length) right.push(`Logged every day (${loggedDays.length} of ${elapsed.length}).`);
  if (t.protein && loggedDays.length >= 3 && proteinAvg >= t.protein * 0.9) right.push(`Protein averaged ${Math.round(proteinAvg)} g against a ${t.protein} g target.`);
  if (workoutDays >= goal) right.push(`${workoutDays} workout day${workoutDays === 1 ? "" : "s"}, goal was ${goal}.`);
  if (wkCardio.length) right.push(`${wkCardio.length} cardio or walk session${wkCardio.length === 1 ? "" : "s"}${cardioMin ? `, ${Math.round(cardioMin)} min` : ""}.`);
  if (complete && total > 0 && total <= budget) right.push(`Calories came in at ${Math.round(total).toLocaleString()} of your ${budget.toLocaleString()} budget.`);
  if (avgNow != null && avgPrev != null && avgNow < avgPrev - 0.2) right.push(`Your average weight is down ${(avgPrev - avgNow).toFixed(1)} lb from the week before.`);
  if (elapsed.length >= 5 && !jumps.length && wNow.length >= 3) right.push("No big overnight jumps on the scale.");
  if (unlogged.length) wrong.push(`${unlogged.length} day${unlogged.length === 1 ? "" : "s"} with nothing logged (${unlogged.map(x => dayName(x.d)).join(", ")}). A rough total counts.`);
  if (complete && total > budget) wrong.push(`Calories ran ${Math.round(total - budget).toLocaleString()} over the ${budget.toLocaleString()} budget.`);
  const bigDays = infos.filter(x => x.kcal >= 2800);
  if (bigDays.length) wrong.push(`Big days: ${bigDays.map(x => `${dayName(x.d)} ${Math.round(x.kcal).toLocaleString()}`).join(", ")}.`);
  if (src.alcohol >= 600) wrong.push(`Alcohol was ${Math.round(src.alcohol).toLocaleString()} cal, ${Math.round(alcPct * 100)}% of the week's intake.`);
  if (complete && workoutDays < goal) wrong.push(`${workoutDays} workout day${workoutDays === 1 ? "" : "s"}, goal was ${goal}.`);
  if (jumps.length) wrong.push(`Weight jumped on ${jumps.map(j => `${dayName(j.date)} (+${j.delta.toFixed(1)})`).join(", ")}.`);
  computeBlindSpots().slice(0, 2).forEach(b => attn.push(b.text));
  if (t.protein && loggedDays.length >= 3 && proteinAvg < t.protein * 0.9) attn.push(`Protein averaged ${Math.round(proteinAvg)} g, under your ${t.protein} g target.`);
  if (!attn.length) attn.push("Nothing stands out this week.");
  let focus = "Repeat what worked this week.";
  if (unlogged.length) focus = "Log something every day, even a rough total.";
  else if (alcPct >= 0.15) focus = "Decide your drinking nights ahead of time and log the drinks first.";
  else if (t.protein && loggedDays.length >= 3 && proteinAvg < t.protein * 0.9) focus = "Hit protein earlier in the day.";
  else if (complete && total > budget) focus = "Plan the lighter days around your biggest day.";
  // One card at a time: read it, tap Next.
  const big = (t) => `<div style="font-family:var(--font-num); font-size:22px; font-weight:600; line-height:1.25; margin-bottom:10px;">${escapeHtml(t)}</div>`;
  const bullets = (items, color) => items.map(x => `<div style="margin-top:10px; font-size:16px; line-height:1.4; padding-left:12px; border-left:3px solid ${color};">${escapeHtml(x)}</div>`).join("");
  const rangeLab = `${formatDateOnly(days[0])} to ${formatDateOnly(days[6])}`;
  const cards = [];
  const kfmt = n => n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Math.round(n));
  const dailyBudget = budget / 7;
  // 1. Scoreboard: the only summary, everything after it is the "why".
  const wDelta = avgNow != null && avgPrev != null ? avgNow - avgPrev : null;
  cards.push(`<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
    <div class="tf-rt">${tfRing(budget ? total / budget : 0, kfmt(total), "Calories against weekly budget", total > budget ? "var(--danger)" : "var(--accent)")}<div class="rl">of ${budget.toLocaleString()} budget</div></div>
    <div class="tf-rt"><div class="rv mt6">${loggedDays.length}<small> / ${elapsed.length}</small></div><div class="tf-dots7">${Array.from({ length: 7 }, (_, k) => `<i class="${infos[k] && infos[k].n > 0 ? "on" : ""}"></i>`).join("")}</div><div class="rl">days logged</div></div>
    <div class="tf-rt">${tfRing(goal ? Math.min(1, workoutDays / goal) : 0, `${workoutDays}/${goal}`, "Workouts against goal", "var(--accent)")}<div class="rl">workouts</div></div>
    <div class="tf-rt"><div class="rv mt6">${avgNow != null ? avgNow.toFixed(1) : "·"}<small> lb</small></div><div class="rl" style="color:${wDelta == null ? "inherit" : wDelta > 0.2 ? "var(--danger)" : wDelta < -0.2 ? "var(--accent)" : "inherit"};">${wDelta == null ? "no comparison yet" : `${wDelta > 0.2 ? "▲" : wDelta < -0.2 ? "▼" : "▬"} ${Math.abs(wDelta).toFixed(1)} vs last week`}</div><div class="rl">average weight</div></div>
  </div><div class="meta mt10">${complete ? "" : `${elapsed.length} of 7 days so far. `}Tap Next for the why.</div>`);
  // 2. Daily calories against the budget line
  {
    const vals = days.map(d => ({ d, v: d <= today ? dayInfo(d).kcal : null, n: d <= today ? dayInfo(d).n : 0 }));
    const top = Math.max(dailyBudget * 1.3, ...vals.map(x => x.v || 0)) * 1.08;
    const H = 130, W = 300, bw = 28, gap = (W - bw * 7) / 8;
    const yOf = v => H - (v / top) * H;
    const bars = vals.map((x, k) => {
      const xx = gap + k * (bw + gap);
      if (x.v == null) return `<text x="${xx + bw / 2}" y="${H + 16}" text-anchor="middle" font-size="10" fill="var(--text-dim)">${dayName(x.d)[0]}</text>`;
      if (!x.n) return `<rect x="${xx}" y="${H - 4}" width="${bw}" height="4" rx="2" fill="var(--border-4)"/><text x="${xx + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="9" fill="var(--text-faint-2)">none</text><text x="${xx + bw / 2}" y="${H + 16}" text-anchor="middle" font-size="10" fill="var(--text-faint-2)">${dayName(x.d)[0]}</text>`;
      const col = x.v <= dailyBudget * 1.1 ? "var(--accent)" : x.v <= dailyBudget * 1.3 ? "var(--warn)" : "var(--danger)";
      return `<rect x="${xx}" y="${yOf(x.v)}" width="${bw}" height="${H - yOf(x.v)}" rx="4" fill="${col}"/><text x="${xx + bw / 2}" y="${yOf(x.v) - 4}" text-anchor="middle" font-size="10" fill="var(--text)">${kfmt(x.v)}</text><text x="${xx + bw / 2}" y="${H + 16}" text-anchor="middle" font-size="10" fill="var(--text-faint-2)">${dayName(x.d)[0]}</text>`;
    }).join("");
    cards.push(`${big("Day by day")}<svg viewBox="0 -6 ${W} ${H + 26}" width="100%" role="img" aria-label="Daily calories against budget line"><line x1="0" x2="${W}" y1="${yOf(dailyBudget)}" y2="${yOf(dailyBudget)}" stroke="var(--text)" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>${bars}</svg><div class="meta mt6">Dashed line is your daily share of the budget (${Math.round(dailyBudget).toLocaleString()}). Orange is at or near it, gold is over, red is well over.</div>`);
  }
  // 3. Where it came from
  cards.push(total > 0
    ? `${big("Where it came from")}<div style="display:flex; align-items:center; gap:14px;">${tfDonut(slices, Math.round(total).toLocaleString(), "cal logged")}<div class="fx1">${legend}</div></div>`
    : `${big("Where it came from")}<div class="empty">No food logged this week yet.</div>`);
  // 4. Training
  {
    const prog = programs.find(p => p.id === state.activeProgramId);
    let ring = "";
    if (prog) { const pace = getProgramPace(prog); if (pace.mode === "count") { const tot = totalProgramWorkouts(prog); ring = `<div class="tf-rt" style="flex:0 0 110px;">${tfRing(tot ? pace.completed / tot : 0, `${pace.completed}/${tot}`, "Program progress", "var(--accent)")}<div class="rl">program</div></div>`; } }
    const cnt = { max: 0, hold: 0, missed: 0 }; wkLogs.forEach(l => { if (cnt[l.result] !== undefined) cnt[l.result]++; });
    const tl = cnt.max + cnt.hold + cnt.missed;
    const row = (lab, n, col) => `<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-muted); margin:4px 0;"><span style="width:70px;">${lab}</span><span style="flex:1; height:8px; border-radius:4px; background:var(--surface-2);"><i style="display:block; height:8px; border-radius:4px; width:${tl ? Math.round(n / tl * 100) : 0}%; background:${col};"></i></span><b style="font-family:var(--font-mono); font-weight:500; width:18px; text-align:right;">${n}</b></div>`;
    cards.push(`${big("Training")}<div style="display:flex; gap:12px; align-items:center;">${ring}<div class="fx1">${row("Hit max", cnt.max, "var(--accent)")}${row("As planned", cnt.hold, "var(--gold)")}${row("Short", cnt.missed, "var(--text-dim)")}</div></div><div style="margin-top:12px; font-size:15px;">${workoutDays} workout day${workoutDays === 1 ? "" : "s"} (goal ${goal})${wkCardio.length ? ` · ${wkCardio.length} cardio, ${Math.round(cardioMin)} min${cardioDist ? `, ${cardioDist.toFixed(1)} mi` : ""}` : ""}</div>${chestSetsInWeek(days) ? `<div style="margin-top:6px; font-size:13px; color:var(--text-muted);">Chest booster: ${chestSetsInWeek(days)} of ${CHEST_WEEKLY_SETS} sets</div>` : ""}<div class="meta mt8">Calories burned aren't measured here, so training shows as activity.</div>`);
  }
  // 5. Weight line with jumps marked
  {
    const from = addDaysStr(days[0], -3);
    const pts = sortedWeights().filter(m => m.date >= from && m.date <= days[6]);
    const tagCounts = {};
    sortedWeights().filter(m => days.includes(m.date)).forEach(m => (m.reasons || []).forEach(r => { tagCounts[r] = (tagCounts[r] || 0) + 1; }));
    const chips = Object.entries(tagCounts).sort((x, y) => y[1] - x[1]).map(([r, c]) => `<span style="display:inline-block; margin:3px 4px 0 0; padding:3px 9px; border:1px solid var(--border); border-radius:12px; font-size:12px;">${escapeHtml(r)} ${c}×</span>`).join("");
    let chart = `<div class="empty">Need at least 2 weigh-ins to draw the line.</div>`;
    if (pts.length >= 2) {
      const W = 300, H = 110, lo = Math.min(...pts.map(p => p.weight)) - 0.6, hi = Math.max(...pts.map(p => p.weight)) + 0.6;
      const span = daysBetween(from, days[6]) || 1;
      const X = d => 10 + (daysBetween(from, d) / span) * (W - 20), Y = v => H - ((v - lo) / (hi - lo)) * (H - 10) - 4;
      const jd = new Set(jumps.map(j => j.date));
      chart = `<svg viewBox="0 0 ${W} ${H + 14}" width="100%" role="img" aria-label="Weight this week"><polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${pts.map(p => `${X(p.date).toFixed(1)},${Y(p.weight).toFixed(1)}`).join(" ")}"/>${pts.map(p => `<circle cx="${X(p.date).toFixed(1)}" cy="${Y(p.weight).toFixed(1)}" r="${jd.has(p.date) ? 5 : 3}" fill="${jd.has(p.date) ? "var(--danger)" : "var(--accent)"}"/>${jd.has(p.date) ? `<text x="${X(p.date).toFixed(1)}" y="${(Y(p.weight) - 8).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--text)">${p.weight}</text>` : ""}`).join("")}<text x="2" y="${H + 12}" font-size="9" fill="var(--text-dim)">${lo.toFixed(0)} to ${hi.toFixed(0)} lb · red dot = jump of 1.5+ lb</text></svg>`;
    }
    cards.push(`${big("Weight")}${chart}<div style="margin-top:8px; font-size:15px;">${avgNow != null ? `Average ${avgNow.toFixed(1)} lb` : "No weigh-ins"}${wDelta != null ? ` (${wDelta >= 0 ? "+" : "−"}${Math.abs(wDelta).toFixed(1)} vs the week before)` : ""}</div>${chips ? `<div class="mt6">${chips}</div>` : ""}`);
  }
  // 6. Each point gets its own card.
  const one = (title, items, color) => items.forEach((x, k) => cards.push(`<div class="field-label" style="text-transform:uppercase; letter-spacing:0.6px; color:${color}; margin-bottom:8px;">${title} · ${k + 1} of ${items.length}</div><div style="font-size:21px; line-height:1.4; padding-left:12px; border-left:3px solid ${color};">${escapeHtml(x)}</div>`));
  one("What went right", right, "var(--accent)");
  one("What went wrong", wrong, "var(--danger)");
  one("Needs attention", attn, "var(--warn)");
  jumps.forEach(j => { const h = explainJump(j.date); if (h) cards.push(`<div style="font-size:15px; line-height:1.45;">${h}</div>`); });
  // 7. Calorie target suggestion (merged in from the old review). Held until the Nov 17 review.
  {
    const sug = computeMacroSuggestion(), since = daysSinceMacroSuggestionApplied();
    const holding = today < "2026-11-17";
    const dlt = sug ? sug.deltaCalories : 0;
    let body;
    if (!sug) body = `${big("Calorie target")}<div style="font-size:16px;">Need 2 weigh-ins a week apart before I can suggest anything.</div>`;
    else if (holding) body = `${big("No target changes yet")}<div style="font-size:16px; line-height:1.45;">Holding until the Nov 17 review, so any change rests on two full weeks of complete logging.</div><div class="meta mt10">For reference, the app's current idea: ${dlt === 0 ? "no change" : `${dlt < 0 ? "−" : "+"}${Math.abs(dlt)} cal/day`}.</div>`;
    else if (dlt === 0) body = `${big("Calorie target")}<div style="font-size:16px;">No change suggested. ${escapeHtml(sug.message)}</div>`;
    else if (since !== null && since < MACRO_BASELINE_DAYS) body = `${big("Calorie target")}<div style="font-size:16px;">A change was applied ${since < 1 ? "today" : Math.floor(since) + " day(s) ago"}. Give it time before changing again.</div>`;
    else body = `${big(`${dlt < 0 ? "−" : "+"}${Math.abs(dlt)} cal/day suggested`)}<div style="font-size:15px; line-height:1.45;">${escapeHtml(sug.message)}</div><button type="button" class="secondary" id="applyWeeklySuggestionBtn" data-delta="${dlt}" style="margin-top:12px; width:100%;">Apply (moves the weekly budget by ${dlt < 0 ? "−" : "+"}${Math.abs(dlt * 7).toLocaleString()})</button>`;
    cards.push(body);
  }
  cards.push(`${big("Next week's focus")}<div style="font-size:18px; line-height:1.4;">${escapeHtml(focus)}</div>`);
  if (weekCloseStep >= cards.length) weekCloseStep = cards.length - 1;
  if (weekCloseStep < 0) weekCloseStep = 0;
  const dots = cards.map((_, k) => `<i style="display:inline-block; width:8px; height:8px; border-radius:50%; margin:0 3px; background:${k === weekCloseStep ? "var(--accent)" : "var(--border-4)"};"></i>`).join("");
  const tab = (lab, off) => `<button type="button" data-weekclose="${off}" class="${weekCloseOffset === off ? "primary" : "secondary"}" style="flex:1; padding:8px;">${lab}</button>`;
  el.innerHTML = `
    <div class="row" style="gap:8px;">${tab("Last week", -1)}${tab("This week", 0)}</div>
    <div class="meta" style="margin:8px 0;">${rangeLab}${complete ? "" : ` · ${elapsed.length} of 7 days so far`}</div>
    <div style="min-height:200px; padding:14px; border:1px solid var(--border); border-radius:14px;">${cards[weekCloseStep]}</div>
    <div style="text-align:center; margin:12px 0 8px;">${dots}</div>
    <div class="row" style="gap:8px;"><button type="button" class="secondary" data-weekstep="-1" style="flex:1;" ${weekCloseStep === 0 ? "disabled" : ""}>Back</button><button type="button" class="primary" data-weekstep="1" style="flex:1;" ${weekCloseStep === cards.length - 1 ? "disabled" : ""}>Next</button></div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-weekclose]");
  if (!b) return;
  weekCloseOffset = parseInt(b.dataset.weekclose, 10);
  weekCloseStep = 0;
  renderWeekClose();
});
document.addEventListener("click", async (e) => {
  const ap = e.target.closest("#applyWeeklySuggestionBtn");
  if (ap) {
    await applyMacroSuggestion(parseInt(ap.dataset.delta, 10));
    state.settings.weeklyCalBudget = Math.round((state.settings.macroTargets.calories || 0) * 7);
    await persistNow();
    try { renderWeekBudget(); renderWeekClose(); } catch (err) {}
    return;
  }
  const b = e.target.closest("[data-weekstep]");
  if (!b) return;
  weekCloseStep += parseInt(b.dataset.weekstep, 10);
  renderWeekClose();
});

function renderActiveProgramInfo() {
  renderWelcomeBackBanner();
  renderStartHereBanner();
  const headerName = document.getElementById("headerProgramName");
  const active = programs.find(p => p.id === state.activeProgramId);
  const genBtn = document.getElementById("genWorkoutBtn");
  if (!active) {
    headerName.textContent = "No active program";
    genBtn.disabled = true;
    document.getElementById("todayWorkout").innerHTML = '<div class="empty">Pick an active program first.</div>';
    renderWeeklyReview();
    return;
  }
  headerName.textContent = active.name.replace(/\s*\([^)]*\)/g, "").trim() || active.name;
  genBtn.disabled = false;
  genBtn.textContent = "Regenerate";
  ensureWorkoutReady(active);
  renderWeeklyReview();
}

function phaseKeyFor(program, phase) {
  // Includes a short fingerprint of the phase's days, so editing a program's
  // exercises (not just its label) retires any cached workout built from the old list.
  let h = 5381;
  const str = JSON.stringify(phase?.days || []);
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return `${program.id}:${phase?.phase}-${phase?.week_start}-${phase?.week_end}-${h.toString(36)}`;
}

// A generated workout is just a plain JSON snapshot (name/sets/reps strings)
// with no live link back to the exercise library — so when the library
// changes (an exercise renamed, merged, or removed, e.g. the bar->rings
// conversion), anything already cached in state.pendingWorkout or
// state.previewWorkout keeps showing the old names forever with no way for
// the person to tell something's stale. Checked wherever a cached workout
// would otherwise be reused as-is, and treated as stale if ANY exercise name
// no longer matches something in the current library.
function workoutHasStaleExercises(workout) {
  if (!workout || !workout.exercises || !workout.exercises.length) return false;
  const currentNames = new Set(exercises.map(e => e.name.toLowerCase()));
  return workout.exercises.some(e => !currentNames.has((e.name || "").toLowerCase()));
}

// The "current" workout persists until you log a result for it — training
// cadence is driven by completion, not calendar days, so rest days (or
// skipped days) never throw the rotation out of sync.
// forceDayIndex lets a caller that just wiped pendingWorkout (Repeat/Advance/
// Reset week — see below) tell this function which day-of-rotation to
// regenerate instead of silently defaulting to Day 1. Without it, those
// buttons reset the whole 7-day rotation back to the start every time
// they're clicked, which is how a day (e.g. the one core slot in Foundation
// phase) can go weeks without ever coming up — the cycle keeps restarting
// before it gets there.
// Which day of this week is up next, from the count of finished workouts (the
// same source the Program screen uses). null when the program isn't paced by count.
function expectedDayIndex(program) {
  try {
    const pace = getProgramPace(program);
    if (pace.mode !== "count") return null;
    const cur = Math.min(currentPhaseFor(program).weekNumber, programMaxWeek(program));
    let before = 0; for (let w = 1; w < cur; w++) before += workoutsInWeek(program, w);
    return Math.max(0, pace.completed - before);
  } catch (e) { return null; }
}
async function ensureWorkoutReady(program, forceDayIndex) {
  const { phase, weekNumber } = currentPhaseFor(program);
  const key = phaseKeyFor(program, phase);

  let cached = state.pendingWorkout;
  // One-time repair (build 2026-11-01 12:40): a program edit used to restart a
  // pending workout at Day 1. If the saved day disagrees with the finished-workout
  // count, put it back on the right day.
  if (cached && !cached.completed && cached.programId === program.id && state.dayIdxHeal !== 1 && typeof forceDayIndex !== "number") {
    state.dayIdxHeal = 1;
    const exp = expectedDayIndex(program);
    const tot = (phase?.days || []).length || 1;
    if (exp !== null && exp < tot && exp !== cached.dayIndex) { forceDayIndex = exp; cached = null; }
    else { try { persist(); } catch (e) {} }
  }
  // Same program and phase but the day list changed (hash differs): keep its place in the rotation.
  const baseKey = k => String(k || "").replace(/-[a-z0-9]+$/, "");
  const sameSlot = cached && cached.programId === program.id && baseKey(cached.phaseKey) === baseKey(key);
  const hasMatchingCache = cached && cached.programId === program.id && cached.phaseKey === key;
  if (hasMatchingCache && !cached.completed && !workoutHasStaleExercises(cached.workout)) {
    renderTodayWorkout(cached.workout);
    return;
  }

  const box = document.getElementById("todayWorkout");
  box.innerHTML = '<div class="empty">Generating your next workout…</div>';
  try {
    const totalDays = (phase?.days || []).length || 1;
    let nextIndex = typeof forceDayIndex === "number" ? ((forceDayIndex % totalDays) + totalDays) % totalDays : 0;
    if (typeof forceDayIndex === "number") {
      // explicit choice wins
    } else if (sameSlot && cached.completed) {
      nextIndex = (cached.dayIndex + 1) % totalDays;
    } else if (sameSlot && !cached.completed) {
      // Stale cache for a day not yet done — regenerate the same slot,
      // don't advance the rotation just because the old copy aged out.
      nextIndex = cached.dayIndex;
    }
    const workout = await generateTodayWorkout(program, nextIndex);
    state.pendingWorkout = { programId: program.id, phaseKey: key, dayIndex: nextIndex, workout, completed: false };
    await persistNow();
    renderTodayWorkout(workout);
  } catch (err) {
    box.innerHTML = `<div class="empty">Couldn't auto-generate (${err.message}). Use the button below to retry.</div>`;
  }
}

// ---- AI generation ----
// The AI designs each phase's weekly day/slot template freely, with only a
// prose description of what a good template looks like — nothing forces it
// to actually cover every trained muscle group at a reasonable frequency.
// That's how a Foundation phase ended up scheduling core just 1x/week while
// Build/Peak got 3x/week: nothing caught the imbalance before it shipped.
// This runs deterministically on whatever the AI returns, the same way
// plane balance for push/pull is enforced in code rather than left to the
// prompt alone. It does two things: drops/repairs slots with an
// unrecognized muscle_group (a hallucinated or misspelled value would
// otherwise silently create an untracked, never-served slot), then tops up
// any of push/pull/legs/hinge/core that falls under a weekly floor by
// appending a slot to whichever training day is lightest and doesn't
// already train that group. Ruck is intentionally excluded from the floor —
// it's cardio, tracked as its own activity, and not every program should be
// forced to include it.
// Travel mode: restrict to gear actually likely to be on hand on the road —
// bodyweight plus rings, which travel well and come along on most trips.
// Deliberately excludes band/dumbbell/weighted vest/pack — those stay home.
// Module-level (not just inside generateTodayWorkout) so the swap panel can
// apply the same restriction while travel mode is on, not just the initial
// workout generation.
// Travel mode builds bodyweight-only workouts. Rings are not used when
// generating, but stay available in the Swap panel for when you did bring them.
const TRAVEL_EQUIPMENT = new Set(["bodyweight"]);
const TRAVEL_SWAP_EQUIPMENT = new Set(["bodyweight", "rings"]);

const KNOWN_MUSCLE_GROUPS = ["push", "pull", "legs", "hinge", "core", "ruck"];
const MUSCLE_GROUP_FLOOR = { push: 2, pull: 2, legs: 2, hinge: 2, core: 2 };
function balanceProgramStructure(structure) {
  (structure.phases || []).forEach(phase => {
    const days = phase.days || [];
    days.forEach(d => {
      d.slots = (d.slots || []).filter(s => KNOWN_MUSCLE_GROUPS.includes(s.muscle_group));
    });
    // Nothing requires the AI to leave any day empty — a 7-day training week
    // is a real risk if its prose interpretation of "days" drifts. Force one
    // rest day per phase (clearing the lightest training day) BEFORE the
    // group-floor backfill below, so any slots lost here get naturally
    // redistributed by that step rather than the two fighting each other.
    if (days.length >= 7 && !days.some(d => d.slots.length === 0)) {
      const lightest = days.slice().sort((a, b) => a.slots.length - b.slots.length)[0];
      console.warn(`balanceProgramStructure: phase "${phase.phase}" had no rest day — clearing "${lightest.day}" to force one`);
      lightest.slots = [];
    }
    const counts = {};
    Object.keys(MUSCLE_GROUP_FLOOR).forEach(g => (counts[g] = 0));
    days.forEach(d => d.slots.forEach(s => {
      if (counts[s.muscle_group] !== undefined) counts[s.muscle_group]++;
    }));
    const anySlot = days.flatMap(d => d.slots).find(Boolean) || { sets: 3, reps: "10-12" };
    Object.keys(MUSCLE_GROUP_FLOOR).forEach(group => {
      let deficit = MUSCLE_GROUP_FLOOR[group] - counts[group];
      if (deficit <= 0) return;
      const candidates = days
        .filter(d => d.slots.length > 0 && !d.slots.some(s => s.muscle_group === group))
        .sort((a, b) => a.slots.length - b.slots.length);
      for (const d of candidates) {
        if (deficit <= 0) break;
        const template = d.slots[0] || anySlot;
        d.slots.push({ muscle_group: group, sets: template.sets, reps: template.reps });
        deficit--;
      }
      if (deficit > 0) {
        console.warn(`balanceProgramStructure: could not reach floor for "${group}" in phase "${phase.phase}" (short by ${deficit}) — every training day already trains it or has no room`);
      }
    });
  });
  return structure;
}

async function generateProgram(months, focus, opts = {}) {
  const days = opts.days || 4;
  const minutes = opts.minutes || "35-45";
  const slotsPerDay = minutes === "25-35" ? "4-5" : minutes === "45-60" ? "6-7" : "5-6";
  const weeks = months * 4;
  const system = `You design structured fitness programs as pure muscle-group slot
plans, never fixed exercise names — that lets the app swap in different exercises
each week from the user's library while still counting the right muscle groups
toward progression. Compress the program into PHASES (e.g. foundation, build,
peak) rather than writing out every individual week — most weeks within a phase
share the same day/slot template, so this keeps output compact even for a
12-month program. Respond with ONLY valid JSON, no prose, no markdown fences.`;
  const prompt = `Design a ${weeks}-week program${focus ? " focused on: " + focus : ""}.
Output JSON exactly in this shape:
{"name": "string", "phases": [{"phase": "string label", "week_start": 1, "week_end": 8, "deload_weeks": [4], "days": [{"day": "string label", "slots": [{"muscle_group": "push|pull|legs|hinge|core|ruck", "sets": 3, "reps": "8-12"}]}]}]}
Use as many phases as make sense for ${weeks} weeks (roughly one phase per 4-8 weeks),
with each phase's day/slot template reflecting that phase's focus and difficulty
(e.g. higher reps early, lower reps + more sets later). deload_weeks lists week
numbers WITHIN that phase's range that should be lighter.
SESSION DESIGN (this matters more than anything above): the person wants fat
loss and conditioning, not token workouts. Each phase's "days" array must list
EXACTLY ${days} training days per week and NO rest-day entries (the app handles
rest). Every training day is a full ${minutes}-minute session including a short
warm-up and cool-down, so give each day ${slotsPerDay} slots (3-4 sets each),
arranged as back-to-back pairs (push with pull, legs with hinge, core with
anything) that will be done as supersets with short rest, so the heart rate
stays up. Prefer full-body or upper/lower days over single-muscle days, and give
every day at least one leg or hinge slot. Spread push, pull, legs, hinge and core
across the ${days} days so each is trained at least twice a week where possible.`;
  const data = await apiFetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt, max_tokens: 8000 }),
  });
  const text = data.content?.[0]?.text || "{}";
  const structure = balanceProgramStructure(extractJson(text));
  structure.session = { days, minutes };
  const program = {
    id: "prog-" + Date.now(),
    name: structure.name || `${months}-month program`,
    duration_weeks: weeks,
    source: "ai",
    structure,
  };
  await apiFetch("/api/programs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(program),
  });
  return program;
}

// ---- program pacing ----
// Each program is paced either by workouts completed ("count", the default —
// "workout 14 of 72", no calendar, falling behind is impossible) or by the
// calendar ("calendar", the original start-date behavior). Stored per program
// in state.programProgress[programId] = { mode, completed }.
function getProgramPace(program) {
  const e = program && state.programProgress ? state.programProgress[program.id] : null;
  return { mode: e?.mode === "calendar" ? "calendar" : "count", completed: e?.completed || 0 };
}
function phaseForWeek(program, week) {
  const phases = program?.structure?.phases || [];
  return phases.find(p => week >= p.week_start && week <= p.week_end) || phases[phases.length - 1] || phases[0];
}
function programMaxWeek(program) {
  return Math.max(1, ...((program?.structure?.phases || []).map(p => p.week_end || 0)));
}
// A "week" in count mode = one full pass through that phase's day template.
function workoutsInWeek(program, week) {
  // Only days with exercises count; a rest-day entry in the template isn't a workout.
  return Math.max(1, (phaseForWeek(program, week)?.days || []).filter(d => (d.slots || []).length > 0).length);
}
function totalProgramWorkouts(program) {
  let t = 0;
  for (let w = 1; w <= programMaxWeek(program); w++) t += workoutsInWeek(program, w);
  return t;
}
function weekForCompleted(program, completed) {
  const maxWeek = programMaxWeek(program);
  let rem = completed, w = 1;
  while (w < maxWeek && rem >= workoutsInWeek(program, w)) { rem -= workoutsInWeek(program, w); w++; }
  return w;
}
function computeWeekNumber(program) {
  if (program && getProgramPace(program).mode === "count") {
    return weekForCompleted(program, getProgramPace(program).completed);
  }
  const startDate = state.settings?.startDate ? new Date(state.settings.startDate) : new Date();
  const raw = Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  // Calendar-driven only; the old Repeat/Advance offset was removed.
  return Math.max(1, raw);
}

function currentPhaseFor(program) {
  const phases = program.structure.phases || [];
  const weekNumber = computeWeekNumber(program);
  const phase = phases.find(p => weekNumber >= p.week_start && weekNumber <= p.week_end) || phases[phases.length - 1] || phases[0];
  return { phase, weekNumber };
}

// Which body region each mobility/warmup-cooldown exercise targets — lets
// both the prompt's available list AND the variety backstop below restrict
// picks to what's actually relevant for today's muscle groups, instead of
// the AI's prompt instruction being the only thing keeping a leg stretch
// off a push/pull day (a prompt instruction is a request, not a rule — see
// enforceWarmupCooldownVariety's own history for why that distinction
// matters here specifically: its variety-swap used to pull from the WHOLE
// mobility pool with no region awareness, so it could silently replace a
// correct upper-body pick with a leg stretch while fixing repetition).
// "full" items suit any day (general spinal mobility, full-body dynamic
// movement, cardio warmup) and any id missing from this map defaults to
// "full" too, so an unclassified future addition never gets locked out.
const MOBILITY_REGION_MAP = {
  "arm-circles": "upper", "shoulder-dislocates-band": "upper", "wall-slides": "upper",
  "scapular-wall-pushup": "upper", "doorway-chest-stretch": "upper", "thread-the-needle": "upper",
  "wrist-circles": "upper", "wrist-flexor-stretch": "upper", "childs-pose-reach": "upper",
  "neck-circles": "upper", "chin-tucks": "upper", "neck-lateral-stretch": "upper",
  "prone-ytw-raise": "upper", "band-external-rotation": "upper", "wall-angels": "upper",
  "thoracic-extension-chair": "upper", "seated-spinal-twist": "upper", "band-overhead-stretch": "upper",
  "open-book-rotation": "upper", "scapular-shrug-depress": "upper", "scapular-pushup-floor": "upper",
  "cross-body-shoulder-stretch": "upper", "levator-scapulae-stretch": "upper",
  "hip-90-90-stretch": "lower", "kneeling-hip-flexor-stretch": "lower", "ankle-circles": "lower",
  "wall-ankle-mobilization": "lower", "deep-squat-hold": "lower", "pigeon-pose": "lower",
  "standing-hamstring-stretch": "lower", "standing-quad-stretch": "lower", "wall-calf-stretch": "lower",
  "figure-4-glute-stretch": "lower", "butterfly-stretch": "lower", "side-lunge-stretch": "lower",
  "high-knees": "lower", "leg-swings-front": "lower", "leg-swings-side": "lower",
  "calf-raises-dynamic": "lower",
  "cat-cow": "full", "worlds-greatest-stretch": "full", "bird-dog": "full",
  "jumping-jacks": "full", "scorpion-stretch": "full",
};
// Which mobility region(s) a day's slots call for — push/pull warm up and
// cool down the shoulders/wrists/thoracic spine, legs/hinge/ruck warm up
// and cool down the hips/ankles/hamstrings. "full" is always included since
// those items suit any day regardless of what's being trained.
// Shoulder-balance mobility items (added for uneven shoulder height). On days
// with upper-body slots the AI is nudged to include one in the warm-up and one
// in the cool-down when they fit — a preference, not a rule, so variety and
// the region filter still win.
const SHOULDER_BALANCE_IDS = [
  "open-book-rotation", "scapular-shrug-depress", "scapular-pushup-floor",
  "cross-body-shoulder-stretch", "levator-scapulae-stretch",
];
const MUSCLE_GROUP_TO_MOBILITY_REGION = {
  push: "upper", pull: "upper", legs: "lower", hinge: "lower", core: "full", ruck: "lower",
};
function allowedMobilityRegions(slots) {
  const regions = new Set(["full"]);
  (slots || []).forEach(s => {
    const r = MUSCLE_GROUP_TO_MOBILITY_REGION[s.muscle_group];
    if (r) regions.add(r);
  });
  return regions;
}

// Hard guarantee layer on top of the AI's warmup/cooldown picks: the prompt
// already asks the AI to vary from last session, but that's a request, not
// a rule, and it was ignored often enough in practice (the AI defaults to
// the same "textbook" item for a given muscle group) that a code-level
// check is needed too — the same pattern already used for swap fallback.
// Only overrides a pick if a genuinely unused alternative exists; if the
// whole mobility pool was already used last session, the repeat is allowed
// rather than forced into something worse.
// Staples for the uneven-shoulder / desk-and-driving posture work: added to
// every upper-body day (and hip ones on every lower-body day) by code (not left to the AI) and exempt from the
// "vary from last session" swap, since repeating these is the point.
const SHOULDER_STAPLE_WARMUP_ID = "wall-slides";
const SHOULDER_STAPLE_COOLDOWN_ID = "levator-scapulae-stretch";
const HIP_STAPLE_WARMUP_ID = "glute-bridge";
const HIP_STAPLE_COOLDOWN_ID = "kneeling-hip-flexor-stretch";
function ensureShoulderStaples(result, allowedRegions, slots) {
  if (!allowedRegions) return result;
  // A staple never duplicates something already in today's main work. If it
  // would (e.g. glute bridge as both the warm-up and a working set), the
  // fallback goes in instead.
  const inMain = (name) => (result.exercises || []).some(i => i && i.name && i.name.toLowerCase() === name.toLowerCase());
  const add = (listKey, id, detail, fallbackId, fallbackDetail) => {
    let ex = exercises.find(e => e.id === id);
    let d = detail;
    if (ex && inMain(ex.name)) {
      ex = fallbackId ? exercises.find(e => e.id === fallbackId) : null;
      d = fallbackDetail;
    }
    if (!ex) return;
    const list = result[listKey] = result[listKey] || [];
    if (list.some(i => i && i.name && i.name.toLowerCase() === ex.name.toLowerCase())) return;
    list.push({ name: ex.name, detail: d });
  };
  if (allowedRegions.has("upper")) {
    add("warmup", SHOULDER_STAPLE_WARMUP_ID, "10 slow reps");
    add("cooldown", SHOULDER_STAPLE_COOLDOWN_ID, "hold 30s each side, extra round on the tight side");
  }
  // Desk + driving staples for leg / hinge / ruck / full-body days.
  // Core-only days (no upper/lower region of their own) get the hip pair too.
  const coreDay = !allowedRegions.has("upper") && (slots || []).some(sl => sl && sl.muscle_group === "core");
  if (allowedRegions.has("lower") || coreDay) {
    add("warmup", HIP_STAPLE_WARMUP_ID, "12 slow reps, squeeze at the top", "worlds-greatest-stretch", "5 per side, slow");
    add("cooldown", HIP_STAPLE_COOLDOWN_ID, "hold 30s each side");
  }
  return result;
}

function enforceWarmupCooldownVariety(result, allowedRegions) {
  const lastNames = new Set((state.lastWarmupCooldownNames || []).map(n => n.toLowerCase()));
  if (!lastNames.size) return result;
  const regions = allowedRegions || new Set(["upper", "lower", "full"]); // no day info — don't restrict
  const mobilityPool = exercises.filter(e =>
    e.muscle_group === "mobility" && regions.has(MOBILITY_REGION_MAP[e.id] || "full")
  );
  const usedThisWorkout = new Set();
  const fix = (item) => {
    if (!item || !item.name) return item;
    const nameLower = item.name.toLowerCase();
    const isStaple = [SHOULDER_STAPLE_WARMUP_ID, SHOULDER_STAPLE_COOLDOWN_ID, HIP_STAPLE_WARMUP_ID, HIP_STAPLE_COOLDOWN_ID]
      .some(id => exercises.find(e => e.id === id)?.name.toLowerCase() === nameLower);
    if (isStaple || !lastNames.has(nameLower)) {
      usedThisWorkout.add(nameLower);
      return item;
    }
    const alt = mobilityPool.find(
      (e) => !lastNames.has(e.name.toLowerCase()) && !usedThisWorkout.has(e.name.toLowerCase())
    );
    if (!alt) {
      usedThisWorkout.add(nameLower);
      return item; // no unused alternative left — allow the repeat
    }
    usedThisWorkout.add(alt.name.toLowerCase());
    return {
      name: alt.name,
      detail: item.detail || (isHoldExercise(alt.id) ? "hold 20-30s" : "30-45s"),
    };
  };
  result.warmup = (result.warmup || []).map(fix);
  result.cooldown = (result.cooldown || []).map(fix);
  return result;
}

// The AI sometimes returns more exercises than the day has slots (two push
// picks for one push slot, say), which quietly adds volume beyond the
// planned session length. Keep exactly the slots the program prescribes:
// walk the exercises in order and drop any muscle group's extras. A superset
// left with a single member goes back to standalone.
function enforceSlotCount(result, slots) {
  if (!result || !Array.isArray(result.exercises) || !Array.isArray(slots) || !slots.length) return result;
  const want = {};
  slots.forEach(sl => { want[sl.muscle_group] = (want[sl.muscle_group] || 0) + 1; });
  if (result.exercises.length <= slots.length) return result;
  const kept = [];
  result.exercises.forEach(e => {
    if ((want[e.muscle_group] || 0) > 0) { want[e.muscle_group]--; kept.push(e); }
  });
  if (!kept.length) return result;
  const groupCounts = {};
  kept.forEach(e => { if (e.superset_group) groupCounts[e.superset_group] = (groupCounts[e.superset_group] || 0) + 1; });
  kept.forEach(e => { if (e.superset_group && groupCounts[e.superset_group] < 2) e.superset_group = null; });
  result.exercises = kept;
  return result;
}

// Hard backstop for main-exercise variety. The prompt only ASKS the AI to
// avoid recently used exercises, and with a small pool at your current level
// it often repeats them (e.g. the same box squat two days running). This swaps
// any exercise that was in your last session for a same-muscle-group
// alternative from the level-filtered list, preferring ones you haven't done
// lately. If there's no alternative, the original stays.
function enforceMainVariety(result, available, lastSessionNames, recentNames) {
  if (!result || !Array.isArray(result.exercises)) return result;
  const avoid = new Set([...lastSessionNames].map(n => String(n).toLowerCase()));
  const recent = new Set([...recentNames].map(n => String(n).toLowerCase()));
  const used = new Set(result.exercises.map(e => String(e.name || "").toLowerCase()));
  result.exercises.forEach((e) => {
    const nm = String(e.name || "").toLowerCase();
    if (!avoid.has(nm)) return;
    const wasHold = isHoldExercise(e.name);
    const pool = (available || []).filter(c =>
      c.muscle_group === e.muscle_group &&
      isHoldExercise(c.name) === wasHold &&
      !used.has(c.name.toLowerCase()) &&
      !avoid.has(c.name.toLowerCase()));
    if (!pool.length) return;
    const fresh = pool.filter(c => !recent.has(c.name.toLowerCase()));
    const pick = (fresh.length ? fresh : pool)[0];
    used.delete(nm);
    used.add(pick.name.toLowerCase());
    e.name = pick.name;
    e.muscle_group = pick.muscle_group;
  });
  return result;
}
