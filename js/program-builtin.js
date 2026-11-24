// ---- built-in Kettlebell program (one bell) ----
// Unlike AI programs (muscle-group slots the generator fills), these days list
// exact exercises ("fixed"): swings must be swings. Each bell move names a
// bodyweight stand-in ("tr") used when Travel mode is on, so the same day still
// works in a hotel room. Slots are kept alongside so pacing, previews and the
// warm-up region logic work like any other program.
const KB_TRAVEL = {
  "kb-swing":              { id: "hip-thrust-bw",          reps: "12-15" },
  "kb-swing-1h":           { id: "single-leg-glute-bridge", reps: "10-12", note: "each side", emom: false },
  "kb-complex":            { id: "bw-complex",             reps: "4", note: "4 of each: good morning, lunge, push-up, squat", emom: true },
  "kb-goblet-squat":       { id: "box-squat-high",         reps: "10-12" },
  "kb-rack-reverse-lunge": { id: "reverse-lunge",          reps: "8-10", note: "each side" },
  "kb-press-hk":           { id: "pike-pushup-hands-elevated", reps: "6-8" },
  "kb-floor-press":        { id: "pushup",                 reps: "8-12" },
  "kb-row":                { id: "backpack-row",           reps: "8-12" },
  "kb-row-2h":             { id: "backpack-row",           reps: "8-12" },
  "kb-clean":              { id: "doorframe-row",          reps: "8-12" },
  "kb-curl": ["Swinging the bell up with the back", "Elbow drifting forward", "Dropping it fast instead of lowering slowly"],
  "kb-overhead-triceps-ext": ["Elbows flaring wide", "Arching the lower back", "Lowering too fast behind the head"],
  "kb-sl-rdl":             { id: "glute-bridge-march",     reps: "8-10", note: "each side" },
  "kb-suitcase-carry":     { id: "side-plank",             reps: "20-30", note: "each side" },
  "kb-waiter-carry":       { id: "side-plank",             reps: "20-30", note: "each side" },
  "kb-halo":               { id: "dead-bug",               reps: "8-10", note: "each side", sets: 2 },
  "kb-figure8":            { id: "dead-bug",               reps: "8-10", note: "each side", sets: 2 },
  "kb-overhead-lunge":     { id: "reverse-lunge",          reps: "8-10", note: "each side" },
  "kb-turkish-getup":      { id: "dead-bug",               reps: "8-10", note: "each side", sets: 2 },
  "kb-deadlift":           { id: "good-morning-bw",        reps: "10-12" },
  "kb-dead-high-pull":     { id: "doorframe-row",          reps: "8-12" },
  "kb-dead-snatch":        { id: "backpack-row",           reps: "8-12" },
  "kb-windmill":           { id: "standing-twist",         reps: "8-10", note: "each side" },
  "kb-racked-squat":       { id: "box-squat-high",         reps: "10-12" },
  "kb-push-press":         { id: "pike-pushup-hands-elevated", reps: "6-8" },
};
function kbProgram() {
  // row: [id, sets, reps, note, supersetGroup]. Same letter = superset.
  const day = (name, rows, warmup, cooldown) => ({
    day: name,
    slots: rows.map(r => ({ muscle_group: (BUILTIN_EXERCISES.find(x => x.id === r[0]) || {}).muscle_group, sets: r[1], reps: r[2] })),
    fixed: {
      exercises: rows.map(r => ({ id: r[0], sets: r[1], reps: r[2], note: r[3] || null, sg: r[4] || null, emom: r[5] || null, tr: KB_TRAVEL[r[0]] || null })),
      warmup, cooldown,
    },
  });
  const wuA = [["open-book-rotation", "6 each side"], ["arm-circles", "10 each direction"], ["hip-hinge-drill", "8 slow reps"]];
  const wuB = [["cat-cow", "8 slow reps"], ["worlds-greatest-stretch", "4 each side"], ["hip-hinge-drill", "8 slow reps"]];
  const cdA = [["hip-90-90-stretch", "hold 45s each side"], ["doorway-chest-stretch", "hold 30s each side"], ["childs-pose-reach", "hold 45s, breathe slowly"]];
  const cdB = [["figure-4-glute-stretch", "hold 45s each side"], ["doorway-chest-stretch", "hold 30s each side"], ["childs-pose-reach", "hold 45s, breathe slowly"]];
  const S = "each side", EM = "one set every minute";
  // Every day trains push, pull, legs, hinge and core, so with three sessions a
  // week each group is hit at least twice. Paired rows are supersets (upper with
  // lower or push with pull) to keep sessions well under an hour.
  const A = (dl, sq, sw, pr, rw, pu, ca, wm, tg) => day("Bell A: squat, press, row", [
    [tg[0], tg[1], tg[2], tg[3] || null],
    ["kb-deadlift", dl[0], dl[1], null, "A"], ["kb-goblet-squat", sq[0], sq[1], null, "A"],
    ["kb-swing", sw[0], sw[1], null],
    ["kb-press-hk", pr[0], pr[1], S, "B"], ["kb-row", rw[0], rw[1], S, "B"],
    ["kb-suitcase-carry", ca[0], ca[1], "seconds " + S, wm ? "C" : null], ...(wm ? [["kb-windmill", wm[0], wm[1], S + ", no weight to start", "C"]] : []),
    ["kb-curl", 2, "8-10", S, "E"], ["kb-overhead-triceps-ext", 2, "8-10", null, "E"],
    ["pushup", pu[0], "8-12", null, "D"], ["plank", pu[0], pu[1], null, "D"],
  ], wuA, cdA);
  const B = (sw, pl, lg, fp, rd, wc, db, cx) => day("Bell B: hinge, pull, single leg", [
    ["kb-swing-1h", sw[0], sw[1], EM + ", switch hands", null, 60],
    [pl[0], pl[1], pl[2], S, "A"], ["kb-rack-reverse-lunge", lg[0], lg[1], S, "A"],
    ["kb-floor-press", fp[0], fp[1], S, "B"], ["kb-row-2h", 3, "8-10", null, "B"],
    ["kb-sl-rdl", rd[0], rd[1], S, null],
    ...(cx ? [["kb-complex", cx[0], "3", "3 of each: deadlift, clean, press, squat. Switch arms each round", null, 60]] : []),
    ["kb-waiter-carry", wc[0], wc[1], "seconds " + S, null],
    ["kb-curl", 2, "8-10", S, "E"], ["kb-overhead-triceps-ext", 2, "8-10", null, "E"],
    ["pushup", 2, "8-12", null, "C"], ["dead-bug", db, "8", S, "C"],
  ], wuB, cdB);
  const phase = (label, ws, we, dl, a, b) => ({ phase: label, week_start: ws, week_end: we, deload_weeks: [dl], days: [a, b, a, b].map(d => JSON.parse(JSON.stringify(d))) });
  return {
    id: "prog-kb-" + Date.now(),
    name: "Kettlebell A/B (one bell) v2",
    duration_weeks: 12,
    source: "built-in",
    structure: {
      name: "Kettlebell A/B (one bell) v2",
      rev: 5,
      session: { days: 4, minutes: "40-65" },
      phases: [
        phase("Foundation v2: learn the lifts", 1, 4, 4,
          A([2, "8"], [3, "8"], [5, "15"], [4, "3"], [3, "8"], [2, "30"], [3, "30"], null, ["kb-halo", 2, "8", "each direction"]),
          B([6, "10"], ["kb-dead-high-pull", 4, "5"], [3, "6"], [3, "8"], [3, "6"], [2, "20"], 2)),
        phase("Build v2: more volume", 5, 8, 8,
          A([3, "8"], [4, "8"], [4, "15"], [5, "3"], [3, "8"], [3, "40"], [3, "40"], [2, "4"], ["kb-figure8", 2, "10", "switch direction halfway"]),
          B([6, "10"], ["kb-clean", 4, "5"], [3, "8"], [3, "8"], [3, "8"], [2, "25"], 2, [5])),
        phase("Strength v2: heavier and denser", 9, 12, 12,
          A([3, "8"], [3, "8"], [5, "10"], [4, "4"], [3, "10"], [3, "45"], [3, "40"], [2, "5"], ["kb-figure8", 3, "10", "switch direction halfway"]),
          B([5, "10"], ["kb-dead-snatch", 4, "5"], [3, "8"], [3, "10"], [3, "8"], [2, "30"], 2, [6])),
      ],
    },
  };
}
// Daily short program: rings and bodyweight only, no kettlebell, no loaded spinal hinging. Five short sessions a
// week (Mon, Tue, Thu, Fri, Sat; Wed and Sun are rest). Slots are filled each day from the library at the current
// level, so progression works the same as any generated program. Every session is 7-8 sets, about 15-20 minutes.
function dailyShortProgram() {
  const S = (mg, sets, reps) => ({ muscle_group: mg, sets, reps: reps || "8-12", exercise_name: null });
  const days = () => [
    { day: "Push + core A", slots: [S("push", 3), S("push", 2), S("core", 3)] },
    { day: "Pull + legs A", slots: [S("pull", 3), S("pull", 2), S("legs", 3)] },
    { day: "Push + core B", slots: [S("push", 3), S("push", 2), S("core", 3)] },
    { day: "Pull + legs B", slots: [S("pull", 3), S("legs", 3), S("hinge", 2)] },
    { day: "Full body", slots: [S("push", 2), S("pull", 2), S("legs", 2), S("core", 2)] },
  ];
  const phase = (label, ws) => ({ phase: label, week_start: ws, week_end: ws + 3, deload_weeks: [ws + 3], days: days() });
  const name = "Daily short: rings and bodyweight";
  return {
    id: "prog-daily-" + Date.now(),
    name,
    duration_weeks: 24,
    source: "built-in",
    structure: {
      name,
      rev: 2,
      backBlock: true,
      session: { days: 5, minutes: "15-20" },
      equipment: ["bodyweight", "rings", "parallettes", "ab wheel"],
      avoid: ["good-morning-bw"],
      phases: [
        phase("Block 1: build the habit", 1), phase("Block 2: add reps", 5), phase("Block 3: harder variations", 9),
        phase("Block 4: keep going", 13), phase("Block 5: keep going", 17), phase("Block 6: keep going", 21),
      ],
    },
  };
}
// Rough session length in minutes for a built workout, using the same rest the
// guided session uses (15s inside a superset pair, 45s after a round, 60s after
// a solo set). Warm-up/cool-down items are about a minute each. An estimate, not a promise.
function estimateWorkoutMinutes(w) {
  const secs = (e) => {
    const r = parseRepRange(e.reps), top = r.max || r.min || 10;
    const side = /each/.test(e.note || "") ? 2 : 1;
    return (isHoldExercise(e.name) ? top : top * 3 + 10) * side;
  };
  let t = 0;
  const done = new Set();
  (w.exercises || []).forEach((e, i) => {
    if (done.has(i)) return;
    const mates = e.superset_group ? w.exercises.map((x, j) => j).filter(j => w.exercises[j].superset_group === e.superset_group) : [i];
    mates.forEach(j => done.add(j));
    if (mates.length === 1) {
      const per = e.emom ? e.emom : (/every minute/.test(e.note || "") ? 60 : secs(e) + 60);
      t += per * e.sets;
    } else {
      const rounds = Math.max(...mates.map(j => w.exercises[j].sets));
      for (let r = 0; r < rounds; r++) {
        const inRound = mates.filter(j => r < w.exercises[j].sets);
        t += inRound.reduce((a, j) => a + secs(w.exercises[j]), 0) + 15 * (inRound.length - 1) + 45;
      }
    }
  });
  t += ((w.warmup || []).length + (w.cooldown || []).length) * 60;
  return Math.round(t / 60);
}
// Builds a fixed-list day: bell moves, or their bodyweight stand-ins in Travel
// mode. Deload weeks cut sets by about a third. No AI call involved.
// The push-up and core finishers rotate weekly so the same two moves aren't
// repeated all program long. Weekly (not per session) so a move repeats on
// consecutive sessions, which is what the Target hints need. Skipped in travel
// mode, which stays bodyweight-only with its own substitutes.
const KB_FINISHER_ROTATION = {
  "pushup":   [{ id: "pushup" }, { id: "parallette-pushup" }, { id: "decline-pushup" }],
  "plank":    [{ id: "plank" }, { id: "plank-shoulder-tap", reps: "8", note: "each side" }, { id: "hollow-hold-tucked" }, { id: "ab-wheel-rollout-kneeling", reps: "6" }],
  "dead-bug": [{ id: "dead-bug" }, { id: "bird-dog" }, { id: "side-plank", reps: "20", note: "each side" }],
};
function kbFinisherVariant(f, week) {
  const list = KB_FINISHER_ROTATION[f && f.id];
  if (!list || !week || week < 1) return null;
  return list[(week - 1) % list.length];
}
function buildFixedWorkout(day, isDeload, weekNumber) {
  const used = new Set();
  const out = [];
  (day.fixed.exercises || []).forEach(f => {
    let lib = exercises.find(x => x.id === f.id);
    let reps = f.reps, note = f.note, emom = f.emom || null;
    if (state.travelMode && lib && lib.equipment === "kettlebell") {
      const sub = f.tr && exercises.find(x => x.id === f.tr.id);
      if (!sub) return;
      lib = sub; reps = f.tr.reps; note = f.tr.note || null;
      emom = f.tr.emom === true ? (f.emom || 60) : null;
    }
    if (!state.travelMode && weekNumber) {
      const v = kbFinisherVariant(f, weekNumber);
      const vl = v && v.id !== f.id ? exercises.find(x => x.id === v.id) : null;
      if (vl) { lib = vl; if (v.reps) reps = v.reps; if (v.note !== undefined) note = v.note; }
    }
    if (!lib || used.has(lib.name)) return;
    used.add(lib.name);
    const baseSets = state.travelMode && lib.equipment !== "kettlebell" && f.tr && f.tr.sets ? f.tr.sets : f.sets;
    const sets = isDeload ? Math.max(2, Math.round(baseSets * 0.65)) : baseSets;
    out.push({ name: lib.name, muscle_group: lib.muscle_group, sets, reps, superset_group: f.sg || null, note: note || null, emom });
  });
  // Letters in the stored program may not run in order of appearance (e.g. A, B, D, C); show A, B, C...
  const letterMap = {}; let nextLetter = 0;
  out.forEach(e => { if (e.superset_group) { if (!(e.superset_group in letterMap)) letterMap[e.superset_group] = String.fromCharCode(65 + nextLetter++); e.superset_group = letterMap[e.superset_group]; } });
  const pick = list => (list || []).map(([id, detail]) => {
    const m = exercises.find(x => x.id === id);
    return m ? { name: m.name, detail } : null;
  }).filter(Boolean);
  const result = { day: day.day, warmup: pick(day.fixed.warmup), exercises: out, cooldown: pick(day.fixed.cooldown) };
  // Same posture/hip staples as every other day (wall slides, levator stretch, glute bridge, hip-flexor stretch).
  return ensureShoulderStaples(result, allowedMobilityRegions(day.slots), day.slots);
}

