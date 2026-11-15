// ---- week ribbon: this week as the plan sees it (Mon to Sun) ----
// Kind comes from the fixed DAY_PLAN; done comes from logged sessions (and chest booster logs on chest days).
// Today follows the Rest/Train switch. Past planned days with nothing logged are dimmed.
function renderWeekRibbon() {
  const el = document.getElementById("wkRibbon");
  if (!el) return;
  const days = weekDayList(0), todayS = localDateStr();
  const done = new Set((state.logs || []).map(l => dayKeyOf(l.date)));
  const chest = new Set((state.chestLogs || []).map(l => dayKeyOf(l.date)));
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  const check = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  el.innerHTML = '<div class="wr-row">' + days.map((d, i) => {
    let kind = DAY_PLAN[(i + 1) % 7] || "rest";
    const isToday = d === todayS;
    if (isToday) { const f = chestFocus(); kind = f === "chest" ? (kind === "chest" ? "chest" : "rest") : "train"; }
    const isDone = done.has(d) || (kind === "chest" && chest.has(d));
      const label = names[i] + ", " + (kind === "train" ? "training" : kind === "chest" ? "chest day" : "rest") + (isDone ? ", done" : "") + (isToday ? ", today" : "");
    return `<div class="wr-d ${kind}${isDone ? " done" : ""}${isToday ? " today" : ""}" role="img" aria-label="${label}"><div class="wr-c">${isDone ? check : ""}</div><span>${letters[i]}</span></div>`;
  }).join("") + "</div>";
}

// ---- header title follows the visible screen ----
function syncHeaderTitle() {
  const names = { coach: "Coach", food: "Food", today: "Today", programs: "Programs", settings: "Settings" };
  const open = document.querySelector(".tab-panel:not(.hidden)");
  const id = open ? open.id.replace("tab-", "") : "coach";
  const t = document.getElementById("hTitle"); if (t) t.textContent = names[id] || "Train & Fuel";
  const d = document.getElementById("hDate");
  const wr = document.getElementById("wkRibbon"); if (wr) { wr.hidden = id === "settings" || id === "programs"; try { renderWeekRibbon(); } catch (e) {} }
  if (d) d.textContent = id === "settings" ? "" : new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
document.querySelectorAll(".tab-btn").forEach(b => b.addEventListener("click", syncHeaderTitle));
document.getElementById("profileBtn").addEventListener("click", syncHeaderTitle);
syncHeaderTitle();
document.getElementById("setProgramsRow").addEventListener("click", () => document.getElementById("programsBtn").click());

// ---- duration chips ----
let selectedMonths = 6;
document.getElementById("durationChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#durationChips .chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  selectedMonths = parseInt(chip.dataset.months, 10);
});

let selectedDays = 4, selectedMinutes = "35-45";
document.getElementById("daysChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#daysChips .chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  selectedDays = parseInt(chip.dataset.days, 10);
});
document.getElementById("minutesChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#minutesChips .chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  selectedMinutes = chip.dataset.minutes;
});

// ---- generate program ----
document.getElementById("generateProgramBtn").addEventListener("click", async (e) => {
  const btn = e.target;
  const focus = document.getElementById("programFocus").value.trim();
  btn.disabled = true; btn.textContent = "Generating…";
  try {
    const program = await generateProgram(selectedMonths, focus, { days: selectedDays, minutes: selectedMinutes });
    await loadPrograms();
    renderPrograms();
    alert(`"${program.name}" saved to your library — it'll stay there until you delete it.`);
  } catch (err) {
    alert("Generation failed: " + err.message + (WORKER_URL ? "" : " (set your Worker URL in Settings first)"));
  } finally {
    btn.disabled = false; btn.textContent = "Generate program";
  }
});

