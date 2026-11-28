// ---- guided session ----
let session = null;

// The guided session lives in memory, so a pull-to-refresh or a low-memory
// kill used to wipe it mid-workout. Keep a small snapshot after every step
// and offer to resume it from the Today tab.
const SESSION_SNAPSHOT_KEY = "tf_session_snapshot";
function saveSessionSnapshot() {
  try {
    if (!session) { localStorage.removeItem(SESSION_SNAPSHOT_KEY); return; }
    const pw = state.pendingWorkout;
    if (!pw || pw.completed) return;
    localStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify({
      programId: pw.programId, dayIndex: pw.dayIndex, savedAt: Date.now(),
      session: { ...session, timerId: null, holding: false },
    }));
  } catch (e) {}
}
function clearSessionSnapshot() { try { localStorage.removeItem(SESSION_SNAPSHOT_KEY); } catch (e) {} }
function loadSessionSnapshot() {
  try {
    const snap = JSON.parse(localStorage.getItem(SESSION_SNAPSHOT_KEY) || "null");
    const pw = state.pendingWorkout;
    if (!snap || !pw || pw.completed) return null;
    if (snap.programId !== pw.programId || snap.dayIndex !== pw.dayIndex) return null;
    if (Date.now() - snap.savedAt > 12 * 60 * 60 * 1000) return null;
    if (!snap.session || !Array.isArray(snap.session.queue)) return null;
    return snap;
  } catch (e) { return null; }
}
function resumeSessionFromSnapshot() {
  const snap = loadSessionSnapshot();
  if (!snap) return;
  session = { ...snap.session, timerId: null, holding: false };
  // A session saved with Pause: put the paused time back (clock, rest) before the checks below.
  // The rest timer itself is re-armed by the resting block further down.
  if (session.paused) applyUnpause(false);
  if (session.emom && session.emom.startedAt) {
    // Far past the end of the block (app was away a long time): don't credit rounds nobody can vouch for.
    if (Date.now() - session.emom.startedAt > (session.emom.rounds * session.emom.interval + 120) * 1000) {
      while (session.emom && session.emom.done < session.emom.rounds) emomRecordRound(false);
      session.emom = null;
    } else {
      session.timerId = setInterval(tickEmom, 1000);
    }
  }
  if (session.resting) {
    if (session.restEndTime > Date.now()) session.timerId = setInterval(tickRest, 1000);
    else session.resting = false;
  }
  document.getElementById("todayWorkout").classList.add("hidden");
  document.getElementById("startSessionBtn").classList.add("hidden");
  document.getElementById("minimumDayBtn").classList.add("hidden");
  document.getElementById("genWorkoutBtn").classList.add("hidden");
  renderSession();
}