async function generateTodayWorkout(program, dayIndex = 0, avoidNames = []) {
  {
    const cp = currentPhaseFor(program);
    const fd = cp.phase?.days?.[dayIndex] || cp.phase?.days?.[0];
    if (fd && fd.fixed) return buildFixedWorkout(fd, !!cp.phase?.deload_weeks?.includes(cp.weekNumber), cp.weekNumber);
  }
  const recentFromHistory = (state.logs || []).slice(-15).map(l => l.exercise);
  const recentNames = [...new Set([...avoidNames, ...recentFromHistory])].join(", ");
  const levels = state.progressLevels;
  const planeLevels = state.planeLevels || { push_h: 1, push_v: 1, pull_h: 1, pull_v: 1 };
  // Alternate which movement plane gets served for push/pull each time this
  // runs — a dead hang and a ring row are different movement patterns even
  // though both are "pull", so treating them as interchangeable meant one
  // pattern (usually the vertical, pull-up-specific one) could quietly get
  // starved. "h" first when nothing's been served yet.
  const planeFor = {
    push: state.lastPlaneServed?.push === "h" ? "v" : "h",
    pull: state.lastPlaneServed?.pull === "h" ? "v" : "h",
  };
  // Hard cap: never hand the AI an exercise harder than the person's current
  // tracked level. For push/pull this is now the PLANE-specific level (and
  // restricted to today's chosen plane) rather than one flat push/pull
  // number — previously the full ~170-exercise library (spanning levels
  // 1-5, and for push/pull, both horizontal and vertical patterns mixed
  // together) was passed with only a soft "scale difficulty" instruction,
  // which is how advanced moves like "Archer pull-up" or "Ring typewriter
  // push-up" slipped into a level 1-2 person's workout. Progression already
  // happens via the level-up mechanic (hitting max reps on all sets bumps
  // the level), so the AI doesn't need to reach for harder exercises or a
  // different plane on its own — filtering here is what actually enforces
  // it instead of just describing it in prose.
  let planeFilteredPush = [], planeFilteredPull = [];
  // Travel mode equipment restriction (TRAVEL_EQUIPMENT, module-level)
  // applied ahead of the level/plane filters below rather than as a
  // separate pass, so it composes with them instead of needing its own
  // fallback logic.
  const availableExercises = exercises.filter(e => {
    if (state.travelMode && !TRAVEL_EQUIPMENT.has(e.equipment || "bodyweight")) return false;
    if (e.equipment === "weighted vest") return false; // not owned
    if (program?.structure?.equipment && !program.structure.equipment.includes(e.equipment || "bodyweight")) return false;
    if (program?.structure?.avoid && program.structure.avoid.includes(e.id)) return false;
    if (e.id === "bw-complex") return false; // only used as the travel stand-in inside the kettlebell program
    // Skill-ladder exercises (handstand/L-sit/planche/back lever/front
    // lever/muscle-up) are deliberately NEVER auto-generated into a
    // workout — they live only in the dedicated Skill practice section,
    // done on your own schedule when fresh. Overcoming Gravity recommends
    // skill work fresh, not bolted onto an already-fatiguing session, and
    // the ladder's own 3-in-a-row streak gate depends on that — a skill
    // move randomly landing mid-workout after you're already gassed would
    // be an unfair test and could stall real progress on a technicality.
    if (SKILL_LADDER_MAP[e.id]) return false;
    if (e.muscle_group === "push" || e.muscle_group === "pull") {
      const plane = planeOf(e.id, e.muscle_group);
      if (plane !== planeFor[e.muscle_group]) return false;
      const cap = planeLevels[`${e.muscle_group}_${plane}`] ?? 1;
      const ok = levelOf(e.id) <= cap;
      if (ok) (e.muscle_group === "push" ? planeFilteredPush : planeFilteredPull).push(e);
      return ok;
    }
    const cap = levels[e.muscle_group];
    if (cap === undefined) return true; // untracked group (e.g. mobility) — no cap
    return levelOf(e.id) <= cap;
  });
  // Safety net: if today's chosen plane somehow has zero eligible exercises
  // at the person's level (shouldn't normally happen — every plane has a
  // level-1 option — but equipment gaps in a custom/imported library could
  // create one), fall back to the OTHER plane for that group rather than
  // handing the AI an empty push or pull slot.
  ["push", "pull"].forEach(mg => {
    const has = mg === "push" ? planeFilteredPush.length : planeFilteredPull.length;
    if (has > 0) return;
    const fallbackPlane = planeFor[mg] === "h" ? "v" : "h";
    planeFor[mg] = fallbackPlane;
    exercises.forEach(e => {
      if (e.muscle_group !== mg) return;
      if (SKILL_LADDER_MAP[e.id]) return; // skill-ladder exercises never auto-generate — see above
      if (state.travelMode && !TRAVEL_EQUIPMENT.has(e.equipment || "bodyweight")) return;
      if (program?.structure?.equipment && !program.structure.equipment.includes(e.equipment || "bodyweight")) return;
      if (program?.structure?.avoid && program.structure.avoid.includes(e.id)) return;
      const plane = planeOf(e.id, e.muscle_group);
      if (plane !== fallbackPlane) return;
      const cap = planeLevels[`${mg}_${plane}`] ?? 1;
      if (levelOf(e.id) <= cap) availableExercises.push(e);
    });
  });
  const availableList = availableExercises
    .map(e => {
      const planeTag = (e.muscle_group === "push" || e.muscle_group === "pull")
        ? `, ${planeOf(e.id, e.muscle_group) === "h" ? "horizontal" : "vertical"}` : "";
      return `${e.name} (${e.muscle_group}${planeTag}, ${e.equipment || "bodyweight"}${isHoldExercise(e.id) ? ", ISOMETRIC HOLD" : ""})`;
    }).join("; ");
  const { phase, weekNumber } = currentPhaseFor(program);
  const isDeload = phase?.deload_weeks?.includes(weekNumber);
  const day = phase?.days?.[dayIndex] || phase?.days?.[0];
  // Restrict what the AI even SEES to today's relevant body region(s) —
  // stronger than the prompt instruction alone, same guarantee-over-request
  // pattern used elsewhere (skill-ladder gating, the variety backstop below).
  const todayMobilityRegions = allowedMobilityRegions(day?.slots);
  const mobilityList = exercises.filter(e =>
    e.muscle_group === "mobility" && todayMobilityRegions.has(MOBILITY_REGION_MAP[e.id] || "full")
  ).map(e => `${e.name}${isHoldExercise(e.id) ? " (hold)" : " (dynamic)"}`).join("; ");
  const recoveryCaution = isLosingTooFast();
  const system = `You pick specific exercises from a provided library to fill a day's
muscle-group slots, prioritizing variety from recent sessions while keeping the
muscle group correct so progression still counts. The available exercises list
below has ALREADY been filtered to only include exercises at or below the
person's current level for each muscle group — every exercise you see there is
safe to pick regardless of muscle group. Do not second-guess this by favoring
only the easiest items out of caution, but also never invent, substitute, or
reach for a harder variant that isn't in the list, even if you think the person
is ready for it (that's handled separately, by a level-up system, not by you).
Push and pull exercises are also tagged "horizontal" or "vertical" in the
list — that's the movement plane (horizontal = push-up/row pattern, vertical
= overhead-press/dip or dead-hang/pull-up pattern), and the list has ALREADY
been restricted to just one plane per group for today, alternating session to
session so both patterns get trained over time instead of one being
neglected. Every push item and every pull item shown is the same plane, so a
push+pull superset pairing will naturally stay plane-matched too — you don't
need to reason about plane balance yourself, just pick from what's given.
Set the reps field's top end to roughly match how hard a given pick is: lighter
regressions top out around 8, standard versions around 10-12, harder variants
around 12-15 or note added difficulty (tempo, pause, unilateral) instead of
just more reps.
For exercises marked ISOMETRIC HOLD in the available list, the reps field means
SECONDS to hold, not a rep count (e.g. "20-30" means hold 20-30 seconds), scaled
to level the same way (level 1-2 shorter holds ~15-20s, level 4-5 longer ~40-60s).
Pair exercises into supersets whenever it genuinely makes sense — classically
antagonist muscle groups worked back-to-back with minimal rest between them
(push+pull is the standard pairing; e.g. ring push-up paired with ring row).
Give paired exercises the same superset_group letter (e.g. "A"); leave
superset_group null for anything that stands alone (e.g. legs, core, ruck days
where there's no natural antagonist pairing, or when today's slots don't split
evenly). Don't force a pairing where the muscle groups don't logically complement
each other, and don't superset more than two exercises together.
${isDeload ? "This is a DELOAD week for this phase — reduce sets and/or reps by roughly 30-40% across all exercises." : ""}
${recoveryCaution ? "RECOVERY CAUTION: recent weight loss is outpacing the target rate, a sign recovery capacity may be compromised. Favor holding at the current level's difficulty rather than the hardest variant available for that level, and avoid adding extra intensity techniques (drop sets, extra tempo/pause) this session." : ""}
Also include a short warmup and cool-down, selected from the mobility library
below — not invented. The list below has ALREADY been filtered to only items
relevant to today's muscle groups (so every item in it is a safe, on-topic
pick), but still choose ones that make sense for the SPECIFIC slots today
rather than generic. Warmup: 2-3 items marked
(dynamic) from the list (~3-4 minutes total). Cool-down: 1-2 items marked
(hold) from the list, for the muscles just worked (~2 minutes total). All
mobility library items are already bodyweight-only, so this works anywhere
including while traveling. ${program?.structure?.session ? `This is a ${program.structure.session.minutes}-minute session overall, so give the person a full, efficient workout (follow the slots below; keep warm-up to 2 items and cool-down to 1 when the session is 15-20 minutes; pair them as supersets with short rest).` : "Genuinely quick — this is a 20-25 minute session overall."} Prefer different warmup/cool-down items than last session where a
good alternative exists for the same muscle groups, rather than defaulting
to the same handful every time — see "Last session's warmup/cool-down"
below.
Mobility library: ${mobilityList}
${todayMobilityRegions.has("upper") ? `The person has one shoulder sitting lower than the other (desk and driving posture). Wall slides (warmup) and Levator scapulae stretch (cool-down) are added automatically every upper-body day, so do NOT list them yourself. In addition, when it fits, include one more shoulder-balance item in the warmup (dynamic) or cool-down (hold) from: ${exercises.filter(e => SHOULDER_BALANCE_IDS.includes(e.id) && e.id !== SHOULDER_STAPLE_COOLDOWN_ID).map(e => e.name).join("; ")}. Rotate that extra one session to session.` : ""}
Last session's warmup/cool-down (vary from these if reasonable alternates fit today's muscle groups): ${(state.lastWarmupCooldownNames || []).join(", ") || "none yet"}.
If a slot below includes an exercise_name, that's what the person's original
program specifically prescribed — use that exact exercise if it appears in
the available list below, rather than substituting a different one for that
muscle group. The available list is already level-filtered, so if the named
exercise doesn't appear there it means it's too advanced for their current
level right now — in that case just pick a same-muscle-group alternative
from the available list instead, no need to flag it.
Respond with ONLY valid JSON.`;
  const prompt = `Available exercises: ${availableList}.
Recently used (avoid repeating if a same-muscle-group alternative exists): ${recentNames || "none yet"}.
Current level per muscle group (1-5): ${JSON.stringify(levels)}.
Today's push/pull plane focus: ${JSON.stringify(planeFor)}.
Current phase: ${phase?.phase || "n/a"}, week ${weekNumber}${isDeload ? " (deload)" : ""}.
Today's day: "${day?.day || "n/a"}", slots: ${JSON.stringify(day?.slots || [])}.
Output JSON: {"day": "string", "warmup": [{"name": "exact name from mobility library", "detail": "string, e.g. 30s each side"}], "exercises": [{"name": "string", "muscle_group": "string", "sets": 3, "reps": "8-12", "superset_group": "A"}], "cooldown": [{"name": "exact name from mobility library", "detail": "string, e.g. hold 20s"}]}
superset_group is a letter shared by paired exercises, or null if standalone.`;
  const data = await apiFetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt, max_tokens: 2000 }),
  });
  const text = data.content?.[0]?.text || "{}";
  // enforceWarmupCooldownVariety is the hard backstop: the prompt above asks
  // the AI to vary from last session, but that's advisory, so this forces a
  // genuinely different pick when one is available rather than trusting the
  // AI followed the instruction.
  const lastLogDate = (state.logs || []).length ? state.logs[state.logs.length - 1].date : null;
  const lastSessionNames = new Set([
    ...avoidNames,
    ...(lastLogDate ? state.logs.filter(l => l.date === lastLogDate).map(l => l.exercise) : []),
  ]);
  const result = ensureShoulderStaples(
    enforceSlotCount(enforceMainVariety(
      enforceWarmupCooldownVariety(extractJson(text), todayMobilityRegions),
      availableExercises, lastSessionNames, new Set(recentFromHistory)
    ), day?.slots),
    todayMobilityRegions,
    day?.slots
  );
  // Remembered so the NEXT generation's prompt (above) can nudge away from
  // repeating the same warmup/cool-down items — callers already persist
  // state right after calling this, so no separate save needed here.
  addBackBlock(result, program);
  state.lastWarmupCooldownNames = [
    ...(result.warmup || []).map(w => w.name),
    ...(result.cooldown || []).map(c => c.name),
  ].filter(Boolean);
  return result;
}

// Two-minute lower-back prep at the front of every warm-up in the daily short program: cat-cow to loosen the
// spine, bird-dog to switch on the back and glutes, dead bug to brace the core. Gentle, no load, no spinal flexion
// under weight. Skipped for any move already in today's main work (the fallback is a glute bridge).
function addBackBlock(result, program) {
  if (!result || !(program?.structure?.backBlock || /^prog-daily-/.test(program?.id || ""))) return result;
  const inMain = name => (result.exercises || []).some(e => e && e.name && e.name.toLowerCase() === name.toLowerCase());
  const want = [["cat-cow", "6 slow reps"], ["bird-dog", "5 each side, hold 3 seconds"], ["dead-bug", "6 each side, slow"]];
  const block = [];
  want.forEach(([id, detail]) => {
    let ex = exercises.find(x => x.id === id);
    if (ex && inMain(ex.name)) { ex = exercises.find(x => x.id === "glute-bridge"); detail = "10 slow reps"; }
    if (ex && !block.some(b => b.name === ex.name)) block.push({ name: ex.name, detail });
  });
  const have = new Set(block.map(b => b.name.toLowerCase()));
  result.warmup = [...block, ...(result.warmup || []).filter(w => w && w.name && !have.has(w.name.toLowerCase()))];
  return result;
}

let currentWorkout = null;

// Checks whether today's workout shares a muscle group with the last
// completed session, with no rest day in between (calendar-day gap <= 1).
// Purely a heads-up — doesn't block or change anything automatically.
function restDayCaution(workout) {
  const logs = state.logs || [];
  if (!logs.length || !workout) return null;
  const sorted = logs.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastDate = new Date(sorted[0].date);
  const lastDateStr = lastDate.toDateString();
  const lastGroups = new Set(sorted.filter(l => new Date(l.date).toDateString() === lastDateStr).map(l => l.muscle_group));

  const today = new Date();
  const dayGap = Math.round((new Date(today.toDateString()) - new Date(lastDateStr)) / (24 * 60 * 60 * 1000));
  if (dayGap > 1) return null; // at least one rest day already happened

  const todayGroups = new Set(workout.exercises.map(e => e.muscle_group));
  const overlap = [...todayGroups].filter(mg => lastGroups.has(mg));
  if (!overlap.length) return null;

  return `Rest day check: ${overlap.join(", ")} trained ${dayGap === 0 ? "earlier today" : "yesterday"} too — no rest day between sessions for ${overlap.length > 1 ? "these muscle groups" : "this muscle group"}. Consider resting it today or swapping to something else.`;
}