document.getElementById("addKbProgramBtn").addEventListener("click", async (e) => {
  const btn = e.target;
  if (programs.some(p => p.source === "built-in" && /Kettlebell/.test(p.name)) && !confirm("You already have a kettlebell program saved. Add another copy?")) return;
  btn.disabled = true; btn.textContent = "Adding…";
  try {
    const program = kbProgram();
    await apiFetch("/api/programs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(program) });
    await loadPrograms();
    renderPrograms();
    alert(`"${program.name}" added. Open Saved programs and tap Use when your bell arrives.`);
  } catch (err) {
    alert("Couldn't add it: " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Add kettlebell program";
  }
});

// ---- upload / import program ----
document.getElementById("uploadDrop").addEventListener("click", () => document.getElementById("uploadInput").click());
document.getElementById("uploadInput").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const statusEl = document.getElementById("uploadStatus");
  statusEl.style.display = "block";
  statusEl.textContent = "Reading files…";
  try {
    const encoded = await Promise.all(files.map(async f => {
      if (f.type.startsWith("image/")) {
        const { base64, media_type } = await resizeImageFile(f, 1600, 0.85); // a bit higher res since these need to be read as text
        return { media_type, data: base64 };
      }
      return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res({ media_type: f.type, data: reader.result.split(",")[1] });
        reader.onerror = rej;
        reader.readAsDataURL(f);
      });
    }));
    statusEl.textContent = "Parsing with AI…";
    const instructions = `Extract the structured training program from these file(s).
Determine the program's actual total duration from what's in the document itself
— don't assume any particular length (e.g. exactly a year); read the real number
of weeks/phases as written. Compress it into PHASES rather than writing out every
individual week — identify the distinct blocks/phases (e.g. foundation, build,
peak) and the day/slot template each phase uses, noting which weeks within each
phase are deload weeks. This keeps the output compact even for a long program.
For each slot, also capture the SPECIFIC exercise name the document actually
names for it (e.g. "Archer pull-up", not just "pull") — this is what the
person's original program prescribed, and it should be preserved and used
later, not replaced with something generic. Use exercise_name: null only if
the document genuinely doesn't specify one and leaves it open.
When a named exercise's equipment is clear from the document or the exercise
itself, also set "equipment" to exactly one of: "bodyweight", "rings",
"parallettes", "ab wheel", "dumbbell", "band". This person trains
calisthenics only — never guess "barbell" or any other gym-machine
equipment even if the document mentions one; use null instead if the
equipment genuinely isn't one of those six or isn't clear.
Output ONLY valid JSON: {"name": "string", "phases": [{"phase": "string", "week_start": 1, "week_end": 8, "deload_weeks": [4], "days": [{"day": "string", "slots": [{"muscle_group": "push|pull|legs|hinge|core|ruck", "sets": 3, "reps": "8-12", "exercise_name": "string or null", "equipment": "string or null"}]}]}]}`;
    const data = await apiFetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: encoded, instructions }),
    });
    const text = data.content?.[0]?.text || "{}";
    const structure = extractJson(text);

    // Reconcile named exercises against the library — anything the document
    // specified that we don't already have gets added as a custom entry, so
    // generation can actually use what the original program prescribed
    // instead of silently falling back to a same-muscle-group substitute.
    // Equipment the AI reported must be one of these six (this person trains
    // calisthenics only) — anything else, including a stray "barbell" guess,
    // falls back to null rather than being trusted and stored.
    const IMPORT_ALLOWED_EQUIPMENT = new Set(["bodyweight", "rings", "parallettes", "ab wheel", "dumbbell", "band", "kettlebell"]);
    const namedExercises = new Map(); // name (lowercased) -> { name, muscle_group, equipment }
    (structure.phases || []).forEach(phase => {
      (phase.days || []).forEach(day => {
        (day.slots || []).forEach(slot => {
          if (slot.exercise_name && slot.exercise_name.trim()) {
            const equip = typeof slot.equipment === "string" ? slot.equipment.trim().toLowerCase() : null;
            namedExercises.set(slot.exercise_name.trim().toLowerCase(), {
              name: slot.exercise_name.trim(),
              muscle_group: slot.muscle_group,
              equipment: equip && IMPORT_ALLOWED_EQUIPMENT.has(equip) ? equip : null,
            });
          }
        });
      });
    });
    const existingNames = new Set(exercises.map(e => e.name.toLowerCase()));
    const toCreate = [...namedExercises.values()].filter(e => !existingNames.has(e.name.toLowerCase()));
    for (const ex of toCreate) {
      try {
        await apiFetch("/api/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "imported-" + ex.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name: ex.name,
            muscle_group: ex.muscle_group,
            // null (not a hardcoded "bodyweight") when the document didn't
            // make the equipment clear — a wrong explicit guess would be
            // worse than leaving it unspecified for equipment filtering.
            equipment: ex.equipment,
            cue: "",
            source: "imported",
          }),
        });
      } catch (e) { /* skip on individual failure, don't block the whole import */ }
    }
    if (toCreate.length) await loadExercises();

    const maxWeek = Math.max(0, ...(structure.phases || []).map(p => p.week_end || 0));
    const program = {
      id: "prog-" + Date.now(),
      name: structure.name || "Imported program",
      duration_weeks: maxWeek,
      source: "uploaded",
      structure,
    };
    await apiFetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(program),
    });
    await loadPrograms();
    renderPrograms();
    statusEl.textContent = `"${program.name}" saved to your library — it'll stay there until you delete it.`;
  } catch (err) {
    statusEl.textContent = "Import failed: " + err.message;
  }
});