function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// For the end-of-session summary, not the live countdown clocks above —
// "42m 10s" / "1h 08m" reads better on a completed-workout card than a
// running m:ss timer does.
function formatDuration(ms) {
  if (ms == null) return null;
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

// results: the same [{ exercise, result }] shape finishSession/
// finishSessionPartial already build. Reads elapsed time off session.startedAt
// (set when the guided session began) and set/exercise counts off
// session.setsActual (the live log of actual reps/hold-seconds per exercise).
function buildSessionSummary(results) {
  const elapsedMs = session && session.startedAt ? Date.now() - session.startedAt : null;
  const setsActual = (session && session.setsActual) || {};
  const totalSets = Object.values(setsActual).reduce((sum, arr) => sum + arr.length, 0);
  const exercisesDone = Object.values(setsActual).filter(arr => arr.length).length;
  const maxCount = results.filter(r => r.result === "max").length;
  return { elapsedMs, totalSets, exercisesDone, maxCount };
}

function renderSessionSummary(summary, opts = {}) {
  if (!opts.restore) buzz([40, 60, 40]);
  const panel = document.getElementById("sessionPanel");
  panel.setAttribute("data-sx", "done");
  const duration = formatDuration(summary.elapsedMs);
  // Distinct training days in the last 7 days (this includes today, since the session is already logged).
  const weekCut = Date.now() - 7 * 86400000;
  const thisWeek = new Set((state.logs || []).filter(l => new Date(l.date).getTime() >= weekCut).map(l => new Date(l.date).toDateString())).size;
  const dayName = escapeHtml(dayTitle(String(currentWorkout?.day || "Workout")));
  const note = opts.partial
    ? "You logged what you did, and that counts. The full workout waits for next time."
    : summary.maxCount
      ? `${summary.maxCount} move${summary.maxCount === 1 ? "" : "s"} at the top of the rep range. Next time, aim for a little more there.`
      : "Solid work. Same targets next time, and the reps will come.";
  const tile = (n, label) => `<div class="tf-fin-tile"><b>${n}</b><span>${label}</span></div>`;
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="card">
      <div class="tf-fin-kicker">${opts.partial ? "SESSION STOPPED" : "WORKOUT COMPLETE"}</div>
      <div class="tf-fin-big">${opts.partial ? "Logged" : "Done"}</div>
      <div class="tf-fin-day">${dayName}</div>
      <div class="tf-fin-tiles">
        ${tile(duration || "·", "total time")}
        ${tile(summary.exercisesDone, summary.exercisesDone === 1 ? "move" : "moves")}
        ${tile(summary.totalSets, summary.totalSets === 1 ? "set" : "sets")}
        ${tile(thisWeek, thisWeek === 1 ? "day this week" : "days this week")}
      </div>
      <div class="tf-fin-note">${note}</div>
      <div style="flex:1"></div>
      <button class="primary w100" id="sessionSummaryDoneBtn">Done</button>
    </div>`;
  document.getElementById("sessionSummaryDoneBtn").addEventListener("click", () => {
    session = null; clearSessionSnapshot();
    panel.removeAttribute("data-sx");
    panel.classList.add("hidden");
    document.getElementById("todayWorkout").classList.remove("hidden");
    document.getElementById("startSessionBtn").classList.remove("hidden");
    document.getElementById("minimumDayBtn").classList.remove("hidden");
    document.getElementById("genWorkoutBtn").classList.remove("hidden");
    renderTodayWorkout(currentWorkout);
  }, { once: true });
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 300);
  } catch (e) { /* audio not available, ignore */ }
}

// Builds a flat queue of "do this set" steps. Superset partners interleave
// round by round (A set 1, B set 1, A set 2, B set 2, ...) with a short
// transition between partners and a full rest only after each complete round.
function buildSessionQueue(exs) {
  // Programs built with a session length (circuit-style) use shorter rests so
  // the heart rate stays up: 45s after a superset round, 60s after a solo set.
  // Older programs keep the original 90s.
  const activeSessionProgram = programs.find(p => p.id === state.activeProgramId);
  const sessionRest = activeSessionProgram?.structure?.session ? { round: 45, solo: 60 } : { round: 90, solo: 90 };
  const queue = [];
  const seenGroups = new Set();
  exs.forEach((e, i) => {
    if (e.superset_group) {
      if (seenGroups.has(e.superset_group)) return;
      seenGroups.add(e.superset_group);
      const members = exs.map((x, xi) => ({ ...x, exIndex: xi })).filter(x => x.superset_group === e.superset_group);
      const maxSets = Math.max(...members.map(m => m.sets));
      for (let round = 0; round < maxSets; round++) {
        members.forEach((m, mi) => {
          if (round >= m.sets) return;
          // Last move still in play this round: if a later partner has run out of
          // sets (e.g. 4 pulls but 3 lunges), the extra set gets the full rest
          // instead of the short 15s pair-switch rest.
          const isLastInRound = !members.slice(mi + 1).some(x => round < x.sets);
          queue.push({
            exIndex: m.exIndex, name: m.name, muscle_group: m.muscle_group,
            reps: m.reps, note: m.note || null, setNum: round + 1, totalSets: m.sets,
            restAfter: isLastInRound ? sessionRest.round : 15,
            supersetLabel: `Superset ${e.superset_group} · ${mi + 1} of ${members.length}`,
          });
        });
      }
    } else {
      for (let s = 0; s < e.sets; s++) {
        queue.push({
          exIndex: i, name: e.name, muscle_group: e.muscle_group,
          reps: e.reps, note: e.note || null, emom: e.emom || null, setNum: s + 1, totalSets: e.sets,
          restAfter: sessionRest.solo, supersetLabel: null,
        });
      }
    }
  });
  return queue;
}

// Plain-language reminder on per-side moves: both sides make one set.
function eachSideCueHtml(step, isHold) {
  if (!step || !/each (side|arm|leg)/i.test(step.note || "")) return "";
  const txt = isHold
    ? `Both sides make one set. The timer runs side 1, gives you a short switch, then runs side 2.`
    : `Both sides make one set. Do ${escapeHtml(String(step.reps))} reps on one side, switch, then ${escapeHtml(String(step.reps))} on the other.`;
  return `<div class="tf-hint"><b>Both sides</b> ${txt}</div>`;
}
// One plain-language line for superset steps: what happens right after this set.
function supersetCueHtml(step) {
  if (!step || !step.supersetLabel) return "";
  const next = session.queue[session.pos + 1];
  const sameGroup = next && next.supersetLabel && next.supersetLabel.split(" · ")[0] === step.supersetLabel.split(" · ")[0];
  const m = step.supersetLabel.match(/(\d+) of (\d+)$/);
  const isLast = m && m[1] === m[2];
  let txt;
  const both = /each (side|arm|leg)/i.test(step.note || "") ? "finish both sides, then " : "";
  if (!isLast && sameGroup) txt = `${both ? "Do this move: " + both : "Then "}go straight into ${escapeHtml(next.name)} (about 15 seconds). Rest only after that one.`;
  else if (!isLast && !sameGroup) txt = `${both ? "Finish both sides, then rest" : "Rest after this one"}. Your partner move is done for this pair.`;
  else if (isLast) txt = next && next.supersetLabel && next.supersetLabel.split(" · ")[0] === step.supersetLabel.split(" · ")[0] ? `${both ? "Finish both sides, then rest" : "Rest"}. Then repeat the pair from the first move.` : `${both ? "Finish both sides, then rest" : "Rest after this one"}. That finishes the pair.`;
  else return "";
  return `<div class="meta" style="margin-top:6px; color:var(--accent);">${txt}</div>`;
}
function startSession() {
  if (!currentWorkout) return;
  if (loadSessionSnapshot() && !confirm("You have a workout in progress (paused). Start over and lose it?")) return;
  session = {
    phase: (currentWorkout.warmup && currentWorkout.warmup.length) ? "warmup" : "main",
    queue: buildSessionQueue(currentWorkout.exercises),
    pos: 0,
    resting: false,
    restEndTime: 0,
    holding: false,
    timerId: null,
    setsActual: {}, // exIndex -> [actual reps per set, or seconds held for isometric holds]
    minimalMode: false,
    checkpointAt: null,
    startedAt: Date.now(),
  };
  document.getElementById("todayWorkout").classList.add("hidden");
  document.getElementById("startSessionBtn").classList.add("hidden");
  document.getElementById("minimumDayBtn").classList.add("hidden");
  document.getElementById("genWorkoutBtn").classList.add("hidden");
  renderSession();
}

// A deliberately tiny entry point for days when starting at all is the real
// barrier — just the first exercise (or superset pair), then a checkpoint
// asking whether to continue into the full workout or stop there. Skips
// warmup entirely to keep the barrier as low as possible.
function startMinimumDay() {
  if (!currentWorkout) return;
  if (loadSessionSnapshot() && !confirm("You have a workout in progress (paused). Start over and lose it?")) return;
  const fullQueue = buildSessionQueue(currentWorkout.exercises);
  const firstExIndex = fullQueue[0]?.exIndex;
  const firstGroup = currentWorkout.exercises[firstExIndex]?.superset_group;
  const initialExIndexes = new Set(
    currentWorkout.exercises
      .map((e, i) => ({ e, i }))
      .filter(({ e, i }) => firstGroup ? e.superset_group === firstGroup : i === firstExIndex)
      .map(({ i }) => i)
  );
  const checkpointIdx = fullQueue.findIndex(step => !initialExIndexes.has(step.exIndex));
  session = {
    phase: "main", // skip warmup — lowest possible barrier to just starting
    queue: fullQueue,
    pos: 0,
    resting: false,
    restEndTime: 0,
    holding: false,
    timerId: null,
    setsActual: {},
    minimalMode: true,
    checkpointAt: checkpointIdx === -1 ? null : checkpointIdx,
    startedAt: Date.now(),
  };
  document.getElementById("todayWorkout").classList.add("hidden");
  document.getElementById("startSessionBtn").classList.add("hidden");
  document.getElementById("minimumDayBtn").classList.add("hidden");
  document.getElementById("genWorkoutBtn").classList.add("hidden");
  renderSession();
}

function renderMinimumDayCheckpoint() {
  const panel = document.getElementById("sessionPanel");
  panel.removeAttribute("data-sx");
  panel.innerHTML = `
    <div class="card">
      <h2>Nice — that's today's minimum done</h2>
      <div class="meta">Feeling good? Your call either way.</div>
      <button class="primary mt10 w100" id="continueFullBtn">Continue to full workout</button>
      <button class="secondary mt8 w100" id="stopHereBtn">Stop here for today</button>
    </div>`;
  document.getElementById("continueFullBtn").addEventListener("click", () => {
    session.minimalMode = false;
    session.checkpointAt = null;
    if (session.pos >= session.queue.length) {
      renderSession();
    } else {
      const lastStep = session.queue[session.pos - 1];
      startRest(lastStep.restAfter);
    }
  });
  document.getElementById("stopHereBtn").addEventListener("click", finishSessionPartial);
}

async function finishSessionPartial() {
  const results = currentWorkout.exercises
    .map((e, i) => ({ e, i }))
    .filter(({ i }) => session.setsActual[i] && session.setsActual[i].length)
    .map(({ e, i }) => {
      const actuals = session.setsActual[i];
      const range = parseRepRange(e.reps);
      let result = "hold";
      if (actuals.some(a => a < range.min)) result = "missed";
      else if (actuals.every(a => a >= range.max)) result = "max";
      return { exercise: e, result, actuals: actuals.slice() };
    });
  const summary = buildSessionSummary(results);
  await applyWorkoutResults(results);
  renderSessionSummary(summary, { partial: true });
}

function sx(state) { const p = document.getElementById("sessionPanel"); if (p) p.dataset.sx = state; }
// Top strip of every guided-session screen: where you are, how long you've been going, and a progress bar.
function sxTop(label) {
  const total = session && session.queue ? session.queue.length : 0;
  const pct = total ? Math.min(100, Math.round((session.pos / total) * 100)) : 0;
  const secs = session && session.startedAt ? Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)) : 0;
  return `<div class="sx-top"><span>${label}</span><span>${formatTime(secs)}</span></div><div class="sx-bar"><i style="width:${pct}%"></i></div>`;
}
// Keep the elapsed-time readout in the top strip live while a timer screen is open.
function sxTick() {
  const e = document.querySelector("#sessionPanel .sx-top span:last-child");
  if (e && session && session.startedAt) e.textContent = formatTime(Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)));
}
// Timers for held stretches in the warm-up/cool-down ("hold 45s each side").
// Tap Timer to count the hold; for "each side" a short switch pause and a
// second hold follow automatically. Ranges ("20-30s") use the longer number.
let wcTimer = null;
function wcHoldInfo(detail) {
  const d = String(detail || "");
  const m = d.match(/hold\s+(\d+)(?:\s*-\s*(\d+))?\s*s\b/i) || d.match(/\b(\d+)(?:\s*-\s*(\d+))?\s*s\s+each side/i);
  if (!m) return null;
  return { secs: parseInt(m[2] || m[1], 10), each: /each side/i.test(d) };
}
function wcStopTimer() {
  if (wcTimer) { clearInterval(wcTimer.id); wcTimer = null; }
}
function wcToggleTimer(i, items) {
  const info = wcHoldInfo(items[i] && items[i].detail);
  if (!info) return;
  const wasThis = wcTimer && wcTimer.idx === i;
  document.querySelectorAll("[data-wc-timer]").forEach(b => { b.textContent = "Timer"; });
  wcStopTimer();
  if (wasThis) return;   // second tap cancels
  wcTimer = { idx: i, secs: info.secs, each: info.each, side: 1, mode: "hold", end: Date.now() + info.secs * 1000, id: null };
  wcTimer.id = setInterval(wcTick, 250);
  wcTick();
}
function wcTick() {
  const t = wcTimer; if (!t) return;
  const btn = document.getElementById("wcT" + t.idx);
  if (!btn) { wcStopTimer(); return; }
  const left = Math.max(0, Math.ceil((t.end - Date.now()) / 1000));
  btn.textContent = t.mode === "switch" ? "Switch " + left : (t.each ? "Side " + t.side + " · " : "") + left + "s";
  if (left > 0) return;
  try { playBeep(); } catch (e) {}
  buzz(40);
  if (t.mode === "hold" && t.each && t.side === 1) {
    t.mode = "switch"; t.end = Date.now() + 5000; return;
  }
  if (t.mode === "switch") {
    t.mode = "hold"; t.side = 2; t.end = Date.now() + t.secs * 1000; return;
  }
  wcStopTimer();
  btn.textContent = "Done ✓";
}
function renderWarmupCooldownStep(phase) {
  const panel = document.getElementById("sessionPanel");
  const items = currentWorkout[phase] || [];
  const isWarmup = phase === "warmup";
  sx("warm");
  panel.innerHTML = `
    <div class="card">
      ${sxTop(isWarmup ? "Warm-up" : "Cool-down")}
      <h2>${isWarmup ? "Warm-up" : "Cool-down"}</h2>
      ${items.map((it, i) => `
        <div class="list-item">
          <div><div class="name">${it.name}</div><div class="meta">${it.detail || ""}</div></div>
          <div style="display:flex; gap:14px; align-items:center;">
            ${wcHoldInfo(it.detail) ? `<button class="danger-link" style="color:var(--accent); min-width:64px; text-align:right;" data-wc-timer="${i}" id="wcT${i}">Timer</button>` : ""}
            <button class="danger-link" style="color:var(--accent);" data-warmcool-swap="${phase}:${i}">Swap</button>
          </div>
        </div>`).join("")}
      <div class="sx-spacer"></div><button class="primary" id="warmCoolContinueBtn" style="margin-top:18px; width:100%;">${isWarmup ? "Start workout" : "Finish session"}</button>
      <button class="secondary mt8 w100" id="endSessionBtn">End session early</button>
    </div>`;
  wcStopTimer();
  panel.querySelectorAll("[data-wc-timer]").forEach(btn => {
    btn.addEventListener("click", () => wcToggleTimer(parseInt(btn.dataset.wcTimer, 10), items));
  });
  panel.querySelectorAll("[data-warmcool-swap]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const [type, idx] = btn.dataset.warmcoolSwap.split(":");
      await swapWarmupCooldownItem(type, parseInt(idx, 10));
      renderWarmupCooldownStep(phase);
    });
  });
  document.getElementById("warmCoolContinueBtn").addEventListener("click", () => {
    if (isWarmup) {
      session.phase = "main";
      renderSession();
    } else {
      finishSession();
    }
  });
  document.getElementById("endSessionBtn").addEventListener("click", endSessionEarly);
}

// End session early: whatever sets were finished get logged and the day counts as done (same as the
// minimum-day "stop here"). With nothing finished there is nothing to log, so it just leaves.
function leaveSessionPanel() {
  if (session) clearInterval(session.timerId);
  wcStopTimer();
  session = null; clearSessionSnapshot();
  const panel = document.getElementById("sessionPanel");
  panel.removeAttribute("data-sx");
  panel.classList.add("hidden");
  document.getElementById("todayWorkout").classList.remove("hidden");
  document.getElementById("startSessionBtn").classList.remove("hidden");
  document.getElementById("minimumDayBtn").classList.remove("hidden");
  document.getElementById("genWorkoutBtn").classList.remove("hidden");
}
async function endSessionEarly() {
  if (!session) return;
  const didAny = Object.values(session.setsActual || {}).some(a => a.length);
  if (!didAny) {
    if (!confirm("You haven't finished any sets yet, so nothing will be logged. Leave the workout?")) return;
    leaveSessionPanel();
    return;
  }
  if (!confirm("End session early? The sets you finished will be logged and today counts as done.")) return;
  clearInterval(session.timerId); session.timerId = null;
  wcStopTimer();
  session.paused = false; session.resting = false; session.holding = false; session.emom = null;
  await finishSessionPartial();
}

// ---- Pause / resume ----
// Pause freezes everything: the clock, the rest countdown, and the screen. Your finished sets are kept.
// A set you were in the middle of (a hold, or a timed block round) starts again from the top.
// The paused state is saved with the rest of the session, so it survives closing the app.
function pauseSession() {
  if (!session || session.paused) return;
  if (session.emom && session.emom.startedAt) { try { tickEmom(); } catch (e) {} }  // credit rounds already due
  if (!session || session.paused) return;
  const now = Date.now();
  clearInterval(session.timerId); session.timerId = null;
  wcStopTimer();
  session.pausedWasResting = !!session.resting;
  session.pausedRestMs = session.resting ? Math.max(0, session.restEndTime - now) : 0;
  session.resting = false;
  session.holding = false; session.holdSide = 1; session.holdSide1Held = null; session.holdSwitchEnd = 0;
  session.emom = null;
  session.paused = true; session.pausedAt = now;
  saveSessionSnapshot();
  renderPausedScreen();
  try { syncWakeLock(); } catch (e) {}
}
// Puts the clock and rest time back. startTimers=false when the caller re-arms the rest timer itself.
function applyUnpause(startTimers) {
  const now = Date.now();
  session.startedAt = (session.startedAt || now) + Math.max(0, now - (session.pausedAt || now));
  if (session.pausedWasResting && session.pausedRestMs > 0) {
    session.resting = true;
    session.restEndTime = now + session.pausedRestMs;
    if (startTimers) session.timerId = setInterval(tickRest, 1000);
  }
  session.paused = false; session.pausedAt = null; session.pausedWasResting = false; session.pausedRestMs = 0;
}
function unpauseSession() {
  if (!session || !session.paused) return;
  applyUnpause(true);
  buzz(20);
  renderSession();
  try { syncWakeLock(); } catch (e) {}
}
function renderPausedScreen() {
  const panel = document.getElementById("sessionPanel");
  panel.classList.remove("hidden");
  sx("rest");
  const total = session.queue.length;
  const done = Math.min(session.pos, total);
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const secs = Math.max(0, Math.floor(((session.pausedAt || Date.now()) - (session.startedAt || Date.now())) / 1000));
  const step = session.queue[session.pos];
  let next;
  if (session.phase === "warmup") next = "Warm-up";
  else if (session.phase === "cooldown" || !step) next = "Cool-down";
  else next = escapeHtml(step.name) + ", set " + step.setNum + " of " + step.totalSets;
  const restNote = session.pausedWasResting && session.pausedRestMs > 0 ? " Your rest picks up with " + formatTime(Math.ceil(session.pausedRestMs / 1000)) + " left." : "";
  panel.innerHTML = `
    <div class="card">
      <div class="sx-top"><span>Paused</span><span>${formatTime(secs)}</span></div><div class="sx-bar"><i style="width:${pct}%"></i></div>
      <h2>Workout paused</h2>
      <div class="meta">${done} of ${total} sets done. The clock is stopped.</div>
      <div class="meta mt8">Next up: ${next}.${restNote}</div>
      <div class="meta mt8">Your spot is saved. You can leave this screen or close the app. Come back to Today and tap Resume.</div>
      <div class="sx-spacer"></div>
      <button class="primary w100" id="resumePausedBtn">Resume workout</button>
      <button class="secondary mt8 w100" id="pausedEndBtn">End session early</button>
    </div>`;
  document.getElementById("resumePausedBtn").addEventListener("click", unpauseSession);
  document.getElementById("pausedEndBtn").addEventListener("click", endSessionEarly);
}
// Every guided screen gets a Pause button (just above End session early when there is one).
function renderSession() {
  if (session && session.paused) { renderPausedScreen(); return; }
  renderSessionInner();
  const panel = document.getElementById("sessionPanel");
  if (!session || !panel || panel.classList.contains("hidden") || panel.getAttribute("data-sx") === "done") return;
  const card = panel.querySelector(".card");
  if (!card || card.querySelector("#pauseSessionBtn")) return;
  const end = card.querySelector("#endSessionBtn");
  const html = '<button class="secondary mt8 w100" id="pauseSessionBtn">Pause workout</button>';
  if (end) end.insertAdjacentHTML("beforebegin", html); else card.insertAdjacentHTML("beforeend", html);
  card.querySelector("#pauseSessionBtn").addEventListener("click", pauseSession);
}

function renderSessionInner() {
  saveSessionSnapshot();
  const panel = document.getElementById("sessionPanel");
  if (!session) { panel.classList.add("hidden"); panel.innerHTML = ""; return; }
  panel.classList.remove("hidden");
  panel.removeAttribute("data-sx");

  if (session.phase === "warmup" || session.phase === "cooldown") {
    renderWarmupCooldownStep(session.phase);
    return;
  }

  if (session.pos >= session.queue.length) {
    if (currentWorkout.cooldown && currentWorkout.cooldown.length) {
      session.phase = "cooldown";
      renderSession();
    } else {
      finishSession();
    }
    return;
  }

  const step = session.queue[session.pos];
  // The library's per-exercise form cue is already shown in the library
  // browser and on the pre-session workout preview, but never during the
  // actual guided session — the one moment it's most useful, mid-set with
  // no time to go look it up elsewhere.
  const stepCue = exercises.find(x => x.name === step.name)?.cue || "";
  const stepCueHtml = stepCue ? `<div class="meta mt4">💡 ${stepCue}</div>` : "";
  const stepLevelLabel = levelLabelFor(step);
  // The legend for "level"/horizontal-vertical/straps only lives on the
  // pre-session exercise list, which is hidden once a session starts — so
  // repeat a short version on the very first step, where it's still fresh
  // context, rather than leaving it unexplained for the rest of the workout.
  // Also the one place a total beginner first hits "stop if it hurts" —
  // this isn't about pushing to failure — and, if the session opens on a
  // superset, how to actually run one.
  const levelLegendHtml = (session.pos === 0 && !state.dismissedExerciseLegend)
    ? `<div class="meta mt8">Stop if your form breaks down or something hurts.</div>`
    : "";

  if (session.resting) {
    const remaining = Math.max(0, Math.ceil((session.restEndTime - Date.now()) / 1000));
    sx("rest");
    panel.innerHTML = `
      <div class="card">
        ${sxTop("Rest · " + Math.min(session.pos + 1, session.queue.length) + " of " + session.queue.length)}
        <h2>Rest</h2>
        <div id="restClock" style="font-size:36px; font-weight:600; text-align:center; margin:14px 0; font-family:var(--font-mono);">${formatTime(remaining)}</div>
        <div style="padding:10px 12px; margin-bottom:10px; border:1px solid var(--border); border-radius:8px;">
          <div class="meta" style="text-transform:uppercase; letter-spacing:0.6px; font-size:11px;">Up next${step.supersetLabel ? " · " + step.supersetLabel : ""}</div>
          ${exFigureHtml(step.name)}<div class="name" style="margin-top:2px;">${step.name}</div>
          <div class="meta">${step.muscle_group} · set ${step.setNum} of ${step.totalSets} · ${isHoldExercise(step.name) ? "target " + (parseRepRange(step.reps).max || parseRepRange(step.reps).min || 20) + "s hold" : step.reps + " reps"}${step.note ? " " + step.note : ""}</div>
          ${stepCueHtml}
        </div>
        <div class="sx-spacer"></div>
        <button class="secondary w100" id="skipRestBtn">Skip rest</button>
        <button class="danger-link" style="color:var(--accent); margin-top:8px;" data-quick-note="${escapeHtml(step.name)}">Add a note or question</button>
      </div>`;
    document.getElementById("skipRestBtn").addEventListener("click", () => {
      clearInterval(session.timerId);
      session.resting = false;
      renderSession();
    });
    return;
  }

  const endSessionHandler = () => {
    document.getElementById("endSessionBtn").addEventListener("click", endSessionEarly);
  };

  if (step.emom) {
    renderEmom(step, stepCueHtml);
    return;
  }

  if (isHoldExercise(step.name)) {
    const range = parseRepRange(step.reps);
    const targetSeconds = range.max || range.min || 20;
    const holdEach = /each side/i.test(step.note || "");

    if (session.holding) {
      const remaining = Math.max(0, Math.ceil((session.holdEndTime - Date.now()) / 1000));
      sx("hold");
      panel.innerHTML = `
        <div class="card">
          ${sxTop("Hold · set " + step.setNum + " of " + step.totalSets + (holdEach ? " · side " + (session.holdSide || 1) + " of 2" : ""))}
          ${step.supersetLabel ? `<div class="meta mt8">${step.supersetLabel}</div>` : ""}
          <h2>${step.name}</h2>
          <div class="meta">${step.muscle_group} · set ${step.setNum} of ${step.totalSets} · holding${ringStrapNoteFor(step)}</div>
          ${stepCueHtml}
          <div id="holdClock" style="font-size:36px; font-weight:600; text-align:center; margin:14px 0; font-family:var(--font-mono);">${formatTime(remaining)}</div>
          <div class="meta" style="text-align:center; margin-top:-6px; margin-bottom:10px;">It's completely normal not to hit the full target time yet — stop whenever you need to.</div>
          <div class="sx-spacer"></div>
          <button class="secondary w100" id="stopHoldBtn">Stop / let go</button>
        </div>`;
      document.getElementById("stopHoldBtn").addEventListener("click", () => {
        clearInterval(session.timerId);
        const remainingAtStop = Math.max(0, Math.ceil((session.holdEndTime - Date.now()) / 1000));
        const held = session.holdTargetSeconds - remainingAtStop;
        session.holding = false;
        finishHoldSide(Math.max(1, held));
      });
      return;
    }

    if (session.holdSwitchEnd) {
      sx("rest");
      panel.innerHTML = `
        <div class="card">
          ${sxTop("Set " + step.setNum + " of " + step.totalSets)}
          <h2>${step.name}</h2>
          <div class="sx-hero" id="switchClock">${Math.max(0, Math.ceil((session.holdSwitchEnd - Date.now()) / 1000))}<small>switch hands</small></div>
          <div class="meta mt12">Side 1 done (${session.holdSide1Held}s). Other side next, ${targetSeconds}s.</div>
          <div class="sx-spacer"></div>
          <button class="primary" id="switchGoBtn">Start other side now</button>
        </div>`;
      document.getElementById("switchGoBtn").addEventListener("click", beginSecondHoldSide);
      return;
    }

    sx("work");
    panel.innerHTML = `
      <div class="card">
        ${sxTop("Set " + step.setNum + " of " + step.totalSets)}
        ${step.supersetLabel ? `<div class="meta mt8">${step.supersetLabel}</div>${supersetCueHtml(step)}` : ""}
        <h2>${step.name}</h2>
        <div class="sx-hero">${targetSeconds}<small>seconds · hold</small></div>
        <div class="meta mt12">${step.muscle_group} · set ${step.setNum} of ${step.totalSets} · target ${targetSeconds}s hold · ${stepLevelLabel}${ringStrapNoteFor(step)}</div>
        ${eachSideCueHtml(step, true)}
        ${levelLegendHtml}
        ${bellHintHtml(step.name, step.reps)}
        ${stepCueHtml}
        <button class="danger-link" style="color:var(--accent); margin-top:4px;" id="sessionSwapOpenBtn">Swap</button>
        <button class="danger-link" style="color:var(--accent); margin-top:4px; margin-left:12px;" data-quick-note="${escapeHtml(step.name)}">Note</button>
        <div class="hidden mt8" id="sessionSwapPanel">
          <div class="meta">Pick a swap — grouped by easier/harder:</div>
          ${swapAlternatesHtml(currentWorkout.exercises[step.exIndex], step.exIndex)}
        </div>
        <div class="sx-spacer"></div>
        <button class="primary" id="startHoldBtn" style="margin-top:14px;">Start hold</button>
        <button class="secondary mt8 w100" id="endSessionBtn">End session early</button>
      </div>`;
    document.getElementById("sessionSwapOpenBtn").addEventListener("click", () => {
      document.getElementById("sessionSwapPanel").classList.toggle("hidden");
    });
    document.getElementById("sessionSwapPanel").addEventListener("click", async (e) => {
      if (handleSwapInfoClick(e)) return;
      const pick = e.target.closest("[data-swap-pick]");
      if (!pick) return;
      await sessionSwapExercise(parseInt(pick.dataset.swapPick, 10), pick.dataset.swapName);
    });
    document.getElementById("startHoldBtn").addEventListener("click", () => startHold(step, targetSeconds));
    endSessionHandler();
    return;
  }

  sx("work");
  panel.innerHTML = `
    <div class="card">
      ${sxTop("Set " + step.setNum + " of " + step.totalSets)}
      ${step.supersetLabel ? `<div class="meta mt8">${step.supersetLabel}</div>${supersetCueHtml(step)}` : ""}
      ${exFigureHtml(step.name)}<h2>${step.name}</h2>
      <div class="sx-hero">${step.reps}<small>reps${step.note ? " · " + escapeHtml(step.note) : ""}</small></div>
      ${eachSideCueHtml(step, false)}
      ${ringStrapNoteFor(step) ? `<div class="meta mt8">${ringStrapNoteFor(step).replace(/^\s*·\s*/, "")}</div>` : ""}
      ${levelLegendHtml}
      ${bellHintHtml(step.name, step.reps)}
      <div class="sx-actions"><button class="danger-link" style="color:var(--accent);" id="sessionSwapOpenBtn">Swap</button><button class="danger-link" style="color:var(--accent);" data-quick-note="${escapeHtml(step.name)}">Note</button></div>
      <div class="hidden mt8" id="sessionSwapPanel">
        <div class="meta">Pick a swap — grouped by easier/harder:</div>
        ${swapAlternatesHtml(currentWorkout.exercises[step.exIndex], step.exIndex)}
      </div>
      <div class="sx-spacer"></div>
      ${quickRepsHtml(step) || ""}
      <div id="repsTypedWrap" class="${quickRepsHtml(step) ? "hidden" : ""}">
      <input type="text" inputmode="numeric" id="actualRepsInput" placeholder="${/each (side|arm|leg)/i.test(step.note || "") ? "Reps completed on each side" : "Actual reps completed"}" style="margin-top:14px;">
      <button class="primary mt12" id="completeSetBtn">Complete set</button>
      </div>
      <button class="secondary mt8 w100" id="endSessionBtn">End session early</button>
    </div>`;

  document.getElementById("sessionSwapOpenBtn").addEventListener("click", () => {
    document.getElementById("sessionSwapPanel").classList.toggle("hidden");
  });
  document.getElementById("sessionSwapPanel").addEventListener("click", async (e) => {
    if (handleSwapInfoClick(e)) return;
    const pick = e.target.closest("[data-swap-pick]");
    if (!pick) return;
    await sessionSwapExercise(parseInt(pick.dataset.swapPick, 10), pick.dataset.swapName);
  });
  document.getElementById("sessionQuickReps")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-quick-rep]");
    if (b) recordSetAndAdvance(step, parseInt(b.dataset.quickRep, 10));
  });
  document.getElementById("repsOtherBtn")?.addEventListener("click", () => {
    document.getElementById("repsTypedWrap").classList.remove("hidden");
    document.getElementById("repsOtherBtn").classList.add("hidden");
    const i = document.getElementById("actualRepsInput"); if (i) i.focus();
  });
  document.getElementById("completeSetBtn").addEventListener("click", () => {
    const input = document.getElementById("actualRepsInput");
    const val = parseInt(input.value, 10);
    if (isNaN(val)) {
      input.style.borderColor = "var(--danger)";
      return;
    }
    recordSetAndAdvance(step, val);
  });

  endSessionHandler();
}

// One-tap rep buttons: the target range (8-12 gives 8 9 10 11 12) or the single target number and the two below it.
function quickRepsHtml(step) {
  const t = String(step.reps || "");
  let lo, hi;
  const r = t.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (r) { lo = +r[1]; hi = +r[2]; } else { const n = t.match(/(\d+)/); if (!n) return ""; hi = +n[1]; lo = Math.max(1, hi - 2); }
  if (hi < lo || hi - lo > 9) return "";
  // Target range plus two above it (so a strong set still has a button), at most 6 chips (one row); anything else goes through "Other".
  const top = Math.min(hi + 2, lo + 5);
  const chips = []; for (let n = lo; n <= top; n++) chips.push(`<button class="secondary" data-quick-rep="${n}" style="flex:1; min-width:44px; height:52px; font-size:20px;">${n}</button>`);
  return `<div class="meta" style="margin-top:14px;">Tap the reps you did</div><div id="sessionQuickReps" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">${chips.join("")}</div><button class="danger-link" id="repsOtherBtn" style="color:var(--accent); margin-top:6px;">Other number</button>`;
}

async function sessionSwapExercise(exIndex, newName) {
  const original = currentWorkout.exercises[exIndex];
  const replacement = exercises.find(x => x.name === newName);
  const adjusted = await computeSwapAdjustment(original, replacement);
  currentWorkout.exercises[exIndex] = adjusted;
  // Propagate the swap to any not-yet-done sets of this exercise still queued.
  for (let p = session.pos; p < session.queue.length; p++) {
    if (session.queue[p].exIndex === exIndex) {
      session.queue[p].name = adjusted.name;
      session.queue[p].reps = adjusted.reps;
      session.queue[p].muscle_group = adjusted.muscle_group;
    }
  }
  if (state.pendingWorkout) state.pendingWorkout.workout = currentWorkout;
  await persistNow();
  renderSession();
}

function recordSetAndAdvance(step, val) {
  buzz(25);
  if (!session.setsActual[step.exIndex]) session.setsActual[step.exIndex] = [];
  session.setsActual[step.exIndex].push(val);
  session.pos++;
  if (session.minimalMode && session.checkpointAt !== null && session.pos === session.checkpointAt) {
    renderMinimumDayCheckpoint();
    return;
  }
  if (session.pos >= session.queue.length) {
    renderSession();
  } else {
    startRest(step.restAfter);
  }
}

// ---- EMOM block ("every minute on the minute") ----
// An exercise flagged with emom (seconds per round) runs as one timed block
// instead of separate sets with rests: a new round starts every interval and
// whatever time is left is your rest. Timing comes from absolute timestamps, so
// a locked screen or a refresh doesn't lose your place. Each finished round is
// logged at the top of the rep range; stopping early logs the rest as 0 reps.
function emomRecordRound(full) {
  const em = session.emom, step = session.queue[session.pos];
  if (!step) return;
  const reps = full ? (parseRepRange(step.reps).max || parseRepRange(step.reps).min || 0) : 0;
  if (!session.setsActual[step.exIndex]) session.setsActual[step.exIndex] = [];
  session.setsActual[step.exIndex].push(reps);
  session.pos++;
  em.done++;
}
function emomFinish() {
  clearInterval(session.timerId);
  session.timerId = null;
  session.emom = null;
  if (session.pos >= session.queue.length) { renderSession(); return; }
  startRest(session.queue[session.pos - 1].restAfter);
}
function emomStart() {
  const em = session.emom;
  em.startedAt = Date.now() + 3000; // 3-second lead-in to pick up the bell
  clearInterval(session.timerId);
  session.timerId = setInterval(tickEmom, 1000);
  renderSession();
}
// Blocks noted "switch hands/arms" alternate sides each round, starting right.
function emomHandLabel(step, roundIdx) {
  if (!step || !/switch (hands|arms)/i.test(step.note || "")) return "";
  return roundIdx % 2 === 0 ? "Right hand" : "Left hand";
}
function tickEmom() {
  if (!session || !session.emom || !session.emom.startedAt) return;
  const em = session.emom, now = Date.now();
  sxTick();
  const clock = document.getElementById("emomClock"), label = document.getElementById("emomRound");
  if (now < em.startedAt) {
    if (clock) clock.textContent = Math.ceil((em.startedAt - now) / 1000);
    if (label) label.textContent = "Get ready";
    return;
  }
  const target = Math.min(em.rounds, Math.floor((now - em.startedAt) / (em.interval * 1000)));
  let advanced = false;
  while (em.done < target) { emomRecordRound(true); advanced = true; }
  if (em.done >= em.rounds) { playBeep(); emomFinish(); return; }
  if (advanced) {
    playBeep();
    try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) {}
    saveSessionSnapshot();
  }
  const roundEnd = em.startedAt + (em.done + 1) * em.interval * 1000;
  if (clock) clock.textContent = Math.max(0, Math.ceil((roundEnd - now) / 1000));
  if (label) label.textContent = `Round ${em.done + 1} of ${em.rounds}`;
  const handEl = document.getElementById("emomHand");
  if (handEl) handEl.textContent = emomHandLabel(session.queue[session.pos], em.done);
}
function renderEmom(step, stepCueHtml) {
  const panel = document.getElementById("sessionPanel");
  if (!session.emom) {
    session.emom = { rounds: step.totalSets - step.setNum + 1, interval: step.emom, startedAt: null, done: 0 };
  }
  const em = session.emom;
  const what = `${step.reps} ${isHoldExercise(step.name) ? "seconds" : "reps"}${step.note ? " · " + step.note : ""}`;
  if (!em.startedAt) {
    sx("emom");
    panel.innerHTML = `
      <div class="card">
        ${sxTop("Timed block")}
        <div class="meta mt8">Timed block · a new round every ${em.interval >= 60 && em.interval % 60 === 0 ? (em.interval / 60) + " minute" + (em.interval === 60 ? "" : "s") : em.interval + " seconds"}</div>
        <h2>${step.name}</h2>
        <div class="meta">${em.rounds} rounds · each round: ${what}</div>
        ${stepCueHtml}
        <div class="tf-hint mt12"><b>How it works</b> Each minute starts with a beep. Do the reps right away${emomHandLabel(step, 0) ? " (right hand first, then switch hands every round)" : ""}, then rest until the next beep. Do not start a second set inside the same minute. The clock shows the whole minute, and the rep count is done when you stop, not when time runs out.</div>
        <div class="meta mt8">Pick up the bell, then tap Start for a 3-second countdown.</div>
        <div class="sx-spacer"></div>
        <button class="primary" id="emomStartBtn" style="margin-top:14px; width:100%;">Start</button>
        <button class="danger-link" style="color:var(--accent); margin-top:8px;" data-quick-note="${escapeHtml(step.name)}">Note</button>
        <button class="secondary mt8 w100" id="endSessionBtn">End session early</button>
      </div>`;
    document.getElementById("emomStartBtn").addEventListener("click", emomStart);
  } else {
    if (!session.timerId) session.timerId = setInterval(tickEmom, 1000);
    sx("emom");
    panel.innerHTML = `
      <div class="card">
        ${sxTop("Go")}
        <div class="meta mt8" id="emomRound">Round ${em.done + 1} of ${em.rounds}</div>
        <h2>${step.name}</h2>
        <div class="meta">Do now: ${what}. Then rest until the beep.</div>
        ${emomHandLabel(step, em.done) ? `<div id="emomHand" style="font-family:var(--font-display); font-size:30px; font-weight:600; color:var(--accent); text-align:center; margin-top:10px; text-transform:uppercase;">${emomHandLabel(step, em.done)}</div>` : ""}
        <div id="emomClock" style="font-size:48px; font-weight:600; text-align:center; margin:14px 0; font-family:var(--font-mono);">${formatTime(em.interval)}</div>
        ${stepCueHtml}
        <div class="sx-spacer"></div>
        <button class="secondary" id="emomStopBtn" style="margin-top:14px; width:100%;">Stop block</button>
        <button class="secondary mt8 w100" id="endSessionBtn">End session early</button>
      </div>`;
    document.getElementById("emomStopBtn").addEventListener("click", () => {
      if (!confirm("Stop here? Rounds you haven't done will be logged as missed.")) return;
      while (session.emom && session.emom.done < session.emom.rounds) emomRecordRound(false);
      emomFinish();
    });
    tickEmom();
  }
  document.getElementById("endSessionBtn").addEventListener("click", endSessionEarly);
}