// Same idea as travel mode, but for the other named consistency trigger:
// stress/busy periods, which don't have an equipment fix — the existing
// "minimum day" mode is already the right tool, it just wasn't surfaced
// proactively. "Stress" has to have actually been logged as a check-in
// reason recently (not inferred) — this only nudges toward what's already
// there, it doesn't gate or change anything about today's workout itself.
function recentStressCaution(days = 3) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = (state.measurements || []).some(m =>
    new Date(m.date).getTime() >= cutoff && m.reasons && m.reasons.includes("Stress"));
  if (!recent) return null;
  return "Stress logged recently — no pressure for the full session today. \"Do the minimum\" below still counts.";
}

// Today "Steady" look: one card (progress ring + what today is) and an open list of the moves.
// What success looks like here: showing up, not the scale. Training days, food logged, walks, and how fast you
// get back after a gap. Weight stays visible, but small.
function consistencyStats() {
  const goal = state.settings?.weeklyWorkoutGoal || 5;
  const trained = new Set((state.logs || []).map(l => dayKeyOf(l.date)));
  const walked = new Set((state.cardioLogs || []).map(l => dayKeyOf(l.date)));
  const today = localDateStr();
  const weekCount = off => weekDayList(off).filter(d => trained.has(d) && d <= today).length;
  const weeks = [-3, -2, -1, 0].map(o => weekCount(o));
  const now = new Date();
  const dayAgo = n => localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  let logged7 = 0, walk7 = 0, proteinHit = 0;
  const pT = state.settings?.macroTargets?.protein || 0;
  for (let i = 0; i < 7; i++) {
    const ds = dayAgo(i), fl = foodLogsForDate(ds);
    if (fl.length) logged7++;
    if (pT && fl.reduce((n, f) => n + (f.protein || 0), 0) >= pT) proteinHit++;
    if (walked.has(ds)) walk7++;
  }
  let sinceTrain = null;
  for (let i = 0; i < 60; i++) { if (trained.has(dayAgo(i))) { sinceTrain = i; break; } }
  return { goal, weeks, thisWeek: weeks[3], logged7, walk7, proteinHit, sinceTrain };
}
function renderCoachHero() {
  const el = document.getElementById("coachHero");
  if (!el) return;
  const c = consistencyStats();
  let line;
  if (c.sinceTrain === null) line = "Your first session is the whole goal.";
  else if (c.sinceTrain <= 1) line = c.thisWeek >= c.goal ? "Week goal hit. Extra is a bonus." : "On track. Keep it easy.";
  else if (c.sinceTrain === 2) line = "One day off is fine. Keep it to one.";
  else line = "Day " + c.sinceTrain + " off. Start small today.";
  const dots = c.weeks.map((n, i) => {
    const hit = n >= c.goal, part = n > 0;
    const label = i === 3 ? "this week" : (3 - i) + (3 - i === 1 ? " week ago" : " weeks ago");
    return `<div title="${n}/${c.goal} ${label}" style="flex:1; height:8px; border-radius:4px; background:${hit ? "var(--accent)" : part ? "var(--accent-pale)" : "var(--surface-2)"}; opacity:${i === 3 ? 1 : 0.85};"></div>`;
  }).join("");
  const chip = (l, v, u) => `<div class="tf-cchip"><b>${v}<small>${u}</small></b><span>${l}</span></div>`;
  el.innerHTML = `<div class="tf-hero2"><div class="tf-hero2-in">
      <div class="big">${c.thisWeek}<small> / ${c.goal} sessions this week</small></div>
      <div class="d" style="margin-top:4px;">${escapeHtml(line)}</div>
      <div style="display:flex; gap:6px; margin-top:12px;">${dots}</div>
    </div>
    <div class="tf-cchips">${chip("food logged", c.logged7 + " / 7", "")}${chip("walk days", c.walk7 + " / 7", "")}${chip("protein days hit", c.proteinHit + " / 7", "")}</div></div>`;
}
function weekStripHtml() {
  const goal = state.settings?.weeklyWorkoutGoal || 3;
  const days = weekDayList(0), todayS = localDateStr();
  const doneSet = new Set((state.logs || []).map(l => dayKeyOf(l.date)));
  const doneN = days.filter(d => doneSet.has(d)).length;
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  return `<div class="tf-weekcard"><div class="tf-wk-top"><span>This week</span><b>${doneN} of ${goal} done</b></div><div class="tf-wk">${days.map((d, i) => `<div class="tf-wd${doneSet.has(d) ? " done" : ""}${d === todayS ? " today" : ""}"><i>${doneSet.has(d) ? "✓" : ""}</i>${letters[i]}</div>`).join("")}</div></div>`;
}
function todayHeroHtml(workout) {
  let week = 0, total = 0;
  try {
    const prog = programs.find(p => p.id === state.activeProgramId);
    if (prog && prog.structure && prog.structure.phases) {
      week = currentPhaseFor(prog).weekNumber;
      total = Math.max(...prog.structure.phases.map(x => x.week_end || 0)) || 0;
    }
  } catch (e) {}
  const full = String(workout.day || "Today's workout");
  const ci = full.indexOf(":");
  const title = escapeHtml(ci > 0 ? full.slice(0, ci).trim() : full);
  const sub = ci > 0 ? escapeHtml(full.slice(ci + 1).trim().replace(/^./, c => c.toUpperCase()).replace(/,\s*/g, " · ")) : "";
  const mins = estimateWorkoutMinutes(workout);
  const moves = (workout.exercises || []).length;
  const sets = (workout.exercises || []).reduce((a, e) => a + (e.sets || 0), 0);
  const blocks = workoutBlocks(workout);
  const segs = [];
  if (workout.warmup && workout.warmup.length) segs.push(["var(--accent)", 1.2]);
  blocks.forEach(bk => segs.push([bk.color, Math.max(1, bk.sets)]));
  if (workout.cooldown && workout.cooldown.length) segs.push(["var(--sand)", 0.8]);
  const bar = segs.map(sg => `<i style="flex:${sg[1]}; background:${sg[0]};"></i>`).join("");
  const kicker = week ? `Week ${week}${total ? " of " + total : ""}` : "Today's session";
  const strip = weekStripHtml();
  return `<div class="tf-hero2"><div class="tf-hero2-in">
      <div class="tf-hero2-k">${kicker}</div>
      <div class="tf-hero2-title">${title}</div>${sub ? `<div class="tf-hero2-sub">${sub}</div>` : ""}
      <div class="tf-hero2-stats"><div><b>${mins}</b><span>min</span></div><div><b>${moves}</b><span>moves</span></div><div><b>${sets}</b><span>sets</span></div></div>
    </div><div class="tf-hero2-bar">${bar}</div></div>${strip}`;
}
function todayKickerText() {
  const d = new Date();
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  let wk = "";
  try {
    const prog = programs.find(p => p.id === state.activeProgramId);
    if (prog && prog.structure && prog.structure.phases) {
      const w = currentPhaseFor(prog).weekNumber;
      const total = Math.max(...prog.structure.phases.map(x => x.week_end || 0)) || 0;
      wk = ` · Week ${w}${total ? " of " + total : ""}`;
    }
  } catch (e) {}
  return day + wk;
}
// ---- Exercise detail sheet: how-to, common mistakes, demo link ----
const EX_MISTAKES = {
  "kb-swing": ["Squatting the swing instead of hinging back", "Lifting the bell with your arms; it floats from the hip snap", "Leaning back at the top; stand tall and squeeze glutes"],
  "kb-swing-1h": ["Letting the bell twist your shoulders", "Rounding the lower back on the hike", "Pulling with the arm instead of the hips"],
  "kb-goblet-squat": ["Heels lifting; keep the whole foot down", "Knees caving in", "Chest dropping forward at the bottom"],
  "kb-rack-reverse-lunge": ["Front knee drifting in or collapsing", "Leaning forward instead of staying tall", "Short steps that load the front knee"],
  "kb-press-hk": ["Arching the lower back to finish the press", "Elbow flaring out to the side", "Not squeezing the kneeling-side glute"],
  "kb-floor-press": ["Elbow flared wide at 90 degrees", "Bouncing the arm off the floor", "Wrist bending back under the bell"],
  "kb-row-2h": ["Rounding the back as you pull", "Shrugging instead of squeezing the shoulder blades", "Using hip swing to throw the bell up"],
  "kb-row": ["Rounding the back as you pull", "Twisting the torso to lift the bell", "Elbow flaring away from the ribs"],
  "kb-clean": ["Swinging the bell around the wrist and banging the forearm", "Curling it up with the arm", "Not tucking the elbow into the ribs on landing"],
  "kb-sl-rdl": ["Rotating the hips open as the leg lifts", "Locking the standing knee", "Rounding the back to reach lower"],
  "kb-suitcase-carry": ["Leaning toward the bell", "Hiking the shoulder up", "Rushing; slow steps keep the core working"],
  "kb-waiter-carry": ["Wrist bending back under the bell", "Ribs flaring and back arching", "Shoulder shrugging up to the ear"],
  "kb-halo": ["Arching the back as the bell passes overhead", "Bell drifting away from the neck", "Rushing the circle"],
  "kb-figure8": ["Rounding the back instead of hinging", "Standing too narrow so the bell bumps your legs", "Gripping tight instead of a smooth hand-off"],
  "kb-overhead-lunge": ["Ribs flaring and back arching under the bell", "Arm drifting forward of the ear", "Leaning forward instead of staying tall"],
  "kb-turkish-getup": ["Rushing; pause at each position", "Letting the bell arm drift off vertical", "Looking away from the bell during the roll"],
  "kb-deadlift": ["Rounding the lower back", "Squatting instead of hinging", "Bell too far in front of the feet"],
  "kb-complex": ["Setting the bell down mid-round", "Rushing into sloppy reps; keep the same crisp form each move", "Skipping the arm switch between rounds"],
  "pushup": ["Hips sagging or piking up", "Elbows flaring straight out", "Half reps; chest should reach the floor"],
  "plank": ["Hips sagging", "Holding the breath", "Looking up and straining the neck"],
  "dead-bug": ["Low back lifting off the floor", "Moving arm and leg too fast", "Holding the breath"],
  "bird-dog": ["Hips rotating as the leg lifts", "Arching the low back", "Rushing the reach"]
};
function exerciseInfoFor(name) {
  const all = (typeof exercises !== "undefined" && exercises ? exercises : []).concat(BUILTIN_EXERCISES);
  const n = String(name).toLowerCase();
  return all.find(x => String(x.name).toLowerCase() === n) || null;
}
function openExerciseSheet(name, idx) {
  const info = exerciseInfoFor(name);
  const esc = escapeHtml;
  let el = document.getElementById("tfExSheet");
  if (!el) {
    el = document.createElement("div"); el.id = "tfExSheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-exclose]")) { closeExerciseSheet(); return; }
      if (e.target.closest("#tfSheetSlot")) todayClickHandler(e);
    });
  }
  const mistakes = info && EX_MISTAKES[info.id];
  const tags = info ? `<div class="tags">${info.muscle_group ? `<span>${esc(info.muscle_group)}</span>` : ""}${info.equipment ? `<span>${esc(info.equipment)}</span>` : ""}</div>` : "";
  el.innerHTML = `<div class="sheet"><div class="grab"></div><h3>${esc(name)}</h3>${tags}
    ${bellHintHtml(name, (currentWorkout && currentWorkout.exercises || []).find(x => x.name === name)?.reps)}
    ${info && info.cue ? `<div class="lab">How to</div><p>${esc(info.cue)}</p>` : `<p style="margin-top:14px;color:var(--text-muted);">No written cue for this one yet. The demo link shows it.</p>`}
    ${mistakes ? `<div class="lab">Common mistakes</div><ul>${mistakes.map(m => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
    ${idx !== undefined ? `<div class="lab">Swap or log</div><div id="tfSheetSlot"></div>` : ""}
    <a class="demo" href="${buildYoutubeUrl(name)}" target="_blank" rel="noopener">Watch demo ↗</a>
    <button type="button" class="demo2" data-quick-note="${esc(name)}">Add a note or question</button>
    <button type="button" class="close" data-exclose>Close</button></div>`;
  tfSheetCard = null;
  if (idx !== undefined) {
    const card = document.querySelector(`#tfCardStore [data-ex-index="${idx}"]`);
    const slot = document.getElementById("tfSheetSlot");
    if (card && slot) { slot.appendChild(card); tfSheetCard = card; }
  }
  requestAnimationFrame(() => el.classList.add("open"));
}
let tfSheetCard = null;
function closeExerciseSheet(discard) {
  const el = document.getElementById("tfExSheet");
  if (tfSheetCard) {
    const store = document.getElementById("tfCardStore");
    if (store) store.appendChild(tfSheetCard);
    tfSheetCard = null;
  }
  if (el) el.classList.remove("open");
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeExerciseSheet(); });
document.getElementById("sessionPanel").addEventListener("click", (e) => {
  const h = e.target.closest(".card > h2");
  if (h && exerciseInfoFor(h.textContent.trim())) openExerciseSheet(h.textContent.trim());
});
document.getElementById("todayWorkout").addEventListener("click", (e) => {
  if (e.target.closest("[data-moves-toggle]")) { movesOpen = !movesOpen; if (currentWorkout) renderTodayWorkout(currentWorkout); return; }
  const n = e.target.closest("[data-exinfo]");
  if (n) openExerciseSheet(n.dataset.exinfo, n.dataset.exidx !== undefined ? parseInt(n.dataset.exidx, 10) : undefined);
});