// ---- program list actions ----
document.getElementById("programList").addEventListener("click", async (e) => {
  const previewId = e.target.dataset.previewProgram;
  const useId = e.target.dataset.useProgram;
  const delId = e.target.dataset.delProgram;
  const paceId = e.target.dataset.paceProgram;
  if (paceId) {
    const prog = programs.find(p => p.id === paceId);
    if (!prog) return;
    const cur = getProgramPace(prog);
    state.programProgress = state.programProgress || {};
    // Keep the completed count either way, so switching back never loses it.
    state.programProgress[paceId] = { mode: cur.mode === "count" ? "calendar" : "count", completed: cur.completed };
    await persistNow();
    renderPrograms();
    return;
  }
  if (previewId) {
    const panel = document.querySelector(`[data-preview-panel="${previewId}"]`);
    const isHidden = panel.classList.contains("hidden");
    document.querySelectorAll(".preview-panel").forEach(p => p.classList.add("hidden"));
    if (isHidden) {
      const program = programs.find(p => p.id === previewId);
      panel.innerHTML = renderProgramPreview(program);
      panel.classList.remove("hidden");
    }
    return;
  }
  if (useId) {
    state.activeProgramId = useId;
    state.programStartedAt = state.programStartedAt || {};
    state.programStartedAt[useId] = new Date().toISOString();
    await applyStartingLevelsIfUntrained();
    renderActiveProgramInfo();
  }
  if (delId) {
    if (!confirm("Delete this program? This can't be undone.")) return;
    await apiFetch("/api/programs/" + delId, { method: "DELETE" });
    if (state.activeProgramId === delId) state.activeProgramId = null;
    await loadPrograms();
    renderPrograms();
    await persistNow();
  }
});