function startHold(step, targetSeconds) {
  session.holding = true;
  session.holdTargetSeconds = targetSeconds;
  session.holdStep = step;
  session.holdEndTime = Date.now() + targetSeconds * 1000;
  renderSession();
  session.timerId = setInterval(tickHold, 1000);
}

function tickHold() {
  sxTick();
  if (!session || !session.holding) return;
  const remaining = Math.max(0, Math.ceil((session.holdEndTime - Date.now()) / 1000));
  const clock = document.getElementById("holdClock");
  if (clock) clock.textContent = formatTime(remaining);
  if (remaining <= 0) {
    clearInterval(session.timerId);
    playBeep();
    session.holding = false;
    finishHoldSide(session.holdTargetSeconds);
  }
}

// Holds noted "each side" (suitcase and waiter carries) run twice per set:
// side one, a short "switch hands" countdown, then side two. The set is logged
// at the shorter of the two so the weaker side sets the progression.
function finishHoldSide(held) {
  const step = session.holdStep;
  if (/each side/i.test(step.note || "") && (session.holdSide || 1) === 1) {
    session.holdSide = 2;
    session.holdSide1Held = held;
    session.holdSwitchEnd = Date.now() + 8000;
    renderSession();
    clearInterval(session.timerId);
    session.timerId = setInterval(tickSwitch, 500);
    return;
  }
  const first = session.holdSide1Held;
  session.holdSide = 1; session.holdSide1Held = null; session.holdSwitchEnd = 0;
  recordSetAndAdvance(step, first != null ? Math.min(first, held) : held);
}
function tickSwitch() {
  if (!session || !session.holdSwitchEnd) { return; }
  const left = Math.ceil((session.holdSwitchEnd - Date.now()) / 1000);
  const c = document.getElementById("switchClock");
  if (c && c.firstChild) c.firstChild.textContent = Math.max(0, left);
  if (left <= 0) beginSecondHoldSide();
}
function beginSecondHoldSide() {
  if (!session || !session.holdSwitchEnd) return;
  clearInterval(session.timerId);
  session.holdSwitchEnd = 0;
  buzz(25);
  startHold(session.holdStep, session.holdTargetSeconds);
}