let movesOpen = false;
const PH_COLORS = ["var(--accent)", "var(--gold)", "var(--slate)", "var(--sand-pale)"];
// Breaks a workout into blocks (each superset, each standalone move, a finisher) with a colour per block.
function workoutBlocks(workout) {
  const ex = workout.exercises || [], seen = new Set(), blocks = [];
  ex.forEach((e, i) => {
    if (e.superset_group) {
      if (seen.has(e.superset_group)) return;
      seen.add(e.superset_group);
      const idx = ex.map((x, j) => x.superset_group === e.superset_group ? j : -1).filter(j => j >= 0);
      blocks.push({ type: "ss", label: "SUPERSET " + e.superset_group, idx });
    } else if (e.emom && i === ex.length - 1) blocks.push({ type: "fin", label: "FINISHER", idx: [i] });
    else blocks.push({ type: "one", label: "", idx: [i] });
  });
  let c = 0;
  blocks.forEach(bk => { bk.color = bk.type === "fin" ? "var(--accent-hot)" : PH_COLORS[c++ % PH_COLORS.length]; bk.sets = bk.idx.reduce((n, j) => n + (ex[j].sets || 0), 0); });
  return blocks;
}
function movesListHtml(workout) {
  const ex = workout.exercises || [];
  const secNote = (e) => /^\s*seconds?\b/i.test(String(e.note || ""));
  const noteOf = (e) => { let n = e.note ? String(e.note) : ""; if (isHoldExercise(e.name) || secNote(e)) n = n.replace(/^\s*seconds?\s*/i, "").replace(/^\s*[,·-]\s*/, ""); return n; };
  const det = (e) => `${e.sets} × ${escapeHtml(String(e.reps))}${isHoldExercise(e.name) || secNote(e) ? " s" + (isHoldExercise(e.name) ? " hold" : "") : ""}${noteOf(e) ? " · " + escapeHtml(noteOf(e)) : ""}`;
  const blocks = workoutBlocks(workout);
  const line = (j) => { const x = ex[j]; return `<div class="tf-mv-line"><div class="tf-mv-name" data-exidx="${j}" data-exinfo="${escapeHtml(x.name)}">${escapeHtml(x.name)}</div><div class="tf-mv-det">${det(x)}${x.emom ? ' <span class="tf-pill">EMOM</span>' : ""}</div></div>`; };
  const rows = blocks.map(bk => `<div class="tf-mv ss" style="border-left-color:${bk.color};">${bk.label ? `<div class="tf-mv-tag" style="color:${bk.color};">${bk.label}</div>` : ""}${bk.idx.map(line).join("")}</div>`).join("");
  const names = [...new Set(ex.map(e => String(e.name).replace(/^(kettlebell|kb)\s+/i, "")))].map(n => escapeHtml(n)).join(" · ");
  const head = `<div class="tf-moves-head" data-moves-toggle role="button" tabindex="0"><span><i class="tf-dot" style="background:var(--accent);"></i>Main work · ${ex.length} moves</span><span style="color:var(--accent);">${movesOpen ? "Hide ▴" : "See all ▾"}</span></div>`;
  if (!movesOpen) return `<div class="tf-moves tf-ph-main" data-moves-toggle style="cursor:pointer;">${head}<div class="tf-moves-names">${names}</div></div>`;
  return `<div class="tf-moves tf-ph-main">${head}${rows}</div>`;
}
// ---- Chest booster: optional extra sets on rest days (counts toward a weekly chest-set goal, not the workout goal)
const CHEST_WEEKLY_SETS = 8, CHEST_SESSION_SETS = 4, CHEST_REST_SECONDS = 75;
const CHEST_PLANS = {
  home: { label: "Home · rings", moves: ["Ring push-up", "Ring push-up", "Ring dips (feet down)", "Ring dips (feet down)"] },
  travel: { label: "Travel", moves: ["Decline push-up", "Decline push-up", "Slow push-up (4 s down)", "Slow push-up (4 s down)"] },
};
const CHEST_WARM = {
  home: [{ n: "Band pull-aparts", d: "15 reps · squeeze shoulder blades together" }, { n: "Ring scap push-ups", d: "10 slow reps · shoulder blades only" }],
  travel: [{ n: "Wall slides", d: "10 reps · arms flat to the wall" }, { n: "Floor scap push-ups", d: "10 slow reps · shoulder blades only" }]
};
const CHEST_COOL = [{ n: "Doorway chest stretch", d: "20 s each side" }, { n: "Cross-body shoulder stretch", d: "20 s each side · spend extra on the right" }];
// The chest booster belongs to the older kettlebell-era plan. The daily short program (backBlock) drops it.
function chestBoosterOn() { const p = (typeof programs !== "undefined" ? programs : []).find(x => x.id === state.activeProgramId); return !(p && p.structure && p.structure.backBlock); }
function chestPhaseDone(key) { const w = state[key]; return w && w.day === localDateStr() && Array.isArray(w.ids) ? w.ids.filter(i => i < 2) : []; }
function chestWarmDone() { return chestPhaseDone("chestWarm"); }
let chestPhaseSel = null;
const CHEST_NEXT = {
  "Ring push-up": "raise your feet",
  "Ring dips (feet down)": "lean forward, then lift one foot off the floor",
  "Decline push-up": "put your feet higher or add a 1 s pause at the bottom",
  "Slow push-up (4 s down)": "add a 2 s pause at the bottom",
};
let chestExtraOpen = false, chestRepsOpen = false, chestRestEnd = 0, chestRestTimer = null, chestDraftReps = 10;
function chestSetsInWeek(days) { const set = new Set(days); return (state.chestLogs || []).filter(l => set.has(l.day)).length; }
function chestTodayLogs() { const t = localDateStr(); return (state.chestLogs || []).filter(l => l.day === t); }
function chestHint(moves) {
  // Look at the last two days each move was trained: all sets at 15+ means level up; falling reps means hold back.
  const byDay = {};
  (state.chestLogs || []).filter(l => moves.includes(l.move)).forEach(l => { (byDay[l.day] = byDay[l.day] || []).push(l); });
  const dayKeys = Object.keys(byDay).sort();
  if (!dayKeys.length) return "Stop 1–3 reps shy of failure. Aim for 8–15 clean reps a set.";
  const last = byDay[dayKeys[dayKeys.length - 1]];
  const mvs = [...new Set(last.map(l => l.move))];
  for (const m of mvs) {
    const r = last.filter(l => l.move === m).map(l => l.reps);
    if (r.length >= 2 && r.every(x => x >= 15)) return `Hit 15 on every ${m.toLowerCase()} set → make it harder: ${CHEST_NEXT[m] || "slow the tempo"}.`;
  }
  if (dayKeys.length >= 2) {
    const avg = arr => arr.reduce((a, l) => a + l.reps, 0) / arr.length;
    const prev = byDay[dayKeys[dayKeys.length - 2]];
    if (avg(last) < avg(prev) - 1) return "Reps dipped from last time. Hold this level and check sleep and calories before pushing.";
  }
  return "Add a rep or two per set. At 15 on every set, make the move harder.";
}
function chestRestRemaining() { return Math.max(0, Math.ceil((chestRestEnd - Date.now()) / 1000)); }
function chestTickRest() {
  const left = chestRestRemaining();
  document.querySelectorAll("[data-chest-rest-clock]").forEach(el => { el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; });
  if (left <= 0) { clearInterval(chestRestTimer); chestRestTimer = null; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} renderChestBoosters(); }
}
// Optional 3-minute back-care routine for rest days (daily short program). Tap each move as you do it. Not counted as training.
const BACK_CARE = [
  { n: "Cat-cow", d: "8 slow reps · breathe with the movement" },
  { n: "Child's pose", d: "30 seconds · let your lower back soften" },
  { n: "Glute bridge", d: "10 slow reps · squeeze at the top" },
  { n: "Bird-dog", d: "5 each side · hold 3 seconds" },
  { n: "Knees-to-chest hold", d: "30 seconds · gentle, no pulling hard" },
];
function backCareDone() { const w = state.backCare; return w && w.day === localDateStr() && Array.isArray(w.ids) ? w.ids : []; }
let backCareOpen = false;
function backCareHtml() {
  const done = backCareDone(), all = done.length >= BACK_CARE.length;
  if (!backCareOpen) return `<div data-back-care-open style="display:flex; align-items:center; gap:10px; margin-top:8px; padding:0 14px; height:52px; background:var(--surface); border:1px solid var(--border); border-radius:12px; font-size:15px; cursor:pointer;"><span style="width:22px; height:22px; border-radius:50%; border:2px solid ${all ? "var(--accent)" : "var(--border)"}; background:${all ? "var(--accent)" : "transparent"}; color:var(--ink); display:flex; align-items:center; justify-content:center; font-size:12px; flex:none;">${all ? "✓" : ""}</span><span>Back care · optional, 3 min</span><span style="margin-left:auto; color:var(--text-muted);">${done.length}/${BACK_CARE.length} ▸</span></div>`;
  const rows = BACK_CARE.map((m, i) => { const ok = done.includes(i); return `<div data-back-care="${i}" style="display:flex; align-items:center; gap:10px; padding:11px 0; ${i < BACK_CARE.length - 1 ? "border-bottom:1px solid var(--surface-3);" : ""} cursor:pointer;"><span style="width:24px; height:24px; border-radius:50%; border:2px solid ${ok ? "var(--accent)" : "var(--border)"}; background:${ok ? "var(--accent)" : "transparent"}; color:var(--ink); display:flex; align-items:center; justify-content:center; font-size:13px; flex:none;">${ok ? "✓" : ""}</span><div class="fx1"><div style="font-size:15px; ${ok ? "color:var(--text-muted);" : ""}">${escapeHtml(m.n)}</div><div class="meta" style="font-size:12px;">${escapeHtml(m.d)}</div></div></div>`; }).join("");
  return `<div class="tf-hero2" style="order:-3;"><div class="tf-hero2-in" style="padding:16px;"><div class="tf-hero2-k">Optional · about 3 minutes</div><div style="font-family:var(--font-display); font-size:28px; line-height:1.05; text-transform:uppercase; margin-top:6px;">${all ? "Back care done" : "Back care"}</div><div style="font-size:13px; color:var(--accent-pale); margin-top:6px;">${all ? "Nice. Your back thanks you." : "Slow and easy. Skip anything that hurts."}</div><div style="margin-top:8px;">${rows}</div></div></div>`;
}
function chestBoosterHtml(opts) {
  if (!chestBoosterOn()) return backCareHtml();
  state.chestMode = state.travelMode ? "travel" : "home";
  const plan = CHEST_PLANS[state.chestMode] || CHEST_PLANS.home;
  const wk = chestSetsInWeek(weekDayList(0));
  const done = wk >= CHEST_WEEKLY_SETS;
  const today = chestTodayLogs();
  const pct = Math.min(1, wk / CHEST_WEEKLY_SETS), C = 2 * Math.PI * 31;
  const ring = `<svg width="60" height="60" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="31" fill="none" stroke="var(--border)" stroke-width="7"/><circle cx="38" cy="38" r="31" fill="none" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}" transform="rotate(-90 38 38)"/><text x="38" y="${done ? 46 : 43}" text-anchor="middle" font-family="Manrope" font-weight="700" font-size="${done ? 24 : 18}" fill="var(--text)">${done ? "✓" : wk + "/" + CHEST_WEEKLY_SETS}</text>${done ? "" : '<text x="38" y="55" text-anchor="middle" font-family="Manrope" font-weight="700" font-size="8" fill="var(--text-faint-2)" letter-spacing="1.2">THIS WEEK</text>'}</svg>`;
  if (done && !chestExtraOpen && (today.length === 0 || chestPhaseDone("chestCool").length >= 2)) {
    return `<div class="tf-hero2" style="order:-3;"><div class="tf-hero2-in" style="display:flex; align-items:center; justify-content:space-between; gap:12px;"><div><div class="tf-hero2-k">Chest booster</div><div style="font-family:var(--font-display); font-size:22px; text-transform:uppercase; margin-top:2px;">Chest done this week</div><div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${wk} sets logged · <span data-chest-extra style="color:var(--accent); cursor:pointer;">Log extra</span></div></div>${ring}</div></div>`;
  }
  const rows = plan.moves.slice();
  while (rows.length < today.length) rows.push(plan.moves[plan.moves.length - 1]);
  const nextIdx = today.length;
  const rowHtml = rows.map((m, i) => { const l = today[i]; return `<div style="display:flex; align-items:center; gap:10px; padding:9px 0; ${i < rows.length - 1 ? "border-bottom:1px solid var(--surface-3);" : ""} font-size:14px;"><span style="width:22px; height:22px; border-radius:50%; border:2px solid ${l ? "var(--accent)" : "var(--border)"}; background:${l ? "var(--accent)" : "transparent"}; color:var(--ink); display:flex; align-items:center; justify-content:center; font-size:12px;">${l ? "✓" : ""}</span><span class="fx1">${escapeHtml(m)}</span><span style="font-family:var(--font-display); font-size:18px; color:${l ? "var(--text)" : "var(--text-muted)"};">${l ? l.reps + ' <small style="font-size:11px; color:var(--text-muted); font-family:Manrope,sans-serif;">reps</small>' : "—"}</span>${l ? `<span data-chest-undo="${l.id}" style="color:var(--text-muted); font-size:16px; cursor:pointer; padding:0 2px;" aria-label="Remove set">×</span>` : ""}</div>`; }).join("");
  const nextMove = rows[Math.min(nextIdx, rows.length - 1)];
  const restLeft = chestRestRemaining();
  const restCard = restLeft > 0 ? `<div class="card" style="margin-top:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;"><div><div class="tf-hero2-k" style="color:var(--text-muted);">Rest</div><div data-chest-rest-clock style="font-family:var(--font-display); font-size:28px; line-height:1.1;">${Math.floor(restLeft / 60)}:${String(restLeft % 60).padStart(2, "0")}</div></div><button class="secondary" data-chest-skip-rest>Skip</button></div>` : "";
  const repsPanel = chestRepsOpen ? `<div class="card" style="margin-top:10px; padding:12px 14px;"><div class="tf-hero2-k" style="color:var(--text-muted);">Reps for ${escapeHtml(nextMove)}</div><div style="display:flex; align-items:center; justify-content:center; gap:22px; margin:8px 0;"><button class="secondary" data-chest-step="-1" style="width:52px; font-size:22px;">−</button><span data-chest-reps style="font-family:var(--font-display); font-size:40px; min-width:60px; text-align:center;">${chestDraftReps}</span><button class="secondary" data-chest-step="1" style="width:52px; font-size:22px;">+</button></div><button class="primary w100" data-chest-save>Save set</button></div>` : "";
  const warmList = CHEST_WARM[state.chestMode] || CHEST_WARM.home;
  const wd = chestPhaseDone("chestWarm"), cd = chestPhaseDone("chestCool");
  const warmOk = wd.length >= 2, setsOk = today.length >= CHEST_SESSION_SETS, coolOk = cd.length >= 2;
  const auto = !warmOk ? "warm" : !setsOk ? "sets" : !coolOk ? "cool" : "done";
  const phase = chestPhaseSel || auto;
  const stepDots = [0, 1].map(i => wd.includes(i) ? "d" : (phase === "warm" && wd.length === i ? "n" : ""))
    .concat([0, 1, 2, 3].map(i => i < today.length ? "d" : (phase === "sets" && today.length === i ? "n" : "")))
    .concat([0, 1].map(i => cd.includes(i) ? "d" : (phase === "cool" && cd.length === i ? "n" : "")));
  const dotsHtml = `<div style="display:flex; gap:5px; margin:0 0 10px;">${stepDots.map(c => `<i style="flex:1; height:5px; border-radius:3px; background:${c === "d" ? "var(--accent)" : c === "n" ? "var(--accent-soft)" : "var(--border)"};"></i>`).join("")}</div>`;
  const nextIn = (list, doneIds) => { const i = list.findIndex((_, k) => !doneIds.includes(k)); return i < 0 ? list.length - 1 : i; };
  let kick, title, sub, action = "", extra = "";
  if (phase === "warm") {
    const i = nextIn(warmList, wd); kick = `Warm-up · ${i + 1} of 2`; title = warmList[i].n; sub = warmList[i].d;
    action = `<button class="primary" data-chest-warm="${i}" style="width:100%; height:58px; font-size:18px; margin-top:10px;">Done</button>`;
  } else if (phase === "cool") {
    const i = nextIn(CHEST_COOL, cd); kick = `Cool-down · ${i + 1} of 2`; title = CHEST_COOL[i].n; sub = CHEST_COOL[i].d;
    action = `<button class="primary" data-chest-cool="${i}" style="width:100%; height:58px; font-size:18px; margin-top:10px;">Done</button>`;
  } else if (phase === "sets") {
    kick = nextIdx >= CHEST_SESSION_SETS ? `Chest · extra set ${nextIdx + 1}` : `Chest · set ${nextIdx + 1} of ${CHEST_SESSION_SETS}`; title = nextMove; sub = "Stop 1–3 reps shy of failure";
    extra = `${restCard}${repsPanel}${chestRepsOpen ? "" : `<div class="card" style="margin-top:10px; padding:10px 14px; border-color:var(--gold-deep);"><div class="tf-hero2-k" style="color:var(--gold);">Next step</div><div style="font-size:13px; margin-top:3px;">${escapeHtml(chestHint(plan.moves))}</div></div>`}`;
    action = chestRepsOpen ? "" : `<button class="primary" data-chest-open style="width:100%; height:58px; font-size:18px; margin-top:10px;">${nextIdx >= CHEST_SESSION_SETS ? "Log extra set" : `Log set · ${nextIdx + 1} of ${CHEST_SESSION_SETS}`}</button>`;
  } else {
    kick = "Session done"; title = "Nice work"; sub = `${wk} of ${CHEST_WEEKLY_SETS} sets this week`;
  }
  const rowFor = (key, label, summary, ok) => `<div data-chest-phase="${key}" style="display:flex; align-items:center; gap:10px; margin-top:8px; padding:0 14px; height:44px; background:var(--surface); border:1px solid var(--border); border-radius:12px; font-size:14px; cursor:pointer;"><span style="width:20px; height:20px; border-radius:50%; border:2px solid ${ok ? "var(--accent)" : "var(--border)"}; background:${ok ? "var(--accent)" : "transparent"}; color:var(--ink); display:flex; align-items:center; justify-content:center; font-size:11px; flex:none;">${ok ? "✓" : ""}</span><span>${label}</span><span style="margin-left:auto; font-size:12px; color:var(--text-muted); text-align:right;">${summary}</span></div>`;
  const rowsHtml = (phase === "sets" && chestRepsOpen) ? "" : [
    phase !== "warm" ? rowFor("warm", "Warm-up", warmOk ? "done" : "2 moves · 2 min", warmOk) : "",
    phase !== "sets" ? rowFor("sets", "Chest sets", `${[...new Set(plan.moves)].map(m => m.replace(/ \(.*\)/, "")).join(", ")} · ${today.length}/${CHEST_SESSION_SETS}`, setsOk) : "",
    phase !== "cool" ? rowFor("cool", "Cool-down", coolOk ? "done" : "2 stretches · 1 min", coolOk) : ""
  ].join("");
  return `${dotsHtml}<div class="tf-hero2" style="order:-3;"><div class="tf-hero2-in" style="padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center;"><div class="tf-hero2-k">${kick}</div>${ring}</div>
      <div style="font-family:var(--font-display); font-size:32px; line-height:1.05; text-transform:uppercase; margin-top:6px;">${escapeHtml(title)}</div>
      <div style="font-size:14px; color:var(--accent-pale); margin-top:6px;">${escapeHtml(sub)}</div>
      ${action}
    </div></div>${extra}${rowsHtml}`;
}
// Fixed weekly plan. The calendar alone decides what each day is. Nothing looks at yesterday or at weekly counts.
// 0 = Sunday ... 6 = Saturday.
const DAY_PLAN = { 0: "rest", 1: "train", 2: "train", 3: "rest", 4: "train", 5: "train", 6: "train" };
function planKind(d = new Date()) { return DAY_PLAN[d.getDay()] || "rest"; }
function chestRecommended() { return planKind() === "train" ? "workout" : "chest"; }
function chestFocus() { const f = state.todayFocus; return f && f.day === localDateStr() ? f.v : chestRecommended(); }
// Today is always one of: Train day (next session queued), Rest day (you trained yesterday, chest booster optional) or Done today.
// "Rest today instead" and "Train anyway" flip today only (saved in state.todayFocus); the session order never moves until a session is logged.
function focusSwitchHtml(label) {
  const cur = chestFocus(), lab = escapeHtml(String(label || "workout"));
  if (cur === "chest") {
    const kind = planKind();
    const [k, ttl, sub] = kind === "rest"
        ? ["Rest day", "Recovery day", "Next session: " + lab + (chestBoosterOn() ? ". The chest booster is optional." : ". Walk, stretch, eat well. That is the whole job today.")]
        : ["Rest day", "Taking today off", "Next session: " + lab + (chestBoosterOn() ? ". The chest booster is optional." : ". One day off never counts as a miss.")];
    return `<div class="tf-focus" data-label="${lab}"><div class="tf-fcard"><div class="tf-fk">${k}</div><div class="tf-ft">${ttl}</div><div class="tf-fs">${sub}</div></div><button class="tf-fwide" data-focus="workout">Train anyway · ${lab}</button></div>`;
  }
  return `<div class="tf-focus" data-label="${lab}"><div class="tf-fbar"><span class="tf-fk">Train day</span><button class="tf-flink" data-focus="chest">Rest today instead</button></div></div>`;
}
function doneBannerHtml() {
  return `<div class="tf-focus"><div class="tf-fcard"><div class="tf-fk">Done today ✓</div><div class="tf-ft">Session logged</div><div class="tf-fs">Tomorrow: ${({ train: "next session", rest: "rest day" })[planKind(new Date(Date.now() + 864e5))]}.</div></div></div>`;
}
function applyTodayFocus(on) {
  const col = document.querySelector("#tab-today .tf-today-col");
  if (!col) return;
  col.classList.toggle("tf-has-focus", !!on);
  col.classList.toggle("tf-focus-chest", !!on && chestFocus() === "chest");
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-focus]");
  if (!b) return;
  state.todayFocus = { day: localDateStr(), v: b.dataset.focus };
  const bar = b.closest(".tf-focus");
  if (bar) bar.outerHTML = focusSwitchHtml(bar.dataset.label);
  applyTodayFocus(true);
  try { renderWeekRibbon(); } catch (err) {}
  try { await persistNow(); } catch (err) {}
});
function renderChestBoosters() {
  const c = document.getElementById("chestBoosterCoach");
  if (c) c.innerHTML = chestBoosterHtml();
  const t = document.getElementById("chestBoosterToday");
  if (t) t.innerHTML = chestBoosterHtml();
  const tile = document.getElementById("chestBoosterDetails");
  if (tile) tile.classList.toggle("hidden", !chestBoosterOn());
  const d = document.querySelector("#chestBoosterDetails summary");
  if (d) d.innerHTML = chestSetsInWeek(weekDayList(0)) >= CHEST_WEEKLY_SETS ? `Chest<span class="tf-sv">done</span>` : `Chest<span class="tf-sv">${chestSetsInWeek(weekDayList(0))}/${CHEST_WEEKLY_SETS}</span>`;
}
document.addEventListener("click", async (e) => {
  const q = (sel) => e.target.closest(sel);
  let changed = false;
  if (q("[data-chest-mode]")) { state.chestMode = q("[data-chest-mode]").dataset.chestMode; changed = true; chestRepsOpen = false; }
  else if (q("[data-chest-extra]")) { chestExtraOpen = true; }
  else if (q("[data-chest-open]")) {
    const last = (state.chestLogs || []).slice(-1)[0];
    chestDraftReps = last ? last.reps : 10; chestRepsOpen = true;
  }
  else if (q("[data-chest-step]")) { chestDraftReps = Math.max(1, Math.min(60, chestDraftReps + Number(q("[data-chest-step]").dataset.chestStep))); }
  else if (q("[data-chest-save]")) {
    state.chestMode = state.travelMode ? "travel" : "home";
    const plan = CHEST_PLANS[state.chestMode] || CHEST_PLANS.home;
    const n = chestTodayLogs().length;
    const move = plan.moves[Math.min(n, plan.moves.length - 1)];
    state.chestLogs.push({ id: "ch" + Date.now(), date: new Date().toISOString(), day: localDateStr(), move, reps: chestDraftReps, mode: state.chestMode });
    chestRepsOpen = false; changed = true; chestPhaseSel = null;
    if (chestSetsInWeek(weekDayList(0)) >= CHEST_WEEKLY_SETS && chestTodayLogs().length >= CHEST_SESSION_SETS) { chestExtraOpen = false; }
    chestRestEnd = Date.now() + CHEST_REST_SECONDS * 1000;
    if (chestRestTimer) clearInterval(chestRestTimer);
    chestRestTimer = setInterval(chestTickRest, 1000);
  }
  else if (q("[data-chest-skip-rest]")) { chestRestEnd = 0; if (chestRestTimer) { clearInterval(chestRestTimer); chestRestTimer = null; } }
  else if (q("[data-chest-cool]")) {
    const i = Number(q("[data-chest-cool]").dataset.chestCool), cur = chestPhaseDone("chestCool").slice();
    if (!cur.includes(i)) cur.push(i);
    state.chestCool = { day: localDateStr(), ids: cur }; changed = true; chestPhaseSel = null;
  }
  else if (q("[data-chest-phase]")) { chestPhaseSel = q("[data-chest-phase]").dataset.chestPhase; chestRepsOpen = false; }
  else if (q("[data-chest-warm]")) {
    const i = Number(q("[data-chest-warm]").dataset.chestWarm), cur = chestWarmDone().slice();
    if (!cur.includes(i)) cur.push(i);
    state.chestWarm = { day: localDateStr(), ids: cur }; changed = true; chestPhaseSel = null;
  }
  else if (q("[data-back-care-open]")) { backCareOpen = true; }
  else if (q("[data-back-care]")) {
    const i = Number(q("[data-back-care]").dataset.backCare), cur = backCareDone().slice(), at = cur.indexOf(i);
    if (at >= 0) cur.splice(at, 1); else cur.push(i);
    state.backCare = { day: localDateStr(), ids: cur }; changed = true;
  }
  else if (q("[data-chest-undo]")) {
    state.chestLogs = state.chestLogs.filter(l => l.id !== q("[data-chest-undo]").dataset.chestUndo); changed = true;
  } else return;
  renderChestBoosters();
  if (changed) { try { await persistNow(); } catch (err) {} }
});
function renderTodayWorkout(workout) {
  currentWorkout = workout;
  const kick = document.getElementById("tfKicker"); if (kick) kick.textContent = todayKickerText();
  const box = document.getElementById("todayWorkout");
  const sessionBtn = document.getElementById("startSessionBtn");
  const minDayBtn = document.getElementById("minimumDayBtn");
  const cautionEl = document.getElementById("recoveryCautionNote");
  if (!workout) {
    cautionEl.innerHTML = "";
    box.innerHTML = '<div class="empty">Pick an active program first.</div>';
    sessionBtn.disabled = true;
    minDayBtn.disabled = true;
    return;
  }
  sessionBtn.disabled = false;
  minDayBtn.disabled = false;
  // Nothing to start on a finished day or a rest day: hide the Start / minimum buttons.
  const col = document.querySelector(".tf-today-col");
  if (col) col.classList.toggle("tf-off", !!(state.pendingWorkout?.completed) || !(workout.exercises || []).length);

  const genBtn = document.getElementById("genWorkoutBtn");
  if (state.pendingWorkout?.completed) {
    cautionEl.innerHTML = ""; // nothing to caution about — this session is already done
    box.innerHTML = `<div class="tf-hero tf-done"><svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label="Done"><circle cx="38" cy="38" r="31" fill="none" stroke="var(--accent)" stroke-width="7"/><path d="M25 39l9 9 17-19" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg><div style="flex:1; min-width:0;"><div class="tf-hero-title">Done for today</div><div class="tf-hero-sub">${escapeHtml(String(workout.day || "Workout"))} · ${workout.exercises.length} moves logged. Your next workout will be ready when you come back.</div></div></div>`;
    sessionBtn.textContent = "Session already logged";
    sessionBtn.disabled = true;
    minDayBtn.disabled = true;
    genBtn.classList.add("hidden");
    return;
  }

  // Computed fresh from today's actual logs (hasLoggedWorkoutToday), not a
  // stored flag — so this is correct even for a pendingWorkout that was
  // sitting around before this check existed, or from an earlier day. If
  // you've already logged a session today, whatever's showing here is a
  // look-ahead for mental prep, not a second thing "due today." Say so
  // plainly wherever this is shown, since the rotation being completion-
  // driven (not calendar-driven) means what's "next" and what's "today"
  // aren't the same thing once you've already trained today.
  const previewNote = hasLoggedWorkoutToday()
    ? `<div class="meta" style="color:var(--accent); margin-bottom:8px;">Already logged a session today — this is a preview of what's queued up next.</div>`
    : "";

  // A day in the rotation can legitimately have zero slots (the rest day
  // balanceProgramStructure guarantees every phase has) — that generates a
  // real, correct workout with an empty exercises array, not a failure. Left
  // to the generic rendering below this used to show as a blank "Today's
  // exercises" accordion with nothing in it, indistinguishable from
  // something actually being broken. Say plainly that it's a rest day
  // instead, and name what's coming next so there's still something to plan
  // around.
  if (!workout.exercises || workout.exercises.length === 0) {
    cautionEl.innerHTML = "";
    genBtn.classList.remove("hidden");
    sessionBtn.disabled = true;
    minDayBtn.disabled = true;
    let nextUpHtml = "";
    let skipBtnHtml = "";
    let previewAreaHtml = "";
    const activeProgram = programs.find(p => p.id === state.activeProgramId);
    let previewNextIndex = null, previewPhaseKey = null;
    if (activeProgram && state.pendingWorkout) {
      const { phase } = currentPhaseFor(activeProgram);
      previewPhaseKey = phaseKeyFor(activeProgram, phase);
      const totalDays = (phase?.days || []).length || 1;
      previewNextIndex = (state.pendingWorkout.dayIndex + 1) % totalDays;
      const nextDay = phase?.days?.[previewNextIndex];
      if (nextDay) {
        const slotPreview = (nextDay.slots || []).length
          ? ""
          : "Rest";
        nextUpHtml = `<div class="meta mt8">Next up: ${escapeHtml(String(nextDay.day))}</div>`;

        // "Preview exercises" runs the same generation that Skip rest would
        // commit to, but only caches the result in state.previewWorkout —
        // it never touches pendingWorkout/dayIndex, so nothing about the
        // rotation moves just from looking. If you've already generated a
        // preview for this exact next slot, show it straight away instead
        // of a button; skipRestDay() below reuses this same cached object
        // so what you previewed is exactly what you get, not a second,
        // possibly different, generation.
        const cached = state.previewWorkout;
        const hasCachedPreview = cached && cached.programId === activeProgram.id &&
          cached.phaseKey === previewPhaseKey && cached.dayIndex === previewNextIndex &&
          !workoutHasStaleExercises(cached.workout);
        if (hasCachedPreview) {
          previewAreaHtml = `<div id="nextDayPreviewBox" style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border);">${previewExerciseListHtml(cached.workout)}</div>`;
        } else {
          previewAreaHtml = `<button class="secondary mt10 w100" id="previewNextDayBtn">Preview exercises</button><div class="mt10" id="nextDayPreviewBox"></div>`;
        }

        // The rotation is completion-driven, not calendar-driven — this rest
        // slot comes up on a fixed cycle regardless of how many calendar
        // rest days already happened in between, so there's no way from the
        // normal flow to say "I've already rested enough this week, give me
        // the next real workout instead." Lets that next day's session
        // generate immediately rather than forcing today to stay empty.
        skipBtnHtml = `<button class="primary" id="skipRestDayBtn" style="margin-top:12px; width:100%;">Skip rest — start ${nextDay.day}</button>`;
      }
    }
    const restLine = hasLoggedWorkoutToday()
      ? "Nothing scheduled next in the rotation — a rest slot is up."
      : "Nothing scheduled today — rest and recover.";
    box.innerHTML = `<div id="chestBoosterToday"></div><div class="card">${previewNote}<h2>${workout.day || "Rest day"}</h2><div class="meta">${restLine}</div>${nextUpHtml}${previewAreaHtml}${skipBtnHtml}</div>`;
    renderChestBoosters();
    applyTodayFocus(false);
    const skipBtn = document.getElementById("skipRestDayBtn");
    if (skipBtn) skipBtn.addEventListener("click", skipRestDay, { once: true });
    const previewBtn = document.getElementById("previewNextDayBtn");
    if (previewBtn && activeProgram && previewNextIndex !== null) {
      previewBtn.addEventListener("click", () => previewNextDayExercises(activeProgram, previewNextIndex, previewPhaseKey), { once: true });
    }
    return;
  }

  // Only compute these for a workout you haven't done yet — checking a just-
  // completed session against its own logs would always trivially "conflict".
  const restNote = restDayCaution(workout);
  const stressNote = recentStressCaution();
  cautionEl.innerHTML = previewNote + (isLosingTooFast()
    ? `<div class="meta" style="color:var(--gold); margin-bottom:8px;">Pace caution: weight loss is outpacing target pace — holding progression steady, no intensity increases this week.</div>`
    : "") + (restNote
    ? `<div class="meta" style="color:var(--gold); margin-bottom:8px;">${restNote}</div>`
    : "") + (stressNote
    ? `<div class="meta" style="color:var(--gold); margin-bottom:8px;">${stressNote}</div>`
    : "");

  genBtn.classList.remove("hidden");
  sessionBtn.textContent = "Start workout";

  function exerciseCardHtml(e, i) {
    return `
      <div class="list-item" data-ex-index="${i}" style="flex-direction:column; align-items:stretch; border-bottom:none; padding:0;">
        <div class="meta mb10">${e.muscle_group} · ${e.sets}×${e.reps}${isHoldExercise(e.name) ? "s hold" : ""}${e.note ? " " + e.note : ""} · ${levelLabelFor(e)}${ringStrapNoteFor(e)}</div>
        <button class="secondary" data-swap-open="${i}" style="width:100%;">Swap this move</button>
        <div class="swap-panel hidden" data-swap-panel="${i}" style="margin-top:8px;">
          <div class="meta">No equipment for this one? Pick a swap, grouped by easier/harder:</div>
          ${swapAlternatesHtml(e, i)}
        </div>
        <div class="meta" style="margin:14px 0 6px;">How did it go? (counts toward next progression)</div>
        <div class="row">
          <div class="chip result-chip" data-ex="${i}" data-result="max">Hit max reps</div>
          <div class="chip result-chip" data-ex="${i}" data-result="hold">As prescribed</div>
          <div class="chip result-chip" data-ex="${i}" data-result="missed">Missed reps</div>
        </div>
      </div>`;
  }
  // Mobility items carry a coaching cue in the library same as any other
  // exercise, but it never made it into the generated warmup/cooldown JSON
  // (the AI only returns {name, detail}) — so this card showed a bare name
  // with no way to know how to actually do it short of looking it up
  // elsewhere mid-workout. Looked up by name here instead, reusing the same
  // howToHtml()/demo-link pattern the main exercise list already has.
  const mobilityCue = (name) => exercises.find(e => e.name === name)?.cue || "";
  const warmupHtml = (workout.warmup && workout.warmup.length) ? `
    <details class="exercise-group tf-ph-warm mb10">
      <summary>Warmup (~3-4 min)</summary>
      <div style="padding-top:6px;">
        ${workout.warmup.map((w, i) => `<div class="list-item" style="flex-direction:column; align-items:stretch;"><div style="display:flex; justify-content:space-between; align-items:center;"><div><div class="name">${w.name}</div><div class="meta">${w.detail || ""}</div></div><button class="danger-link" style="color:var(--accent);" data-warmcool-swap="warmup:${i}">Swap</button></div>${howToHtml(`warmup-${i}`, w.name, mobilityCue(w.name))}</div>`).join("")}
      </div>
    </details>` : "";
  const cooldownHtml = (workout.cooldown && workout.cooldown.length) ? `
    <details class="exercise-group tf-ph-cool mt10">
      <summary>Cool-down (~2 min)</summary>
      <div style="padding-top:6px;">
        ${workout.cooldown.map((c, i) => `<div class="list-item" style="flex-direction:column; align-items:stretch;"><div style="display:flex; justify-content:space-between; align-items:center;"><div><div class="name">${c.name}</div><div class="meta">${c.detail || ""}</div></div><button class="danger-link" style="color:var(--accent);" data-warmcool-swap="cooldown:${i}">Swap</button></div>${howToHtml(`cooldown-${i}`, c.name, mobilityCue(c.name))}</div>`).join("")}
      </div>
    </details>` : "";

  // Shown until explicitly dismissed, not just once per session — someone
  // who already knows what "level"/"straps"/the result chips mean shouldn't
  // have to see this every single day just to get to their exercises.
  const legendHtml = state.dismissedExerciseLegend ? "" : `
        <div class="meta mb4">"Level" is a 1-5 difficulty tier (1 = easiest variation in the library, 5 = hardest); horizontal/vertical marks which push or pull pattern it trains (e.g. push-ups vs. overhead presses — see Settings for your level per pattern); "straps" is your ring-strap length setting, shown on ring exercises only.</div>
        <div class="meta mb4">After a set: "Hit max reps" means you could've done more with good form, "As prescribed" means you did the planned amount, "Missed reps" means you couldn't finish them with good form. Stop any set early if form breaks down or something hurts — none of this is about pushing to failure.</div>
        <button class="danger-link mb8" id="dismissExerciseLegendBtn">Got it, don't show this again</button>`;

  const workoutHtml = `<div id="tfCardStore" class="hidden">${workout.exercises.map((e, i) => exerciseCardHtml(e, i)).join("")}</div>`;

  const resumeSnap = loadSessionSnapshot();
  const resumeHtml = resumeSnap ? `
    <div class="card" style="border-color:var(--accent); margin-bottom:10px;">
      <div class="name">${resumeSnap.session.paused ? "Workout paused" : "Session in progress"}</div>
      <div class="meta">${resumeSnap.session.paused ? "You paused " + resumeSnap.session.pos + " of " + resumeSnap.session.queue.length + " sets in. The clock is stopped and your finished sets were kept." : "You were " + resumeSnap.session.pos + " of " + resumeSnap.session.queue.length + " sets in when the app closed. Your finished sets were kept."}</div>
      <button class="primary mt8 w100" id="resumeSessionBtn">${resumeSnap.session.paused ? "Resume workout" : "Resume where I left off"}</button>
    </div>` : "";
  const showFocus = !hasLoggedWorkoutToday();
   const chestMount = !showFocus ? doneBannerHtml() : focusSwitchHtml(String(workout.day || "").split(/[:·—-]/)[0].trim()) + `<div class="mt6" id="chestBoosterToday"></div>`;
   box.innerHTML = resumeHtml + todayHeroHtml(workout) + warmupHtml + movesListHtml(workout) + workoutHtml + cooldownHtml + chestMount;
   renderChestBoosters();
   applyTodayFocus(showFocus);
  const resumeBtnEl = document.getElementById("resumeSessionBtn");
  if (resumeBtnEl) resumeBtnEl.addEventListener("click", resumeSessionFromSnapshot);
  const dismissLegendBtn = document.getElementById("dismissExerciseLegendBtn");
  if (dismissLegendBtn) {
    dismissLegendBtn.addEventListener("click", async () => {
      state.dismissedExerciseLegend = true;
      await persistNow();
      renderTodayWorkout(workout);
    });
  }
}