// ---- today workout generation ----
document.getElementById("genWorkoutBtn").addEventListener("click", async (e) => {
  const btn = e.target;
  const program = programs.find(p => p.id === state.activeProgramId);
  if (!program) return;
  btn.disabled = true; btn.textContent = "Generating…";
  try {
    const { phase } = currentPhaseFor(program);
    const key = phaseKeyFor(program, phase);
    const dayIndex = (state.pendingWorkout && state.pendingWorkout.programId === program.id && state.pendingWorkout.phaseKey === key)
      ? state.pendingWorkout.dayIndex : 0;
    const avoidNames = state.pendingWorkout?.workout?.exercises?.map(ex => ex.name) || [];
    const workout = await generateTodayWorkout(program, dayIndex, avoidNames);
    state.pendingWorkout = { programId: program.id, phaseKey: key, dayIndex, workout, completed: false };
    await persistNow();
    renderTodayWorkout(workout);
  } catch (err) {
    alert("Couldn't generate a workout: " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Regenerate";
  }
});

// Travel mode: restricts today's-workout generation to gear likely to be on
// hand while traveling (see TRAVEL_EQUIPMENT in generateTodayWorkout). Full session,
// not minimum-day — the point is swapping out equipment you don't have on
// the road, not lowering the bar. Regenerates today's workout immediately
// so the toggle takes visible effect, same dayIndex-preserving pattern as
// the Regenerate button above.
function syncTravelModeLabel() {
  const el = document.getElementById("travelModeState");
  el.textContent = state.travelMode ? "On" : "Off";
  el.style.color = state.travelMode ? "var(--accent)" : "var(--text-muted)";
  const barLink = document.getElementById("findBarLink");
  if (barLink) barLink.classList.toggle("hidden", !state.travelMode);
}
function syncTravelModeLegendVisibility() {
  const el = document.getElementById("travelModeExplainer");
  if (el) el.classList.toggle("hidden", state.dismissedTravelModeLegend);
}
document.getElementById("dismissTravelModeLegendBtn").addEventListener("click", async () => {
  state.dismissedTravelModeLegend = true;
  await persistNow();
  syncTravelModeLegendVisibility();
});
function syncWaistExplainerVisibility() {
  const el = document.getElementById("waistExplainer");
  if (el) el.classList.toggle("hidden", state.dismissedWaistExplainer);
}
document.getElementById("dismissWaistExplainerBtn").addEventListener("click", async () => {
  state.dismissedWaistExplainer = true;
  await persistNow();
  syncWaistExplainerVisibility();
});
document.getElementById("waistChart").addEventListener("click", async (e) => {
  if (!e.target.dataset.dismissWaistHint) return;
  state.dismissedWaistEmptyHint = true;
  await persistNow();
  renderProgressCharts();
});
function syncSkillPracticeIntroVisibility() {
  const el = document.getElementById("skillPracticeIntro");
  if (el) el.classList.toggle("hidden", state.dismissedSkillPracticeIntro);
}
document.getElementById("dismissSkillIntroBtn").addEventListener("click", async () => {
  state.dismissedSkillPracticeIntro = true;
  await persistNow();
  syncSkillPracticeIntroVisibility();
});

// ---- Seasonal themes. Autumn is the base look (the :root values), so it overrides nothing.
// A theme only lists the CSS variables it changes. The chosen id is saved in state.settings.theme (server), and its
// variables are cached on the phone too, only so the right colours show before the app finishes loading.
const THEMES = {
  autumn: { label: "Autumn", season: "autumn", swatch: "#FF7A3D", meta: "#120F0D", vars: {} },
  winter: { label: "Winter", season: "winter", swatch: "#5EB6E8", meta: "#0D1218", vars: {"--accent": "#5EB6E8", "--accent-dark": "#2F86B8", "--accent-soft": "#A9D8F2", "--accent-pale": "#DDF0FA", "--accent-bg": "#14283A", "--accent-bg-2": "#183247", "--accent-deep": "#1D4A66", "--accent-hot": "#3C9BD0", "--accent-line": "#2A5573", "--gold": "#D6E6F2", "--gold-bg": "#1A2A38", "--gold-deep": "#33505F", "--warn": "#9FD0EA", "--slate": "#8FA8C0", "--sand": "#9DB8CC", "--sand-pale": "#C2D6E4", "--bg": "#0D1218", "--ink": "#0D1218", "--surface": "#151C25", "--surface-2": "#1D2631", "--surface-3": "#232F3B", "--surface-deep": "#0A0E13", "--surface-deep-2": "#10161D", "--surface-warm": "#16212B", "--border": "#2A3644", "--border-2": "#38475A", "--border-3": "#4A5B70", "--border-4": "#2E3A48", "--track": "#2E3C4B", "--text": "#CBD6DF", "--text-muted": "#8393A3", "--text-dim": "#6C7C8C", "--text-faint": "#667585", "--text-faint-2": "#8493A2", "--text-faint-3": "#74838F", "--surface-neutral": "#222A33", "--accent-rgb": "94,182,232", "--gold-rgb": "214,230,242", "--ink-rgb": "13,18,24"} },
  spring: { label: "Spring", season: "spring", swatch: "#8CCB5E", meta: "#0F130D", vars: {"--accent": "#8CCB5E", "--accent-dark": "#5E9E34", "--accent-soft": "#C4E6A8", "--accent-pale": "#E6F5D8", "--accent-bg": "#1B2A14", "--accent-bg-2": "#233618", "--accent-deep": "#3A5C22", "--accent-hot": "#6DB33F", "--accent-line": "#34502A", "--gold": "#F2A6C0", "--gold-bg": "#2E1A22", "--gold-deep": "#5A3446", "--warn": "#F2C26B", "--slate": "#A3B58F", "--sand": "#B8C7A0", "--sand-pale": "#D6E0C4", "--bg": "#0F130D", "--ink": "#0F130D", "--surface": "#171D14", "--surface-2": "#1F271B", "--surface-3": "#262F21", "--surface-deep": "#0B0E09", "--surface-deep-2": "#12170F", "--surface-warm": "#1B2417", "--border": "#2B3626", "--border-2": "#3A4833", "--border-3": "#4D5E44", "--border-4": "#313D2B", "--track": "#2F3B29", "--text": "#D3DBC8", "--text-muted": "#8E9A82", "--text-dim": "#707C65", "--text-faint": "#6A755F", "--text-faint-2": "#8A957E", "--text-faint-3": "#78836D", "--surface-neutral": "#232A1F", "--accent-rgb": "140,203,94", "--gold-rgb": "242,166,192", "--ink-rgb": "15,19,13"} },
  summer: { label: "Summer", season: "summer", swatch: "#FFB627", meta: "#0A1315", vars: {"--accent": "#FFB627", "--accent-dark": "#D98E0A", "--accent-soft": "#FFD98A", "--accent-pale": "#FFF0CC", "--accent-bg": "#2E2208", "--accent-bg-2": "#3A2B0A", "--accent-deep": "#6B4C0A", "--accent-hot": "#F29A0E", "--accent-line": "#5A4410", "--gold": "#3DD6C6", "--gold-bg": "#0E2B2A", "--gold-deep": "#1F5A55", "--warn": "#FF8A5C", "--slate": "#7FB4C0", "--sand": "#9CC7C9", "--sand-pale": "#C5E0E0", "--bg": "#0A1315", "--ink": "#0A1315", "--surface": "#111C1F", "--surface-2": "#182629", "--surface-3": "#1E2F33", "--surface-deep": "#070E10", "--surface-deep-2": "#0D1719", "--surface-warm": "#132226", "--border": "#223338", "--border-2": "#2F4549", "--border-3": "#405C61", "--border-4": "#263A3E", "--track": "#26393D", "--text": "#CFE0E0", "--text-muted": "#85A0A3", "--text-dim": "#668387", "--text-faint": "#607C80", "--text-faint-2": "#809CA0", "--text-faint-3": "#6E8A8E", "--surface-neutral": "#1D2A2D", "--accent-rgb": "255,182,39", "--gold-rgb": "61,214,198", "--ink-rgb": "10,19,21"} },
};
function currentSeason(d = new Date()) {
  const m = d.getMonth();
  return m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn";
}
function themeBaseVars() { return Object.assign({}, ...Object.values(THEMES).map(th => th.vars)); }
function applyTheme(id) {
  const th = THEMES[id] || THEMES.autumn, root = document.documentElement;
  Object.keys(themeBaseVars()).forEach(k => root.style.removeProperty(k));
  Object.entries(th.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", th.meta || "#120F0D");
  try { localStorage.setItem("tf_theme_vars", JSON.stringify({ id, vars: th.vars })); } catch (e) {}
}
function renderThemePicker() {
  const el = document.getElementById("themePicker"); if (!el) return;
  const cur = state.settings?.theme || "autumn";
  el.innerHTML = Object.entries(THEMES).map(([id, th]) => `<button class="tf-themechip${id === cur ? " on" : ""}" data-theme-pick="${id}"><i style="background:${th.swatch}"></i>${th.label}</button>`).join("");
}
function renderThemeSuggest() {
  const el = document.getElementById("themeSuggest"); if (!el) return;
  const season = currentSeason(), cur = THEMES[state.settings?.theme || "autumn"] || THEMES.autumn;
  const key = season + new Date().getFullYear();
  const match = Object.entries(THEMES).find(([, th]) => th.season === season);
  if (!match || cur.season === season || state.settings?.themeDismissed === key) { el.classList.add("hidden"); el.innerHTML = ""; return; }
  el.classList.remove("hidden");
  el.innerHTML = `<div class="tf-themecard"><div class="tx"><b>${match[1].label} is here</b>Want the ${match[1].label.toLowerCase()} look?</div><button data-theme-no="${key}">Not now</button><button class="go" data-theme-pick="${match[0]}">Switch</button></div>`;
}
document.addEventListener("click", async (e) => {
  const pick = e.target.closest("[data-theme-pick]"), no = e.target.closest("[data-theme-no]");
  if (!pick && !no) return;
  state.settings = state.settings || {};
  if (pick) { state.settings.theme = pick.dataset.themePick; applyTheme(state.settings.theme); }
  else state.settings.themeDismissed = no.dataset.themeNo;
  renderThemePicker(); renderThemeSuggest();
  await persistNow();
});
function applyFeedbackSetting() { document.body.classList.toggle("tf-calm", state.settings?.feedback === false); }
function buzz(p) { try { if (state.settings?.feedback !== false && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
document.getElementById("feedbackToggle").addEventListener("change", async (e) => {
  state.settings.feedback = e.target.checked; applyFeedbackSetting(); buzz(20); await persistNow();
});
document.getElementById("travelModeToggle").addEventListener("click", async () => {
  state.travelMode = !state.travelMode;
  syncTravelModeLabel();
  renderChestBoosters();
  await persistNow();
  const program = programs.find(p => p.id === state.activeProgramId);
  if (!program) return;
  const { phase } = currentPhaseFor(program);
  const key = phaseKeyFor(program, phase);
  const dayIndex = (state.pendingWorkout && state.pendingWorkout.programId === program.id && state.pendingWorkout.phaseKey === key)
    ? state.pendingWorkout.dayIndex : 0;
  const box = document.getElementById("todayWorkout");
  box.innerHTML = '<div class="empty">Regenerating for travel…</div>';
  try {
    const workout = await generateTodayWorkout(program, dayIndex);
    state.pendingWorkout = { programId: program.id, phaseKey: key, dayIndex, workout, completed: false };
    await persistNow();
    renderTodayWorkout(workout);
  } catch (err) {
    box.innerHTML = `<div class="empty">Couldn't regenerate (${err.message}). Use Regenerate below to retry.</div>`;
  }
});

// ---- library search/filter ----
let currentMg = "all";
let currentLevel = "all";
let currentEquip = "all";
document.getElementById("exerciseSearch").addEventListener("input", (e) => renderExercises(e.target.value, currentMg, currentLevel, currentEquip));
document.getElementById("muscleFilterChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#muscleFilterChips .chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  currentMg = chip.dataset.mg;
  renderExercises(document.getElementById("exerciseSearch").value, currentMg, currentLevel, currentEquip);
});
document.getElementById("levelFilterChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#levelFilterChips .chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  currentLevel = chip.dataset.level;
  renderExercises(document.getElementById("exerciseSearch").value, currentMg, currentLevel, currentEquip);
});
document.getElementById("equipmentFilterChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#equipmentFilterChips .chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  currentEquip = chip.dataset.equip;
  renderExercises(document.getElementById("exerciseSearch").value, currentMg, currentLevel, currentEquip);
});
document.getElementById("exerciseList").addEventListener("click", async (e) => {
  const howtoBtn = e.target.closest("[data-howto-open]");
  if (howtoBtn) {
    document.querySelector(`[data-howto-panel="${howtoBtn.dataset.howtoOpen}"]`)?.classList.toggle("hidden");
    return;
  }
  const id = e.target.dataset.delEx;
  if (!id) return;
  if (!confirm("Remove this exercise from the library?")) return;
  await apiFetch("/api/exercises/" + id, { method: "DELETE" });
  await loadExercises();
  renderExercises(document.getElementById("exerciseSearch").value, currentMg, currentLevel, currentEquip);
});

// ---- settings ----
document.getElementById("workerUrlInput").value = WORKER_URL;
document.getElementById("saveWorkerUrlBtn").addEventListener("click", async () => {
  WORKER_URL = document.getElementById("workerUrlInput").value.trim();
  localStorage.setItem(LS_WORKER_URL_KEY, WORKER_URL);
  await init();
  alert("Saved. Reconnected to " + (WORKER_URL || "local-only mode") + ".");
});

document.getElementById("tfTokenInput").value = tfToken();
document.getElementById("saveTfTokenBtn").addEventListener("click", async () => {
  try { localStorage.setItem(LS_TOKEN_KEY, document.getElementById("tfTokenInput").value.trim()); } catch (e) {}
  askedForToken = false;
  await init();
  alert("Saved. Reconnecting…");
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ state, exercises, programs }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `train-fuel-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});
document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importInput").click());
document.getElementById("importInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); } catch (err) { alert("That file isn't a valid backup. Nothing was changed."); return; }
    const inc = parsed && parsed.state;
    if (!inc || typeof inc !== "object" || !Array.isArray(inc.logs) || !inc.settings) {
      alert("That file doesn't look like a Train & Fuel backup. Nothing was changed."); return;
    }
    const n = o => `${(o.logs || []).length} workouts, ${(o.foodLogs || []).length} food entries`;
    if (!confirm(`Replace what's on this phone and the server?\n\nBackup: ${n(inc)}\nCurrent: ${n(state)}\n\nThis can't be undone. Export a backup first if unsure.`)) return;
    state = inc;
    await persistNow();
    alert("Backup restored and synced.");
  };
  reader.readAsText(file);
});

document.getElementById("startDateInput").addEventListener("change", async (e) => {
  state.settings.startDate = e.target.value;
  await persistNow();
});

// ---- starting level per movement pattern ----
const STARTING_LEVEL_MAP = { beginner: 1, intermediate: 3, advanced: 5 };
const MUSCLE_GROUPS = ["legs", "hinge", "core", "ruck"];
// push/pull are calibrated per plane now, not as one flat group — see the
// movement-plane split in generateTodayWorkout/applyWorkoutResults.
const PLANE_GROUPS = ["push_h", "push_v", "pull_h", "pull_v"];
const PLANE_GROUP_LABELS = { push_h: "Push (horizontal)", push_v: "Push (vertical)", pull_h: "Pull (horizontal)", pull_v: "Pull (vertical)" };

function renderStartingLevelSettings() {
  const el = document.getElementById("startingLevelSettings");
  const rowHtml = (key, label) => `
    <div class="mt10">
      <div class="meta mb4">${label}</div>
      <div class="row">
        ${["beginner", "intermediate", "advanced"].map(lvl => `
          <div class="chip ${state.settings.startingLevels[key] === lvl ? "active" : ""}" data-start-mg="${key}" data-start-lvl="${lvl}">${lvl.charAt(0).toUpperCase() + lvl.slice(1)}</div>
        `).join("")}
      </div>
    </div>`;
  el.innerHTML = PLANE_GROUPS.map(key => rowHtml(key, PLANE_GROUP_LABELS[key])).join("")
    + MUSCLE_GROUPS.map(mg => rowHtml(mg, mg.charAt(0).toUpperCase() + mg.slice(1))).join("");
}

document.getElementById("startingLevelSettings").addEventListener("click", async (e) => {
  const chip = e.target.closest("[data-start-mg]");
  if (!chip) return;
  const mg = chip.dataset.startMg, lvl = chip.dataset.startLvl;
  state.settings.startingLevels[mg] = lvl;
  await persistNow();
  renderStartingLevelSettings();
});

// Applies the calibrated starting level to any muscle group/plane that has
// never actually been logged yet — protects already-earned progress on
// anything you've trained. For push/pull this checks per PLANE (have you
// ever logged a horizontal push specifically?), not just the muscle group,
// since a never-touched vertical pattern should still be calibratable even
// after you've logged plenty of horizontal work.
async function applyStartingLevelsIfUntrained() {
  const trainedGroups = new Set((state.logs || []).map(l => l.muscle_group));
  const trainedPlaneGroups = new Set((state.logs || [])
    .filter(l => l.muscle_group === "push" || l.muscle_group === "pull")
    .map(l => `${l.muscle_group}_${planeOf(l.exercise, l.muscle_group)}`));
  MUSCLE_GROUPS.forEach(mg => {
    if (!trainedGroups.has(mg)) {
      const lvl = state.settings.startingLevels?.[mg] || "beginner";
      state.progressLevels[mg] = STARTING_LEVEL_MAP[lvl];
    }
  });
  state.planeLevels = state.planeLevels || { push_h: 1, push_v: 1, pull_h: 1, pull_v: 1 };
  PLANE_GROUPS.forEach(key => {
    if (!trainedPlaneGroups.has(key)) {
      const lvl = state.settings.startingLevels?.[key] || "beginner";
      state.planeLevels[key] = STARTING_LEVEL_MAP[lvl];
    }
  });
  state.progressLevels.push = Math.max(state.planeLevels.push_h, state.planeLevels.push_v);
  state.progressLevels.pull = Math.max(state.planeLevels.pull_h, state.planeLevels.pull_v);
  await persistNow();
}

// ---- init ----
// ---- session notes / questions ----
// Stored in state (synced to the server like everything else) so they survive
// a device wipe. Each note keeps the exercise or day it was written on.
function notesContext(explicit) {
  if (explicit) return explicit;
  const pw = state.pendingWorkout;
  return pw && pw.workout && pw.workout.day ? pw.workout.day : "";
}
async function addSessionNote(text, context) {
  const t = String(text || "").trim();
  if (!t) return false;
  state.sessionNotes = state.sessionNotes || [];
  state.sessionNotes.unshift({ id: "n" + Date.now(), at: new Date().toISOString(), text: t, context: notesContext(context), done: false });
  await persistNow();
  renderNotes();
  renderBellCoach();
  return true;
}
function renderNotes() {
  const list = document.getElementById("notesList");
  const sum = document.getElementById("notesSummary");
  if (!list) return;
  const notes = state.sessionNotes || [];
  const open = notes.filter(n => !n.done).length;
  if (sum) sum.innerHTML = open ? `Notes<span class="tf-sv">${open} open</span>` : "Notes";
  if (!notes.length) { list.innerHTML = '<div class="empty">No notes yet.</div>'; return; }
  list.innerHTML = notes.map(n => `
    <div class="list-item" style="flex-direction:column; align-items:stretch; ${n.done ? "opacity:0.55;" : ""}">
      <div class="meta">${new Date(n.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${n.context ? " · " + escapeHtml(n.context) : ""}</div>
      <div style="margin-top:2px; white-space:pre-wrap;">${escapeHtml(n.text)}</div>
      <div class="row mt6">
        <button class="secondary" data-note-done="${n.id}" style="padding:4px 10px; font-size:13px;">${n.done ? "Reopen" : "Mark answered"}</button>
        <button class="danger-link" data-note-del="${n.id}" style="margin-left:auto;">Delete</button>
      </div>
    </div>`).join("");
}
document.getElementById("noteSaveBtn").addEventListener("click", async () => {
  const input = document.getElementById("noteInput");
  if (await addSessionNote(input.value)) input.value = "";
});
document.getElementById("notesList").addEventListener("click", async (e) => {
  const doneId = e.target.dataset.noteDone, delId = e.target.dataset.noteDel;
  if (!doneId && !delId) return;
  if (delId) state.sessionNotes = (state.sessionNotes || []).filter(n => n.id !== delId);
  else (state.sessionNotes || []).forEach(n => { if (n.id === doneId) n.done = !n.done; });
  await persistNow();
  renderNotes();
  renderBellCoach();
});
// "Note" buttons inside the guided session (rest and exercise screens).
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-quick-note]");
  if (!b) return;
  const ctx = b.dataset.quickNote;
  const text = window.prompt(`Note or question${ctx ? " about " + ctx : ""}:`);
  if (text && await addSessionNote(text, ctx)) b.textContent = "Note saved ✓";
});

// ---- Keep the screen awake while a guided session is on screen ----
let tfWakeLock = null;
function sessionIsOnScreen() {
  const p = document.getElementById("sessionPanel");
  const sx = p && p.getAttribute("data-sx");
  return !!(p && !p.classList.contains("hidden") && sx && sx !== "done");
}
async function syncWakeLock() {
  try {
    if (!("wakeLock" in navigator)) return;
    if (sessionIsOnScreen() && document.visibilityState === "visible") {
      if (!tfWakeLock) {
        tfWakeLock = await navigator.wakeLock.request("screen");
        tfWakeLock.addEventListener("release", () => { tfWakeLock = null; });
      }
    } else if (tfWakeLock) {
      const l = tfWakeLock; tfWakeLock = null; await l.release();
    }
  } catch (e) { tfWakeLock = null; }
}
new MutationObserver(syncWakeLock).observe(document.getElementById("sessionPanel"), { attributes: true, attributeFilter: ["class", "data-sx"] });
document.addEventListener("visibilitychange", syncWakeLock);

// ---- Swipe left/right between the three main tabs ----
(function () {
  const ORDER = ["coach", "food", "today"];
  let sx = 0, sy = 0, st = 0, ok = false;
  function blocked(t) {
    if (!t || !t.closest) return true;
    if (t.closest("input, textarea, select, [contenteditable], svg[data-noswipe]")) return true;
    // Don't hijack horizontally scrollable strips (week tabs, chip rows).
    for (let el = t; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2) return true;
    }
    const sp = document.getElementById("sessionPanel");
    if (sp && !sp.classList.contains("hidden") && sp.getAttribute("data-sx")) return true;
    const sheet = document.getElementById("tfExSheet");
    if (sheet && sheet.classList.contains("open")) return true;
    return false;
  }
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) { ok = false; return; }
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY; st = Date.now();
    ok = !blocked(e.target);
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!ok) return;
    ok = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - st > 700) return;
    const cur = document.querySelector("nav.tabs .tab-btn.active");
    const i = cur ? ORDER.indexOf(cur.dataset.tab) : -1;
    if (i < 0) return;
    const next = ORDER[i + (dx < 0 ? 1 : -1)];
    if (!next) return;
    const btn = document.querySelector(`nav.tabs .tab-btn[data-tab="${next}"]`);
    if (btn) { btn.click(); window.scrollTo(0, 0); buzz(10); }
  }, { passive: true });
})();

async function init() {
  await loadState();
  try { applyTheme(state.settings?.theme || "autumn"); renderThemePicker(); renderThemeSuggest(); } catch (e) {}
  await loadExercises();
  await loadPrograms();
  await migrateKbProgramArms();
  renderExercises();
  renderPrograms();
  renderSkillPractice();
  renderCelebrations();
  renderNotes();
  renderFlagsBanner();
  renderCoachNote();
  renderCoachTeaser();
  renderDailyCheckin();
  renderWeighInDetailsState();
  renderProgressCharts();
  renderRecentCardio();
  renderStartingLevelSettings();
  renderMacroSummary();
  renderQuickProteinChips();
  renderQuickDrinkChips();
  document.getElementById("foodLogDate").value = localDateStr();
  renderFoodLogList();
  if (state.settings?.startDate) document.getElementById("startDateInput").value = state.settings.startDate;
  document.getElementById("ringStrapPush").value = state.ringStrap?.push ?? "";
  document.getElementById("heightInches").value = state.settings.heightInches || "";
  document.getElementById("goalWeightInput").value = state.settings.goalWeight || "";
  document.getElementById("goalBodyFatInput").value = state.settings.goalBodyFatPct || "";
  const t = state.settings.macroTargets || {};
  document.getElementById("targetCalories").value = t.calories || "";
  document.getElementById("targetProtein").value = t.protein || "";
  document.getElementById("targetCarbs").value = t.carbs || "";
  document.getElementById("targetFat").value = t.fat || "";
  document.getElementById("weeklyGoalInput").value = state.settings.weeklyWorkoutGoal || 3;
  document.getElementById("feedbackToggle").checked = state.settings.feedback !== false;
  try { renderSettingsTiles(); } catch (e) {}
  syncTravelModeLabel();
  syncTravelModeLegendVisibility();
  syncSkillPracticeIntroVisibility();
  syncWaistExplainerVisibility();
  document.getElementById("appBuildInfo").textContent = `Build: ${APP_BUILD}`;
  renderMacroSuggestionHistory();
  checkScanInterrupted();
}
init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