function startRest(seconds) {
  session.resting = true;
  session.restEndTime = Date.now() + seconds * 1000;
  renderSession();
  session.timerId = setInterval(tickRest, 1000);
}

function tickRest() {
  if (!session || !session.resting) return;
  const remaining = Math.max(0, Math.ceil((session.restEndTime - Date.now()) / 1000));
  const clock = document.getElementById("restClock");
  if (clock) clock.textContent = formatTime(remaining);
  sxTick();
  if (remaining <= 0) {
    clearInterval(session.timerId);
    playBeep();
    session.resting = false;
    renderSession();
  }
}

// setInterval throttles or pauses while the screen is locked or the tab is
// backgrounded, so a decrementing counter would drift. Recomputing from the
// absolute end time on return keeps rest periods and holds accurate regardless.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !session) return;
  if (session.resting) tickRest();
  if (session.holding) tickHold();
  if (session.emom && session.emom.startedAt) tickEmom();
});

async function finishSession() {
  const results = currentWorkout.exercises.map((e, i) => {
    const actuals = session.setsActual[i] || [];
    const range = parseRepRange(e.reps);
    let result = "hold";
    if (!actuals.length) result = "hold";
    else if (actuals.some(a => a < range.min)) result = "missed";
    else if (actuals.every(a => a >= range.max)) result = "max";
    return { exercise: e, result, actuals: actuals.slice() };
  });
  const summary = buildSessionSummary(results);
  await applyWorkoutResults(results);
  renderSessionSummary(summary);
}