// Called from the rest-day card's "Skip rest" button. Generates the NEXT
// day in the rotation (dayIndex + 1) immediately, in place of today's
// generated-but-empty rest slot, for whoever has already taken a calendar
// rest day this week and doesn't want the fixed rotation slot forcing a
// second one — the rotation has no concept of calendar rest days on its
// own (see ensureWorkoutReady), so this is the explicit opt-out.
async function skipRestDay() {
  const program = programs.find(p => p.id === state.activeProgramId);
  if (!program || !state.pendingWorkout) return;
  const box = document.getElementById("todayWorkout");
  try {
    const { phase } = currentPhaseFor(program);
    const key = phaseKeyFor(program, phase);
    const totalDays = (phase?.days || []).length || 1;
    const nextIndex = (state.pendingWorkout.dayIndex + 1) % totalDays;
    // Reuse a cached preview for this exact slot if one exists — guarantees
    // what you previewed with "Preview exercises" is exactly what you
    // start, not a second, possibly different, generation.
    const cached = state.previewWorkout;
    const hasCached = cached && cached.programId === program.id && cached.phaseKey === key &&
      cached.dayIndex === nextIndex && !workoutHasStaleExercises(cached.workout);
    let workout;
    if (hasCached) {
      workout = cached.workout;
    } else {
      box.innerHTML = '<div class="empty">Generating your next workout…</div>';
      workout = await generateTodayWorkout(program, nextIndex);
    }
    state.pendingWorkout = { programId: program.id, phaseKey: key, dayIndex: nextIndex, workout, completed: false };
    state.previewWorkout = null;
    await persistNow();
    renderTodayWorkout(workout);
  } catch (err) {
    box.innerHTML = `<div class="empty">Couldn't generate the next workout (${err.message}). Use Regenerate to retry.</div>`;
  }
}

// Read-only list markup for a previewed workout — no swap controls or
// result chips, since nothing here is loggable yet (the real interactive
// card only appears once you've actually committed to the day).
function previewExerciseListHtml(workout) {
  if (!workout || !workout.exercises || !workout.exercises.length) {
    return `<div class="meta">Rest day — nothing to preview.</div>`;
  }
  return `<div class="meta mb6">Preview — the exact exercises you'll get when you start this day:</div>` +
    workout.exercises.map(e => `
      <div class="list-item" style="border-bottom:none; padding:4px 0;">
        <div>
          <div class="name">${e.name}</div>
          <div class="meta">${e.muscle_group} · ${e.sets}×${e.reps}${isHoldExercise(e.name) ? "s hold" : ""}${e.note ? " " + e.note : ""}</div>
        </div>
      </div>`).join("");
}

// Generates (once) and caches the actual exercise list for the day queued
// up after the current rest slot, without touching pendingWorkout/dayIndex
// — so looking at it doesn't move the rotation. skipRestDay() checks this
// same cache and reuses it directly rather than generating again, so the
// preview and the real thing always match.
async function previewNextDayExercises(program, dayIndex, key) {
  const btn = document.getElementById("previewNextDayBtn");
  const box = document.getElementById("nextDayPreviewBox");
  if (btn) { btn.disabled = true; btn.textContent = "Generating preview…"; }
  try {
    const avoidNames = state.pendingWorkout?.workout?.exercises?.map(ex => ex.name) || [];
    const workout = await generateTodayWorkout(program, dayIndex, avoidNames);
    state.previewWorkout = { programId: program.id, phaseKey: key, dayIndex, workout };
    await persistNow();
    if (box) box.innerHTML = previewExerciseListHtml(workout);
    if (btn) btn.remove();
  } catch (err) {
    if (box) box.innerHTML = `<div class="empty">Couldn't generate a preview (${err.message}).</div>`;
    if (btn) { btn.disabled = false; btn.textContent = "Preview exercises"; }
  }
}

// Attached once, not inside renderTodayWorkout — that function runs on every
// swap/regenerate/result-selection, and re-attaching here each time caused
// duplicate listeners to pile up on this persistent container, making
// toggle-based actions (opening a swap panel) appear to silently do nothing
// since multiple listeners would open-then-immediately-close it per click.
async function todayClickHandler(e) {
  const warmcoolBtn = e.target.closest("[data-warmcool-swap]");
  if (warmcoolBtn) {
    const [type, idx] = warmcoolBtn.dataset.warmcoolSwap.split(":");
    await swapWarmupCooldownItem(type, parseInt(idx, 10));
    return;
  }
  const howtoBtn = e.target.closest("[data-howto-open]");
  if (howtoBtn) {
    document.querySelector(`[data-howto-panel="${howtoBtn.dataset.howtoOpen}"]`)?.classList.toggle("hidden");
    return;
  }
  if (handleSwapInfoClick(e)) return;
  const openBtn = e.target.closest("[data-swap-open]");
  if (openBtn) {
    document.querySelector(`[data-swap-panel="${openBtn.dataset.swapOpen}"]`).classList.toggle("hidden");
    return;
  }
  const pick = e.target.closest("[data-swap-pick]");
  if (pick) {
    closeExerciseSheet(true);
    await swapExercise(parseInt(pick.dataset.swapPick, 10), pick.dataset.swapName);
    return;
  }
  const chip = e.target.closest(".result-chip");
  if (chip) {
    const group = chip.parentElement;
    group.querySelectorAll(".result-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    const itemEl = chip.closest(".list-item");
    group.querySelectorAll(".result-chip").forEach(c => { if (c !== chip) c.style.display = "none"; });
    const swapBtn = itemEl.querySelector("[data-swap-open]");
    if (swapBtn) swapBtn.style.display = "none";
    const swapPanelEl = itemEl.querySelector(".swap-panel");
    if (swapPanelEl) swapPanelEl.classList.add("hidden");
  }
}
document.getElementById("todayWorkout").addEventListener("click", todayClickHandler);
document.getElementById("completeWorkoutBtn").addEventListener("click", completeWorkout);

function howToHtml(uid, name, cue) {
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise proper form tutorial")}`;
  return `
    <div style="display:flex; gap:16px; align-items:center; margin-top:6px;">
      <button class="danger-link" style="color:var(--text-muted); font-size:13px;" data-howto-open="${uid}">How to ▾</button>
      <a href="${ytUrl}" target="_blank" rel="noopener" style="color:var(--accent); font-size:13px;">Watch a demo ↗</a>
    </div>
    <div class="hidden" data-howto-panel="${uid}" style="margin-top:4px;">
      ${cue ? `<div class="meta">${cue}</div>` : `<div class="meta">No written cue for this one. Use the demo link.</div>`}
    </div>`;
}



function buildYoutubeUrl(name) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise proper form tutorial")}`;
}