document.getElementById("startSessionBtn").addEventListener("click", startSession);
document.getElementById("minimumDayBtn").addEventListener("click", startMinimumDay);

document.getElementById("programsSubNav").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-subtab]");
  if (!chip) return;
  document.querySelectorAll("#programsSubNav .chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  document.getElementById("subtab-my-programs").classList.toggle("hidden", chip.dataset.subtab !== "my-programs");
  document.getElementById("subtab-library").classList.toggle("hidden", chip.dataset.subtab !== "library");
});

// The app always opens on Today (the front door), however it was launched: fresh open,
// relaunch after the OS killed it, or pull-to-refresh. The last tab is deliberately not saved.
let lastActiveTab = "today";
// Whichever tab was open right before Programs was opened — lets a second
// tap on the Programs icon return you there, matching how the Settings
// icon already behaves on a repeat tap.
let tabBeforePrograms = "today";

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "programs") tabBeforePrograms = lastActiveTab;
    lastActiveTab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("profileBtn").classList.remove("active");
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.remove("hidden");
    if (btn.dataset.tab === "today") {
      const active = programs.find(p => p.id === state.activeProgramId);
      if (active) ensureWorkoutReady(active);
      renderCoachTeaser();
      try { renderTodayTop(); } catch (e) {}
    }
    if (btn.dataset.tab === "coach") {
      renderCoachNote();
      renderDailyCheckin();
      renderWeighInDetailsState();
    }
  });
});

document.getElementById("profileBtn").addEventListener("click", () => {
  const profileBtn = document.getElementById("profileBtn");
  if (profileBtn.classList.contains("active")) {
    // already in Settings — pressing again exits back to whichever tab was open before
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${lastActiveTab}"]`);
    if (targetBtn) targetBtn.click();
    return;
  }
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
  profileBtn.classList.add("active");
  document.getElementById("tab-settings").classList.remove("hidden");
});