// The exercise currently sitting at a skill's rung — may be more than one
// id at the same rung (equipment alternates); the first match is shown as
// the primary pick, the rest are just as valid if that's what's on hand.
function exerciseAtSkillRung(skill, rung) {
  return exercises.find(e => {
    const l = SKILL_LADDER_MAP[e.id];
    return l && l.skill === skill && l.rung === rung;
  });
}

// Static prescription per exercise — skill-practice items aren't
// AI-generated (they're fixed rungs), so this is a straightforward,
// sets/hold-or-reps/rest prescription instead of something that needs an
// API call. Hold time scales with the exercise's OWN RUNG POSITION within
// its skill ladder (early third of the ladder = short holds, middle third
// = medium, final third = longer) — not the general library "level" number,
// which is a separate, unrelated scale (e.g. wall-handstand-hold is a 4
// there for general push/pull bucketing, even though it's rung 2 of an
// 8-rung handstand line). Rest is deliberately long (skill work is about
// quality of the attempt, not fatiguing the pattern).
// Rungs that are a practiced MOTION (a kick-up, a walk-up, a distance
// attempt) rather than a strength movement you grind reps on — "reps"
// implies the wrong thing here (don't rush 5 of these back-to-back; walk
// up, reset, go again with full attention each time), so these get
// "attempts" in the UI instead. Everything else that isn't a hold (actual
// handstand push-ups, explosive pull-ups, muscle-up negatives) is a real
// strength rep and keeps "reps".
const ATTEMPT_EXERCISE_IDS = new Set([
  "wall-walk-handstand-prep", "freestanding-handstand-practice", "handstand-walk",
]);

const SKILL_REST_SECONDS = 90;
function skillPrescription(ex, rung, maxRung) {
  const sets = 3;
  if (isHoldExercise(ex.id)) {
    const third = maxRung / 3;
    const [low, high] = rung <= third ? [15, 20] : rung <= third * 2 ? [20, 35] : [30, 60];
    return { sets, isHold: true, low, high, text: `${sets} sets × ${low}-${high}s hold · rest ${SKILL_REST_SECONDS}s between sets` };
  }
  const unit = ATTEMPT_EXERCISE_IDS.has(ex.id) ? "attempts" : "reps";
  return { sets, isHold: false, low: 3, high: 5, unit, text: `${sets} sets × 3-5 ${unit} · rest ${SKILL_REST_SECONDS}s between sets` };
}

// Per-skill timer state, kept outside `state` (this is session-local
// practice UI, not data worth persisting) — keyed by skill name, holding
// the running setInterval id and where the set/rest cycle currently is.
const skillTimerState = {};

function stopSkillTimer(skill) {
  const t = skillTimerState[skill];
  if (t?.timer) clearInterval(t.timer);
  delete skillTimerState[skill];
}
function stopAllSkillTimers() {
  Object.keys(skillTimerState).forEach(stopSkillTimer);
}

function renderSkillTimerDisplay(skill) {
  const el = document.querySelector(`[data-skill-timer="${skill}"]`);
  const btn = document.querySelector(`[data-skill-start="${skill}"]`);
  if (!el || !btn) return;
  const t = skillTimerState[skill];
  if (!t) { el.classList.add("hidden"); el.innerHTML = ""; btn.textContent = "Start"; btn.disabled = false; return; }
  el.classList.remove("hidden");
  if (t.phase === "hold") {
    btn.disabled = true;
    el.innerHTML = `Set ${t.setNum} of ${t.sets} — hold<br><span style="font-size:20px;">${t.secondsLeft}s</span>`;
  } else if (t.phase === "rest") {
    btn.disabled = true;
    el.innerHTML = `Rest<br><span style="font-size:20px;">${t.secondsLeft}s</span>`;
  } else if (t.phase === "reps") {
    btn.disabled = true;
    el.innerHTML = `Set ${t.setNum} of ${t.sets} — do your ${t.unit || "reps"}, then:<br><button class="chip" data-skill-set-done="${skill}" style="margin-top:6px;">Set done</button>`;
  } else if (t.phase === "done") {
    btn.disabled = false;
    btn.textContent = "Start again";
    el.innerHTML = `Sets complete — log your result below.`;
  }
}

function tickHoldTimer(skill) {
  const t = skillTimerState[skill];
  if (!t) return;
  t.secondsLeft--;
  if (t.secondsLeft <= 0) {
    if (t.phase === "hold") {
      if (t.setNum >= t.sets) { finishSkillTimer(skill); return; }
      t.phase = "rest";
      t.secondsLeft = SKILL_REST_SECONDS;
    } else if (t.phase === "rest") {
      t.setNum++;
      t.phase = "hold";
      t.secondsLeft = t.holdSeconds;
    }
  }
  renderSkillTimerDisplay(skill);
}

function tickRepRestTimer(skill) {
  const t = skillTimerState[skill];
  if (!t) return;
  t.secondsLeft--;
  if (t.secondsLeft <= 0) {
    clearInterval(t.timer);
    t.setNum++;
    t.phase = "reps";
  }
  renderSkillTimerDisplay(skill);
}

function finishSkillTimer(skill) {
  const t = skillTimerState[skill];
  if (t?.timer) clearInterval(t.timer);
  skillTimerState[skill] = { phase: "done", sets: t.sets, setNum: t.sets };
  renderSkillTimerDisplay(skill);
}

function startSkillTimer(skill) {
  const rung = state.skillLevels?.[skill] || 1;
  const ex = exerciseAtSkillRung(skill, rung);
  if (!ex) return;
  const p = skillPrescription(ex, rung, SKILL_MAX_RUNG[skill] || 5);
  stopSkillTimer(skill);
  if (p.isHold) {
    const holdSeconds = Math.round((p.low + p.high) / 2);
    skillTimerState[skill] = { phase: "hold", setNum: 1, sets: p.sets, secondsLeft: holdSeconds, holdSeconds };
    skillTimerState[skill].timer = setInterval(() => tickHoldTimer(skill), 1000);
  } else {
    // Rep/attempt-based rungs are self-paced for the actual work — the
    // timer only runs the rest between sets, advanced by the "Set done" tap.
    skillTimerState[skill] = { phase: "reps", setNum: 1, sets: p.sets, unit: p.unit };
  }
  renderSkillTimerDisplay(skill);
}

function advanceSkillRepSet(skill) {
  const t = skillTimerState[skill];
  if (!t || t.phase !== "reps") return;
  if (t.setNum >= t.sets) { finishSkillTimer(skill); return; }
  t.phase = "rest";
  t.secondsLeft = SKILL_REST_SECONDS;
  t.timer = setInterval(() => tickRepRestTimer(skill), 1000);
  renderSkillTimerDisplay(skill);
}

// General-strength baseline worth having before starting each skill line.
// Overcoming Gravity itself doesn't hand out a tidy "do N reps" entry test —
// its own progressions are gated by hold-time/rep thresholds *within* the
// ladder (exactly what the rung/streak system above already does). These
// are the baseline numbers the OG-influenced calisthenics community
// commonly trains to before starting each line, shown as a readiness
// reference only — nothing here blocks or unlocks anything.
const SKILL_PREREQUISITES = {
  handstand: "Comfortable full push-up position and basic wrist mobility (no pain bearing weight on flat hands) — the ladder's own rung 1 (wall walk-ups) starts the handstand-specific work from there, no pull-up/push-up count needed first.",
  lsit: "A hollow body hold for 15-20s and comfortable support on straight arms (e.g. a dip support) — the ladder's own rung 1 builds the L-sit-specific compression from there.",
  planche: "~15-20 strict push-ups with no wrist pain in a straight-arm plank — the ladder's own rung 1 starts the planche-specific forward lean from there.",
  backLever: "A comfortable dead hang for 20-30s — the ladder's own rung 1 (an assisted German hang) builds the back-lever-specific shoulder range from there.",
  frontLever: "5-8 strict pull-ups and a comfortable dead hang — front lever leans on pulling strength more than any other skill here, so this baseline matters most before rung 1.",
  muscleUp: "5-8 strict pull-ups and 5-8 dips — the ladder's own rung 1 (explosive high pull-ups) builds the transition-specific power from there.",
};

function renderSkillPractice() {
  const container = document.getElementById("skillPracticeList");
  if (!container) return;
  stopAllSkillTimers();
  const skills = ["handstand", "lsit", "planche", "backLever", "frontLever", "muscleUp"];
  container.innerHTML = skills.map(skill => {
    const rung = state.skillLevels?.[skill] || 1;
    const maxRung = SKILL_MAX_RUNG[skill] || 5;
    const atMax = rung >= maxRung;
    const current = exerciseAtSkillRung(skill, rung);
    if (!current) return "";
    const streak = state.skillStreaks?.[skill] || 0;
    const prescription = skillPrescription(current, rung, maxRung);
    return `
      <details class="exercise-group">
        <summary>${SKILL_DISPLAY_NAMES[skill]} <span class="meta" style="display:inline;">rung ${rung}${atMax ? " (mastered)" : ` of ${maxRung}`}</span></summary>
        <div style="padding-top:6px;">
          <div class="name">${current.name}</div>
          <div class="meta">${atMax ? "" : `${streak}/${REQUIRED_SKILL_STREAK} sessions toward next rung`}</div>
          ${rung === 1 ? `<div class="meta" style="margin-top:2px; opacity:.75;">Suggested base strength: ${SKILL_PREREQUISITES[skill]}</div>` : ""}
          ${atMax ? "" : `<div class="meta" style="margin-top:2px;">${prescription.text}</div>`}
          ${howToHtml(`skill-${skill}`, current.name, current.cue || "")}
          ${atMax
            ? `<div class="meta mt6">Top of the ladder — nothing further to unlock.</div>`
            : `<button class="secondary" data-skill-start="${skill}" style="margin-top:8px; width:100%;">Start</button>
              <div class="hidden" data-skill-timer="${skill}" style="margin-top:8px; text-align:center; font-family:var(--font-mono);"></div>
              <div class="row mt8">
                <div class="chip result-chip" data-skill-log="${skill}" data-result="max">Hit max reps</div>
                <div class="chip result-chip" data-skill-log="${skill}" data-result="hold">As prescribed</div>
                <div class="chip result-chip" data-skill-log="${skill}" data-result="missed">Missed reps</div>
              </div>`}
        </div>
      </details>`;
  }).join("");
}

async function logSkillPractice(skill, result) {
  const rung = state.skillLevels?.[skill] || 1;
  const current = exerciseAtSkillRung(skill, rung);
  if (!current) return;
  applySkillResult(skill, result);
  state.logs = state.logs || [];
  state.logs.push({ date: new Date().toISOString(), exercise: current.name, muscle_group: current.muscle_group, result });
  await persistNow();
  renderSkillPractice();
}

document.getElementById("skillPracticeList").addEventListener("click", async (e) => {
  if (handleSwapInfoClick(e)) return;
  const howtoBtn = e.target.closest("[data-howto-open]");
  if (howtoBtn) {
    document.querySelector(`[data-howto-panel="${howtoBtn.dataset.howtoOpen}"]`)?.classList.toggle("hidden");
    return;
  }
  const startBtn = e.target.closest("[data-skill-start]");
  if (startBtn) {
    startSkillTimer(startBtn.dataset.skillStart);
    return;
  }
  const setDoneBtn = e.target.closest("[data-skill-set-done]");
  if (setDoneBtn) {
    advanceSkillRepSet(setDoneBtn.dataset.skillSetDone);
    return;
  }
  const logBtn = e.target.closest("[data-skill-log]");
  if (logBtn) {
    await logSkillPractice(logBtn.dataset.skillLog, logBtn.dataset.result);
  }
});

function swapAlternatesHtml(currentExercise, uidPrefix) {
  const currentLevel = levelOf(currentExercise.name);
  // While travel mode is on, don't offer a swap to equipment that's not
  // coming on the trip (a dumbbell or band swap is useless mid-workout on
  // the road) — same TRAVEL_EQUIPMENT restriction generation itself uses,
  // so "swap" still means "what could I actually do right now."
  const alternates = exercises.filter(x =>
    x.muscle_group === currentExercise.muscle_group && x.name !== currentExercise.name && x.id !== "bw-complex" &&
    (!state.travelMode || TRAVEL_SWAP_EQUIPMENT.has(x.equipment || "bodyweight"))
  );
  const regressions = alternates.filter(x => levelOf(x.name) < currentLevel);
  const sameLevel = alternates.filter(x => levelOf(x.name) === currentLevel);
  const progressions = alternates.filter(x => levelOf(x.name) > currentLevel);
  const chip = (x, cls) => `
    <span style="display:inline-flex; align-items:center; gap:2px;">
      <span class="chip ${cls}" data-swap-pick="${uidPrefix}" data-swap-name="${x.name.replace(/"/g,'&quot;')}">${x.name}</span>
      <button class="danger-link" aria-label="Info" style="padding:8px; margin:-8px -4px -8px -4px; font-size:14px; color:var(--text-muted); min-width:32px; min-height:32px;" data-swap-info-btn="${uidPrefix}" data-info-name="${x.name.replace(/"/g,'&quot;')}" data-info-cue="${(x.cue||"").replace(/"/g,'&quot;')}">ⓘ</button>
    </span>`;
  const bucket = (label, list, cls) => list.length ? `
    <div class="meta" style="margin-top:8px; margin-bottom:4px;">${label}</div>
    <div class="row">${list.map(x => chip(x, cls)).join("")}</div>
  ` : "";
  if (!alternates.length) return `<div class="empty mt6">${state.travelMode ? "No bodyweight/ring alternates in your library for this muscle group yet." : "No alternates in your library for this muscle group yet."}</div>`;
  return `<div class="hidden" data-swap-info-panel="${uidPrefix}" style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed var(--border);"></div>` +
         bucket("↓ Regressions (easier)", regressions, "swap-regression") +
         bucket("= Same level", sameLevel, "swap-same") +
         bucket("↑ Progressions (harder)", progressions, "swap-progression");
}

function handleSwapInfoClick(e) {
  const infoBtn = e.target.closest("[data-swap-info-btn]");
  if (!infoBtn) return false;
  const panel = document.querySelector(`[data-swap-info-panel="${infoBtn.dataset.swapInfoBtn}"]`);
  if (panel) {
    const name = infoBtn.dataset.infoName;
    const cue = infoBtn.dataset.infoCue;
    panel.innerHTML = `
      <div class="meta mb4"><strong style="color:var(--text);">${name}</strong>${cue ? ": " + cue : ""}</div>
      <a href="${buildYoutubeUrl(name)}" target="_blank" rel="noopener" class="meta" style="color:var(--accent); display:inline-block;">Watch a demo ↗</a>`;
    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  return true;
}

async function computeSwapAdjustment(original, replacement) {
  const system = `You adjust sets/reps when one exercise is swapped for another so the
training stimulus stays comparable — same approximate time-under-tension and
relative effort for the same muscle group, even though leverage/equipment differ.
Respond with ONLY valid JSON: {"sets": 3, "reps": "8-12"}`;
  const prompt = `Original: ${original.name}, ${original.sets}×${original.reps}, muscle group ${original.muscle_group}.
Replacing with: ${replacement.name} (equipment: ${replacement.equipment || "bodyweight"}).
Give adjusted sets/reps for the replacement so effort stays comparable.`;
  try {
    const data = await apiFetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, prompt, max_tokens: 300 }),
    });
    const text = data.content?.[0]?.text || "{}";
    const adj = extractJson(text);
    return {
      name: replacement.name,
      muscle_group: original.muscle_group,
      sets: adj.sets || original.sets,
      reps: adj.reps || original.reps,
      superset_group: original.superset_group || null,
    };
  } catch (err) {
    return { name: replacement.name, muscle_group: original.muscle_group, sets: original.sets, reps: original.reps, superset_group: original.superset_group || null };
  }
}

async function swapWarmupCooldownItem(type, idx) {
  const list = currentWorkout[type];
  if (!list || !list[idx]) return;
  const original = list[idx];
  const muscleGroups = [...new Set(currentWorkout.exercises.map(e => e.muscle_group))].join(", ");
  const isWarmup = type === "warmup";
  // Every name currently showing in TODAY'S warmup AND cool-down, not just
  // the single slot being replaced — the prompt used to only mention the one
  // item being swapped out, so the AI had no idea two other warmup slots
  // already had "Arm circles" and would happily hand back a third, or just
  // re-suggest something already sitting in cool-down. That's the "swap
  // ends up duplicating" bug.
  const alreadyUsed = new Set(
    [...(currentWorkout.warmup || []), ...(currentWorkout.cooldown || [])]
      .filter((x) => x !== original)
      .map(x => x.name.toLowerCase())
  );
  // Same region restriction as generateTodayWorkout/enforceWarmupCooldownVariety
  // — currentWorkout.exercises already carries each slot's muscle_group, the
  // same shape allowedMobilityRegions expects, so this stays in sync with the
  // actual day instead of maintaining a second notion of "today's groups."
  const allowedRegions = allowedMobilityRegions(currentWorkout.exercises);
  const mobilityPool = exercises.filter(e =>
    e.muscle_group === "mobility" && allowedRegions.has(MOBILITY_REGION_MAP[e.id] || "full")
  );
  const mobilityList = mobilityPool
    .map(e => `${e.name}${isHoldExercise(e.id) ? " (hold)" : " (dynamic)"}`).join("; ");
  const system = `You pick a single alternative ${isWarmup ? "dynamic warmup movement" : "static cool-down stretch"}
from the mobility library below — not invented. The list has ALREADY been
filtered to only items relevant to today's muscle groups, so every item in it
is a safe pick; just choose one that's different from the one being replaced
AND different from everything already listed as in use today (no duplicates
within the same warmup/cool-down). All library items are already
bodyweight-only. Respond with ONLY valid JSON:
{"name": "exact name from mobility library", "detail": "string, e.g. ${isWarmup ? "30s each side" : "hold 20s"}"}`;
  const prompt = `Mobility library: ${mobilityList}.
Muscle groups today: ${muscleGroups}. Replacing: "${original.name}" (${original.detail || ""}).
Already in use today — do not repeat any of these: ${[...alreadyUsed].join(", ") || "none"}.`;
  try {
    const data = await apiFetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, prompt, max_tokens: 200 }),
    });
    const text = data.content?.[0]?.text || "{}";
    let picked = extractJson(text);
    // Hard guarantee, not just a prompt ask — if the model still hands back
    // a name already in use (or something outside the library entirely),
    // fall back to the first unused, valid mobility item instead of
    // trusting it blindly.
    const isValidUnused = picked?.name && mobilityPool.some(e => e.name === picked.name) &&
      !alreadyUsed.has(picked.name.toLowerCase());
    if (!isValidUnused) {
      const fallback = mobilityPool.find(e => !alreadyUsed.has(e.name.toLowerCase()) && e.name !== original.name);
      if (fallback) {
        picked = { name: fallback.name, detail: isWarmup ? "30-45s" : (isHoldExercise(fallback.id) ? "hold 20-30s" : "30-45s") };
      }
    }
    currentWorkout[type][idx] = picked;
  } catch (err) {
    alert("Couldn't get an alternative: " + err.message);
    return;
  }
  if (state.pendingWorkout) state.pendingWorkout.workout = currentWorkout;
  await persistNow();
  renderTodayWorkout(currentWorkout);
}

async function swapExercise(index, newName) {
  const original = currentWorkout.exercises[index];
  const replacement = exercises.find(x => x.name === newName);
  currentWorkout.exercises[index] = await computeSwapAdjustment(original, replacement);
  if (state.pendingWorkout) state.pendingWorkout.workout = currentWorkout;
  await persistNow();
  renderTodayWorkout(currentWorkout);
}

function parseRepRange(repsStr) {
  const nums = (String(repsStr).match(/\d+/g) || []).map(Number);
  if (!nums.length) return { min: 0, max: 0 };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: nums[0], max: nums[nums.length - 1] };
}

// True when the weight-trend pace check says you're losing faster than the
// recomp target (0.5-0.75%/week) — a recovery-capacity warning sign, not
// something to reward with a harder program.
function isLosingTooFast() {
  // Safety signal, deliberately independent of the macro-suggestion range:
  // still the original 0.75%/week line.
  const trend = computeWeightTrend(14);
  return !!(trend && trend.pctPerWeek < -0.75);
}

async function applyWorkoutResults(results) {
  // Guard against a duplicate submission — a fast double-tap or a mobile
  // "ghost click" firing the completion handler twice for one tap. This
  // previously let a single workout double-count, inflating progressLevels
  // by an extra step each time (e.g. push jumping 3->5 instead of 3->4 from
  // one real session). If the exact same set of exercise/result pairs was
  // already logged in the last few seconds, treat this call as the echo of
  // that submission and skip it rather than applying it again.
  const now = Date.now();
  const signature = results.map(r => `${r.exercise.name}:${r.result}`).sort().join("|");
  const recentSignature = (state.logs || [])
    .filter(l => now - new Date(l.date).getTime() < 8000)
    .map(l => `${l.exercise}:${l.result}`).sort().join("|");
  if (signature && signature === recentSignature) {
    return;
  }

  const holdProgression = isLosingTooFast();
  const oldLevels = { ...state.progressLevels };
  state.planeLevels = state.planeLevels || { push_h: 1, push_v: 1, pull_h: 1, pull_v: 1 };
  state.lastPlaneServed = state.lastPlaneServed || { push: null, pull: null };
  // Requires 2 CONSECUTIVE max-reps sessions (not one) before a muscle
  // group/plane advances a difficulty tier. One strong session used to be
  // enough to jump a full level — on this user's own log, that meant going
  // from "intermediate" start to push level 5 (the hardest tier, things
  // like a full handstand push-up or weighted ring dip) in about a week,
  // which is far faster than real strength progression and is why genuinely
  // advanced moves (parallette handstand hold, skin the cat) started
  // showing up almost immediately. A miss still drops a level right away
  // and resets the streak — only the way UP got more conservative.
  state.maxStreaks = state.maxStreaks || {};
  const REQUIRED_MAX_STREAK = 2;

  // legs/hinge/core/ruck keep the simple flat level. push/pull are handled
  // separately below, per-plane, instead of as one flat number.
  const byGroup = {};
  results.forEach(r => {
    const mg = r.exercise.muscle_group;
    if (isBellExercise(r.exercise)) return; // bell work progresses by weight, not the bodyweight levels
    if (mg === "push" || mg === "pull") return;
    if (!byGroup[mg]) byGroup[mg] = [];
    byGroup[mg].push(r.result);
  });
  Object.entries(byGroup).forEach(([mg, outcomes]) => {
    const cur = state.progressLevels[mg] || 1;
    if (outcomes.includes("missed")) {
      state.progressLevels[mg] = Math.max(1, cur - 1);
      state.maxStreaks[mg] = 0;
    } else if (outcomes.every(o => o === "max") && !holdProgression) {
      const streak = (state.maxStreaks[mg] || 0) + 1;
      if (streak >= REQUIRED_MAX_STREAK) {
        state.progressLevels[mg] = Math.min(5, cur + 1);
        state.maxStreaks[mg] = 0;
      } else {
        state.maxStreaks[mg] = streak;
      }
    }
  });

  // Push/pull: level up/down per movement plane (horizontal vs vertical)
  // instead of one flat number for the whole muscle group — this is what
  // stops e.g. hitting max reps on a ring row from also silently advancing
  // the vertical pull-up ladder it has nothing to do with. Also records
  // which plane was actually trained, so next generation alternates to the
  // other one.
  const byPlaneGroup = {};
  results.forEach(r => {
    const mg = r.exercise.muscle_group;
    if (mg !== "push" && mg !== "pull") return;
    if (isBellExercise(r.exercise)) return;
    const plane = planeOf(r.exercise.name, mg);
    const key = `${mg}_${plane}`;
    if (!byPlaneGroup[key]) byPlaneGroup[key] = { mg, plane, outcomes: [] };
    byPlaneGroup[key].outcomes.push(r.result);
  });
  Object.values(byPlaneGroup).forEach(({ mg, plane, outcomes }) => {
    const key = `${mg}_${plane}`;
    const cur = state.planeLevels[key] || 1;
    if (outcomes.includes("missed")) {
      state.planeLevels[key] = Math.max(1, cur - 1);
      state.maxStreaks[key] = 0;
    } else if (outcomes.every(o => o === "max") && !holdProgression) {
      const streak = (state.maxStreaks[key] || 0) + 1;
      if (streak >= REQUIRED_MAX_STREAK) {
        state.planeLevels[key] = Math.min(5, cur + 1);
        state.maxStreaks[key] = 0;
      } else {
        state.maxStreaks[key] = streak;
      }
    }
    // Keep the flat push/pull number in sync as the higher of its two
    // planes, purely so other UI that still reads it (swap picker, library
    // filter, progress charts) keeps behaving sensibly without a rewrite.
    state.progressLevels[mg] = Math.max(state.planeLevels[`${mg}_h`] || 1, state.planeLevels[`${mg}_v`] || 1);
    state.lastPlaneServed[mg] = plane;
  });

  // Skill ladders (handstand/L-sit/planche/back lever/front lever/
  // muscle-up) — a completely separate progression axis from push/pull/core
  // level, per Overcoming Gravity: these advance ONLY on sustained
  // performance of the actual rung being worked, never by borrowing
  // readiness from general strength. Requires REQUIRED_SKILL_STREAK
  // consecutive max sessions (stricter than the general 2, since OG treats
  // skill acquisition as slower than rep-strength gains) on the CURRENT
  // rung specifically — a result only counts if its exercise maps to the
  // rung state.skillLevels[skill] is already at, so manually swapping to a
  // different/harder rung can't accidentally skip ahead. Unlike the
  // strength ladders above, a miss resets the streak but never regresses
  // the rung — a bad hold attempt doesn't mean you un-learn what you'd
  // already built toward it, it just means you're not ready for the next
  // one yet.
  state.skillLevels = state.skillLevels || { ...DEFAULT_SKILL_LEVELS };
  state.skillStreaks = state.skillStreaks || {};
  const bySkillGroup = {};
  results.forEach(r => {
    const libEx = exercises.find(x => x.name === r.exercise.name);
    const ladder = libEx && SKILL_LADDER_MAP[libEx.id];
    if (!ladder) return;
    // Only counts toward advancing THIS skill if it's actually today's
    // current rung — a result logged against an easier or harder rung
    // (e.g. after a manual swap) doesn't move the ladder.
    if (ladder.rung !== (state.skillLevels[ladder.skill] || 1)) return;
    if (!bySkillGroup[ladder.skill]) bySkillGroup[ladder.skill] = [];
    bySkillGroup[ladder.skill].push(r.result);
  });
  // applySkillResult (module-level, shared with the dedicated skill-
  // practice section below) is the single source of truth for the
  // 3-in-a-row rule — kept in sync here instead of duplicating the logic.
  Object.entries(bySkillGroup).forEach(([skill, outcomes]) => {
    if (outcomes.includes("missed")) { applySkillResult(skill, "missed"); return; }
    if (outcomes.every(o => o === "max")) applySkillResult(skill, "max");
  });

  // Ring strap setting — a separate, continuous axis from the level above,
  // push only (lower number = more horizontal = harder). Pull deliberately
  // does NOT use ring-row horizontality as its progression axis: research
  // (GMB's pull-up guide, the r/bodyweightfitness recommended routine) both
  // treat "more horizontal row" as a different movement pattern from a
  // vertical pull-up that doesn't directly transfer — the real bridge to a
  // pull-up is the vertical-specific ladder (dead hang -> negatives ->
  // band-assisted -> pull-up), which the existing level system already
  // reflects via EXERCISE_LEVEL_MAP. So only push gets adjusted here.
  state.ringStrap = state.ringStrap || { push: null };
  const ringByGroup = {};
  results.forEach(r => {
    const mg = r.exercise.muscle_group;
    if (mg !== "push") return;
    const libEx = exercises.find(x => x.name === r.exercise.name);
    if (!libEx || libEx.equipment !== "rings") return;
    if (!ringByGroup[mg]) ringByGroup[mg] = [];
    ringByGroup[mg].push(r.result);
  });
  Object.entries(ringByGroup).forEach(([mg, outcomes]) => {
    const cur = state.ringStrap[mg];
    if (cur == null) return; // not set yet — nothing to adjust from
    if (outcomes.includes("missed")) {
      state.ringStrap[mg] = Math.min(12, cur + 0.5);
    } else if (outcomes.every(o => o === "max") && !holdProgression) {
      state.ringStrap[mg] = Math.max(1, cur - 0.5);
    }
  });

  state.logs = state.logs || [];
  results.forEach(r => {
    state.logs.push({ date: new Date().toISOString(), exercise: r.exercise.name, muscle_group: r.exercise.muscle_group, result: r.result, ...(r.actuals && r.actuals.length ? { actuals: r.actuals } : {}) });
  });

  checkWorkoutMilestones(oldLevels);

  if (state.pendingWorkout && !state.pendingWorkout.completed) {
    // A prescribed session finished — advances count-paced programs.
    const pid = state.pendingWorkout.programId;
    if (pid && state.programProgress) {
      const prog = programs.find(p => p.id === pid);
      if (prog && getProgramPace(prog).mode === "count") {
        state.programProgress[pid] = { mode: "count", completed: getProgramPace(prog).completed + 1 };
      }
    }
  }
  if (state.pendingWorkout) state.pendingWorkout.completed = true;
  clearSessionSnapshot();
  await persistNow();
  renderProgressCharts();
  renderCelebrations();
  renderSkillPractice();
}

async function completeWorkout() {
  // Only the main exercise cards carry data-ex-index. Warm-up and cool-down
  // rows are also .list-item, and counting them produced an undefined
  // exercise that made the whole save fail silently.
  const items = document.querySelectorAll("#todayWorkout .list-item[data-ex-index]");
  const results = [];
  items.forEach((item) => {
    const idx = parseInt(item.dataset.exIndex, 10);
    const ex = currentWorkout.exercises[idx];
    if (!ex) return;
    const active = item.querySelector(".result-chip.active");
    results.push({ exercise: ex, result: active ? active.dataset.result : "hold" });
  });
  try {
    await applyWorkoutResults(results);
  } catch (err) {
    alert("Couldn't log the workout: " + err.message);
    return;
  }
  renderTodayWorkout(currentWorkout);
  alert("Logged. Levels updated where you hit or missed the rep range.");
}
