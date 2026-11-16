// ---- Progress screen ("Steady" look): hero ring, stat tiles, weight line, consistency, milestones ----
function renderProgressTop() {
  const el = document.getElementById("tfProgress");
  if (!el) return;
  const esc = escapeHtml;
  const now = new Date();
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOf = (d) => { const x = dayStart(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const workoutDays = new Set((state.logs || []).map(l => dayStart(new Date(l.date)).getTime()));
  const goal = state.settings?.weeklyWorkoutGoal || 3;
  const program = programs.find(p => p.id === state.activeProgramId);
  const totalDays = workoutDays.size;

  // Kicker
  let kicker = "";
  let phaseName = "";
  let weekNumber = 0, maxWeek = 0;
  if (program && program.structure && program.structure.phases) {
    const cp = currentPhaseFor(program);
    weekNumber = cp.weekNumber; maxWeek = programMaxWeek(program);
    phaseName = String(cp.phase?.phase || "").split(":")[0].replace(/\s+v\d+$/i, "");
    kicker = `WEEK ${weekNumber} OF ${maxWeek}`;
  }
  const kEl = document.getElementById("tfProgKicker");
  if (kEl) kEl.textContent = kicker || "YOUR PROGRESS";

  // Hero ring: program completion (count mode) or weeks
  let heroHtml = "";
  if (program) {
    const pace = getProgramPace(program);
    const total = totalProgramWorkouts(program);
    const done = pace.mode === "count" ? pace.completed : Math.max(0, (weekNumber - 1));
    const denom = pace.mode === "count" ? total : maxWeek;
    const frac = denom ? Math.min(1, done / denom) : 0;
    const C = 2 * Math.PI * 52;
    heroHtml = `<div class="tf-pg-hero">
      <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label="${done} of ${denom} ${pace.mode === "count" ? "workouts" : "weeks"} done">
        <circle cx="62" cy="62" r="52" fill="none" stroke="rgba(var(--ink-rgb),.22)" stroke-width="12"/>
        <circle cx="62" cy="62" r="52" fill="none" stroke="var(--ink)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(1)}" transform="rotate(-90 62 62)"/>
        <text x="62" y="68" text-anchor="middle" font-family="Big Shoulders Display, sans-serif" font-size="36" font-weight="700" fill="var(--ink)">${Math.round(frac * 100)}%</text>
        <text x="62" y="86" text-anchor="middle" font-family="Manrope, sans-serif" font-size="9" fill="var(--ink)" letter-spacing="1.5">OF PROGRAM</text>
      </svg>
      <div style="flex:1; min-width:0;">
        <div class="k">${esc(phaseName || "Program")}</div>
        <div class="n">${done}<small> / ${denom}</small></div>
        <div class="s">${pace.mode === "count" ? "workouts done" : "weeks in"}</div>
        <div class="pill">${Math.max(0, denom - done)} ${pace.mode === "count" ? "workouts" : "weeks"} to go</div>
      </div>
    </div>`;
  }

  // Weekly buckets (Mon-start), last 5 weeks incl. current
  const thisMonday = mondayOf(now);
  const weeks = [];
  for (let i = 4; i >= 0; i--) {
    const m = new Date(thisMonday); m.setDate(m.getDate() - 7 * i);
    const days = [];
    for (let d = 0; d < 7; d++) {
      const x = new Date(m); x.setDate(m.getDate() + d);
      days.push({ t: x.getTime(), done: workoutDays.has(x.getTime()), today: x.getTime() === dayStart(now).getTime(), future: x.getTime() > dayStart(now).getTime() });
    }
    weeks.push({ start: m, days, count: days.filter(x => x.done).length });
  }
  const fiveWeekTotal = weeks.reduce((n, w) => n + w.count, 0);
  const best = weeks.reduce((b, w) => (w.count >= b.count ? w : b), weeks[0]);

  // Weight
  const ms = (state.measurements || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  let weightTile = `<div class="tf-stat"><div class="l">Weight</div><div class="v">·</div><div class="p gold">log 2 weigh-ins</div></div>`;
  if (ms.length >= 2) {
    const delta = ms[ms.length - 1].weight - ms[0].weight;
    const down = delta <= 0;
    const wkAgo = ms.filter(m => new Date(m.date + "T12:00:00").getTime() <= Date.now() - 7 * 86400000).pop();
    const wkDelta = wkAgo ? ms[ms.length - 1].weight - wkAgo.weight : null;
    weightTile = `<div class="tf-stat"><div class="l">Since ${formatDateOnly(ms[0].date)}</div><div class="v" style="color:${down ? "var(--accent)" : "var(--danger)"};">${down ? "−" : "+"}${Math.abs(delta).toFixed(1)}<small> lb</small></div>${wkDelta === null ? `<div class="p">total change</div>` : `<div class="p">${wkDelta <= 0 ? "▼" : "▲"} ${Math.abs(wkDelta).toFixed(1)} this week</div>`}</div>`;
  }
  const bestTile = `<div class="tf-stat"><div class="l">Best week</div><div class="v">${best.count}<small> ${best.count === 1 ? "workout" : "workouts"}</small></div><div class="p gold">${best.count ? "wk of " + best.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "none yet"}</div></div>`;
  // Protein days hit in the last 7 completed-or-current days
  const pTarget = state.settings?.macroTargets?.protein || 0;
  let hit = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const pro = foodLogsForDate(localDateStr(d)).reduce((n, f) => n + (f.protein || 0), 0);
    if (pTarget && pro >= pTarget) hit++;
  }
  const proteinTile = `<div class="tf-stat"><div class="l">Protein</div><div class="v">${hit}<small> / 7</small></div><div class="p">days hit</div></div>`;

  // Weight chart
  let weightCard;
  if (ms.length < 2) {
    weightCard = `<div class="tf-pcard"><div class="h"><b>Weight</b></div><div class="tf-empty">Log a couple of weigh-ins and your trend line shows up here.<br><button type="button" data-goto-tab="coach">Go to Coach</button></div></div>`;
  } else {
    const pts = ms.filter(m => new Date(m.date + "T12:00:00").getTime() >= Date.now() - 35 * 86400000);
    const use = pts.length >= 2 ? pts : ms.slice(-2);
    const goalW = state.settings?.goalWeight || null;
    const vals = use.map(m => m.weight);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (goalW) { lo = Math.min(lo, goalW); hi = Math.max(hi, goalW); }
    const pad = Math.max(1, (hi - lo) * 0.15); lo -= pad; hi += pad;
    const W = 326, H = 150, top = 14, bot = 22;
    const t0 = new Date(use[0].date + "T12:00:00").getTime(), t1 = new Date(use[use.length - 1].date + "T12:00:00").getTime();
    const X = (m) => t1 === t0 ? W / 2 : ((new Date(m.date + "T12:00:00").getTime() - t0) / (t1 - t0)) * (W - 14);
    const Y = (w) => top + (1 - (w - lo) / (hi - lo)) * (H - top - bot);
    const line = use.map(m => `${X(m).toFixed(1)},${Y(m.weight).toFixed(1)}`).join(" ");
    const last = use[use.length - 1];
    const area = `M${X(use[0]).toFixed(1)},${Y(use[0].weight).toFixed(1)} ` + use.slice(1).map(m => `L${X(m).toFixed(1)},${Y(m.weight).toFixed(1)}`).join(" ") + ` L${X(last).toFixed(1)},${H - bot} L${X(use[0]).toFixed(1)},${H - bot} Z`;
    const lx = X(last), ly = Y(last.weight);
    const bubbleX = Math.min(Math.max(lx, 31), W - 31);
    const avg7 = (() => { const r = ms.filter(m => new Date(m.date + "T12:00:00").getTime() >= Date.now() - 7 * 86400000); return r.length ? (r.reduce((a, m) => a + m.weight, 0) / r.length) : null; })();
    const fmt = (m) => new Date(m.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    weightCard = `<div class="tf-pcard">
      <div class="h"><b>Weight</b>${avg7 ? `<span>7-day avg <em>${avg7.toFixed(1)} lb</em></span>` : ""}</div>
      <svg width="100%" viewBox="0 0 ${W} ${H}" style="margin-top:8px; overflow:visible;" role="img" aria-label="Weight trend, latest ${last.weight} pounds">
        <defs><linearGradient id="tfWg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".38"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
        <line x1="0" y1="${H - bot}" x2="${W}" y2="${H - bot}" stroke="var(--surface-2)"/>
        ${goalW ? `<line x1="0" y1="${Y(goalW).toFixed(1)}" x2="${W}" y2="${Y(goalW).toFixed(1)}" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="5 5"/><text x="${W - 4}" y="${(Y(goalW) - 5).toFixed(1)}" text-anchor="end" font-family="Manrope, sans-serif" font-size="9" fill="var(--gold)">GOAL ${goalW}</text>` : ""}
        <path d="${area}" fill="url(#tfWg)"/>
        <polyline fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${line}"/>
        ${(() => {
          const jd = new Set(findJumps().map(j => j.date));
          const dots = use.filter(m => jd.has(m.date)).map(m => `<circle cx="${X(m).toFixed(1)}" cy="${Y(m.weight).toFixed(1)}" r="5" fill="var(--danger)" stroke="var(--surface)" stroke-width="2"/>`).join("");
          let ticks = "";
          const dayMs = 86400000, startD = new Date(use[0].date + "T12:00:00"), endD = new Date(use[use.length - 1].date + "T12:00:00");
          for (let d = new Date(startD); d <= endD; d = new Date(d.getTime() + dayMs)) {
            const ds = localDateStr(d), di = dayInfo(ds), x = X({ date: ds }).toFixed(1);
            if (di.alc >= 200) ticks += `<rect x="${(x - 2).toFixed(1)}" y="${H - bot + 5}" width="4" height="9" rx="2" fill="var(--danger)"/>`;
            else if (di.salty >= 700) ticks += `<rect x="${(x - 2).toFixed(1)}" y="${H - bot + 5}" width="4" height="9" rx="2" fill="var(--warn)"/>`;
          }
          return ticks + dots;
        })()}
        <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="12" fill="var(--accent)" fill-opacity=".2"/>
        <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="6" fill="${findJumps().some(j => j.date === last.date) ? "var(--danger)" : "var(--accent)"}" stroke="var(--surface)" stroke-width="2.5"/>
        <rect x="${(bubbleX - 31).toFixed(1)}" y="${Math.max(0, ly - 40).toFixed(1)}" width="62" height="24" rx="12" fill="var(--text)"/>
        <text x="${bubbleX.toFixed(1)}" y="${Math.max(16, ly - 24).toFixed(1)}" text-anchor="middle" font-family="Big Shoulders Display, sans-serif" font-size="14" font-weight="600" fill="var(--ink)">${last.weight}</text>
      </svg>
      <div class="tf-axis"><span>${fmt(use[0])}</span><span>TODAY</span></div>
      <div class="meta" style="font-size:11px; margin-top:8px;"><span style="color:var(--danger);">●</span> jump of 1.5+ lb · <span style="color:var(--danger);">▮</span> alcohol day · <span style="color:var(--warn);">▮</span> salty or restaurant day</div>
    </div>`;
  }

  // Consistency: small circles, one row per week
  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
  const consistencyCard = `<div class="tf-pcard">
    <div class="h"><b>Consistency</b><span>avg <em>${(fiveWeekTotal / 5).toFixed(1)}</em> · goal ${goal} a week</span></div>
    <div class="tf-weeks">${weeks.map(w => `<div class="tf-wk"><span class="lab">${w.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}</span><span class="dots">${w.days.map(d => `<i class="${d.done ? "on" : d.today ? "today" : d.future ? "fut" : ""}"></i>`).join("")}</span><span class="cnt">${w.count}</span></div>`).join("")}</div>
    <div class="tf-days">${dayNames.map(n => `<span>${n}</span>`).join("")}</div>
    <div style="margin-top:14px; font-size:13px; color:var(--text-muted); padding:0 2px;"><span style="color:var(--text); font-weight:600;">${fiveWeekTotal} workout day${fiveWeekTotal === 1 ? "" : "s"}</span> in the last 5 weeks.</div>
  </div>`;

  // Milestones (derived from your data, same ladders the celebrations use)
  const wLadder = [1, 10, 25, 50, 100, 150, 200];
  const earnedW = wLadder.filter(m => totalDays >= m);
  const nextW = wLadder.filter(m => totalDays < m);
  const wShow = [...earnedW.slice(-1), ...nextW.slice(0, 2)];
  const lost = ms.length >= 2 ? ms[0].weight - ms[ms.length - 1].weight : 0;
  const lLadder = [5, 10, 15, 20, 25, 30];
  const earnedL = lLadder.filter(m => lost >= m);
  const nextL = lLadder.filter(m => lost < m);
  const lShow = earnedL.length ? [earnedL[earnedL.length - 1]] : [nextL[0]];
  const badge = (label, face, earned, gold) => `<div class="tf-badge"><div class="c${gold ? " gold" : ""}${earned ? "" : " lock"}">${face}</div><div class="t${earned ? "" : " lock"}">${label}</div></div>`;
  const check = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
  const badges = wShow.map(m => badge(m === 1 ? "First workout" : `${m} workouts`, m === 1 ? check : m, totalDays >= m, false))
    .concat(lShow.map(m => badge(`${m} lb down`, `−${m}`, lost >= m, true))).join("");
  const milestonesCard = `<div class="tf-pcard"><div class="h"><b>Milestones</b></div><div class="tf-badges">${badges}</div></div>`;

  // Workouts per week: thin stems with dots, dashed goal line
  const maxC = Math.max(goal, ...weeks.map(w => w.count), 1);
  const stemH = 84;
  const cols = weeks.map((w, i) => {
    const h = Math.round((w.count / maxC) * (stemH - 16));
    const isBest = w === best && w.count > 0;
    const isNow = i === weeks.length - 1;
    const col = isBest ? "var(--gold)" : (w.count >= goal ? "var(--accent)" : "var(--border-3)");
    return `<div style="flex:1; height:${stemH}px; position:relative;">
      <div style="position:absolute; left:50%; bottom:0; width:4px; margin-left:-2px; height:${h + 7}px; border-radius:2px; background:${col}; opacity:.45;"></div>
      <div style="position:absolute; left:50%; bottom:${h}px; width:16px; height:16px; margin-left:-8px; border-radius:50%; background:${col};${isNow ? " box-shadow:0 0 0 4px rgba(var(--accent-rgb),.25);" : ""}"></div>
      <div style="position:absolute; left:0; right:0; bottom:${h + 20}px; text-align:center; font-size:11px; color:${col === "var(--border-3)" ? "var(--text-muted)" : col}; font-weight:600;">${w.count}</div>
    </div>`;
  }).join("");
  const goalBottom = Math.round((goal / maxC) * (stemH - 16)) + 8;
  const avgWk = (fiveWeekTotal / 5).toFixed(1);
  const weeklyCard = `<div class="tf-pcard">
    <div class="h"><b>Workouts per week</b><span>avg <em>${avgWk}</em> · goal ${goal}</span></div>
    <div style="position:relative; margin-top:26px;">
      <div style="position:absolute; left:0; right:0; bottom:${goalBottom}px; border-top:1.5px dashed rgba(var(--gold-rgb),.7);"></div>
      <div style="display:flex; gap:12px;">${cols}</div>
    </div>
    <div style="display:flex; gap:12px; font-family:var(--font-mono); font-size:10px; color:var(--text-muted); margin-top:8px;">${weeks.map((w, i) => `<span style="flex:1; text-align:center;${i === weeks.length - 1 ? " color:var(--accent);" : ""}">${w.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}</span>`).join("")}</div>
  </div>`;

  // Weekly recap: last full Mon-Sun week. Hidden when nothing was logged, so it never shows a wall of zeros.
  let recapCard = "";
  {
    const lw = weeks[weeks.length - 2];
    const lwStart = lw.start.getTime(), lwEnd = lwStart + 7 * 86400000;
    const inWk = ms.filter(m => { const t = new Date(m.date + "T12:00:00").getTime(); return t >= lwStart && t < lwEnd; });
    const before = ms.filter(m => new Date(m.date + "T12:00:00").getTime() < lwStart).pop();
    let wDelta = null;
    if (inWk.length) { const base = before ? before.weight : inWk[0].weight; wDelta = inWk[inWk.length - 1].weight - base; }
    let pHit = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(lw.start.getFullYear(), lw.start.getMonth(), lw.start.getDate() + i);
      const pro = foodLogsForDate(localDateStr(d)).reduce((n, f) => n + (f.protein || 0), 0);
      if (pTarget && pro >= pTarget) pHit++;
    }
    const lwDays = Array.from({ length: 7 }, (_, i) => localDateStr(new Date(lw.start.getFullYear(), lw.start.getMonth(), lw.start.getDate() + i)));
    const lwInfo = lwDays.map(d => dayInfo(d)), lwCal = lwInfo.reduce((n, x) => n + x.kcal, 0), lwLogged = lwInfo.filter(x => x.n > 0).length;
    const wkBudget = state.settings?.weeklyCalBudget || DEFAULT_WEEK_BUDGET;
    if (lw.count > 0 || inWk.length || lwLogged) {
      const end = new Date(lwStart + 6 * 86400000);
      const rng = lw.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " – " + end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const hitGoal = lw.count >= goal;
      const over = lwCal > wkBudget;
      const kf = n => n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Math.round(n));
      recapCard = `<div class="tf-pcard tf-recap"><div class="h"><b>Last week</b><span>${rng}</span></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px 10px; margin-top:12px;">
          <div class="cell"><div class="v" style="color:${over ? "var(--danger)" : "var(--accent)"};">${kf(lwCal)}<small> / ${kf(wkBudget)}</small></div><div class="l">calories vs budget</div></div>
          <div class="cell"><div class="v">${lwLogged}<small> / 7</small></div><div class="l">days logged</div></div>
          <div class="cell"><div class="v"${hitGoal ? ' style="color:var(--gold);"' : ""}>${lw.count}<small> / ${goal}</small></div><div class="l">workouts</div></div>
          <div class="cell"><div class="v">${wDelta === null ? "·" : (wDelta <= 0 ? "−" : "+") + Math.abs(wDelta).toFixed(1)}<small>${wDelta === null ? "" : " lb"}</small></div><div class="l">weight change</div></div>
        </div>
        <button type="button" class="secondary" data-open-review style="margin-top:14px; width:100%;">Open the full weekly review</button></div>`;
    }
  }
  // ---- tiles (preview + tap for detail) ----
  const mi = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const weekDs = weekDayList(0), todayDs = localDateStr();
  // weight tile
  let wBig = "·", wSub = "log 2 weigh-ins", wSubCol = "var(--text-muted)", wViz = "";
  if (ms.length >= 2) {
    const delta = ms[ms.length - 1].weight - ms[0].weight, down = delta <= 0;
    const r7 = ms.filter(m => new Date(m.date + "T12:00:00").getTime() >= Date.now() - 7 * 86400000);
    wBig = (r7.length ? r7.reduce((a, m) => a + m.weight, 0) / r7.length : ms[ms.length - 1].weight).toFixed(1);
    wSub = `${down ? "−" : "+"}${Math.abs(delta).toFixed(1)} lb since ${formatDateOnly(ms[0].date)}`;
    wSubCol = down ? "var(--accent)" : "var(--gold)";
    const pts = ms.filter(m => new Date(m.date + "T12:00:00").getTime() >= Date.now() - 35 * 86400000);
    const u = pts.length >= 2 ? pts : ms.slice(-2), vv = u.map(m => m.weight), lo = Math.min(...vv), hi = Math.max(...vv), span = Math.max(0.5, hi - lo);
    const xy = u.map((m, i) => `${((i / (u.length - 1)) * 140).toFixed(1)} ${(40 - ((m.weight - lo) / span) * 34).toFixed(1)}`);
    const path = "M" + xy.join(" L");
    wViz = `<svg width="100%" height="44" viewBox="0 0 140 44" preserveAspectRatio="none"><path d="${path} L140 44 L0 44Z" fill="rgba(var(--accent-rgb),.18)"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  }
  // workouts tile
  const curWk = weeks[weeks.length - 1];
  const wkBars = weeks.map(w => `<i style="height:${Math.max(4, Math.round((w.count / Math.max(goal, 3)) * 44))}px; background:${w.count ? "var(--accent)" : "var(--surface-3)"};"></i>`).join("");
  // calories tile
  const wb = weekBudgetNumbers();
  const perDay = weekDs.map(d => d > todayDs ? 0 : foodLogsForDate(d).reduce((n, f) => n + (f.calories || 0), 0));
  const maxDay = Math.max(wb.budget / 7 * 1.25, ...perDay, 1);
  const calBars = perDay.map(v => `<i style="height:${v ? Math.max(4, Math.round((v / maxDay) * 44)) : 4}px; background:${v ? (v > wb.budget / 7 ? "var(--danger)" : "var(--accent)") : "var(--surface-3)"};"></i>`).join("");
  // protein tile
  const protDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
    const g = foodLogsForDate(d).reduce((n, f) => n + (f.protein || 0), 0);
    protDays.push({ d, g, ok: !!pTarget && g >= pTarget });
  }
  const protDots = protDays.map(x => `<i style="flex:none; width:14px; height:14px; border-radius:50%; ${x.ok ? "background:var(--accent); border:2px solid var(--accent);" : "border:2px solid var(--border-2);"}"></i>`).join("");
  // milestones tile
  const prevW = [0, ...wLadder].filter(m => m <= totalDays).pop() || 0, nxtW = nextW[0];
  const msBig = nxtW ? `${totalDays}<small>/ ${nxtW} workouts</small>` : `${totalDays}<small>workouts</small>`;
  const msSub = nxtW ? `next badge in ${nxtW - totalDays}` : "all badges earned";
  const msFrac = nxtW ? Math.max(0.04, (totalDays - prevW) / (nxtW - prevW)) : 1;
  // walks tile
  const wkCardio = (state.cardioLogs || []).filter(c => weekDs.includes(dayKeyOf(c.date)));
  const wkMiles = wkCardio.reduce((n, c) => n + (c.distance || 0), 0), wkMin = wkCardio.reduce((n, c) => n + (c.duration || 0), 0);
  const walkBars = weekDs.map(d => { const m = wkCardio.filter(c => dayKeyOf(c.date) === d).reduce((n, c) => n + (c.distance || 0), 0); return `<i style="height:${m ? Math.max(4, Math.round((m / Math.max(3, wkMiles)) * 44 * 2.2)) : 4}px; background:${m ? "var(--gold)" : "var(--surface-3)"};"></i>`; }).join("");
  const tile = (key, name, big, sub, subCol, viz, vizStyle) => `<button type="button" class="tf-ptile" data-ptile="${key}"><span class="n">${name}<b>›</b></span><span class="big">${big}</span><span class="sub"${subCol ? ` style="color:${subCol};"` : ""}>${sub}</span><span class="viz"${vizStyle ? ` style="${vizStyle}"` : ""}>${viz}</span></button>`;
  el.innerHTML = `<div class="tf-ptiles">`
    + tile("weight", "Weight", `${wBig}<small>lb</small>`, wSub, wSubCol, wViz)
    + tile("workouts", "Workouts", `${curWk.count}<small>of ${goal} this week</small>`, `${fiveWeekTotal} in 5 weeks`, "", wkBars)
    + tile("calories", "Calories", `${Math.abs(wb.left).toLocaleString()}<small>${wb.left >= 0 ? "left" : "over"}</small>`, `of ${wb.budget.toLocaleString()} this week`, wb.left < 0 ? "var(--danger)" : "", calBars)
    + tile("protein", "Protein", `${hit}<small>/ 7 days hit</small>`, pTarget ? `goal ${pTarget} g` : "set a goal in Settings", "", protDots, "align-items:center; justify-content:space-between;")
    + tile("milestones", "Milestones", msBig, msSub, "", `<span style="flex:1; height:8px; border-radius:5px; background:var(--surface-3); display:block;"><span style="display:block; width:${Math.round(msFrac * 100)}%; height:8px; border-radius:5px; background:var(--accent);"></span></span>`, "align-items:center;")
    + tile("walks", "Walks &amp; rucks", `${mi(wkMiles)}<small>mi this week</small>`, `${wkCardio.length} ${wkCardio.length === 1 ? "walk" : "walks"}${wkMin ? " · " + Math.floor(wkMin / 60) + "h " + (wkMin % 60) + "m" : ""}`, "", walkBars)
    + `</div>`;
  // ---- Coach "this week" card (opens the same detail sheets) ----
  const wcEl = document.getElementById("coachWeekCard");
  if (wcEl) {
    const dots = Array.from({ length: Math.max(goal, 1) }, (_, i) => `<i${i < curWk.count ? ' class="o"' : ""}></i>`).join("");
    wcEl.innerHTML = `<button type="button" data-ptile="workouts"><b>${curWk.count} / ${goal}</b>workouts<span class="dots3">${dots}</span></button>`
      + `<button type="button" data-ptile="walks"><b>${wkCardio.length}</b>${wkCardio.length === 1 ? "walk" : "walks"}, ${mi(wkMiles)} mi</button>`
      + (nxtW
        ? `<button type="button" data-ptile="milestones"><b>${totalDays} / ${nxtW}</b>next badge<span class="bar"><i style="width:${Math.round(msFrac * 100)}%"></i></span></button>`
        : `<button type="button" data-ptile="milestones"><b>${totalDays}</b>workouts, all badges</button>`);
  }
  // ---- sheet sections ----
  const setSec = (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
  setSec("psWeight", weightCard);
  setSec("psWorkouts", consistencyCard + weeklyCard);
  const dn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dRows = weekDs.map((d, i) => { const k = perDay[i]; const over = k > wb.budget / 7; return `<div class="tf-prow"><span>${dn[i]}</span><span class="r" style="${over ? "color:var(--danger);" : ""}">${d > todayDs ? "—" : (k ? k.toLocaleString() + " cal" : "not logged")}</span></div>`; }).join("");
  setSec("psCalories", `<div class="tf-pcard"><div class="h"><b>This week</b><span><em>${wb.eaten.toLocaleString()}</em> of ${wb.budget.toLocaleString()} cal</span></div><div class="mt8">${dRows}</div></div>` + recapCard);
  const pRows = protDays.slice().reverse().map(x => `<div class="tf-prow"><span>${new Date(x.d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span><span class="r" style="${x.ok ? "color:var(--accent);" : ""}">${Math.round(x.g)} g ${x.ok ? "✓" : ""}</span></div>`).join("");
  setSec("psProtein", `<div class="tf-pcard"><div class="h"><b>Protein</b><span>goal <em>${pTarget || "—"} g</em> · ${hit} of 7 days hit</span></div><div class="mt8">${pRows}</div></div>`);
  setSec("psMilestones", heroHtml + milestonesCard);
  const sumEl = document.getElementById("psWalkSum"); if (sumEl) sumEl.textContent = `${mi(wkMiles)} mi this week`;
}
function openProgressSheet(key) {
  const sh = document.getElementById("tfPSheet"); if (!sh) return;
  sh.querySelectorAll("[data-psec]").forEach(x => x.classList.toggle("hidden", x.dataset.psec !== key));
  sh.classList.remove("hidden");
  const pn = sh.querySelector(".tf-ppanel"); if (pn) pn.scrollTop = 0;
}
function closeProgressSheet() { const sh = document.getElementById("tfPSheet"); if (sh) sh.classList.add("hidden"); }
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-ptile]"); if (t) { openProgressSheet(t.dataset.ptile); return; }
  if (e.target.closest("[data-psheet-close]")) closeProgressSheet();
  if (e.target.closest("nav.tabs .tab-btn")) closeProgressSheet();
});
function progressClick(e) {
  if (e.target.closest("[data-open-review]")) {
    weekCloseOffset = -1; weekCloseStep = 0;
    const t = document.querySelector('nav.tabs .tab-btn[data-tab="coach"]'); if (t) t.click();
    const d = document.getElementById("weeklyReviewDetails"); if (d) { d.open = true; renderWeekClose(); setTimeout(() => d.scrollIntoView({ behavior: "smooth", block: "start" }), 150); }
    return;
  }
  const b = e.target.closest("[data-goto-tab]");
  if (!b) return;
  const t = document.querySelector(`nav.tabs .tab-btn[data-tab="${b.dataset.gotoTab}"]`);
  if (t) t.click();
}
document.getElementById("coachHero").addEventListener("click", (e) => { if (!e.target.closest("button, a, input")) openProgressSheet("weight"); });
document.getElementById("coachNoteCard").addEventListener("click", (e) => { if (!e.target.closest("button, a, input")) e.currentTarget.classList.toggle("open"); });
document.getElementById("tfProgress").addEventListener("click", progressClick);
document.getElementById("tfPSheet").addEventListener("click", (e) => { if (e.target.closest("[data-open-review]")) closeProgressSheet(); progressClick(e); });

function renderProgressCharts() {
  try { renderProgressTop(); } catch (e) { console.error("renderProgressTop", e); }
  renderJourneyStats();
  const measurements = (state.measurements || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  renderLineChart("weightChart", measurements.map(m => ({ label: m.date.slice(5), value: m.weight })), {
    yLabel: "lb",
    avg: rollingAverageSeries(measurements, "weight"),
  });
  renderAvgLine("weightAvgLine", measurements, "weight", "lb");
  renderWaistTrend(measurements);
  renderBodyFatChart(measurements);
  renderBloatPatterns();
  renderBodyFatSummary();
  renderWeightHistoryList();
  renderRecoveryStatus();
  renderReasonPatterns();
  renderMorningChecklist();

  const logs = state.logs || [];
  const byWeek = {};
  const seenDaysByWeek = {};
  logs.forEach(l => {
    const wk = isoWeekLabel(l.date);
    const dayStr = new Date(l.date).toDateString();
    if (!seenDaysByWeek[wk]) seenDaysByWeek[wk] = new Set();
    if (!seenDaysByWeek[wk].has(dayStr)) {
      seenDaysByWeek[wk].add(dayStr);
      byWeek[wk] = (byWeek[wk] || 0) + 1;
    }
  });
  const weekLabels = Object.keys(byWeek).slice(-10);
  const volumeRows = weekLabels.map(wk => ({ label: wk, value: byWeek[wk] }));
  renderBarChart("volumeChart", volumeRows);
  renderTileHistory("volumeChart", "volumeHistoryHint", "volumeHistoryList", volumeRows,
    v => `${v} workout day${v === 1 ? "" : "s"}`, "week");

  const cardioByWeek = {};
  (state.cardioLogs || []).forEach(c => {
    const wk = isoWeekLabel(c.date);
    cardioByWeek[wk] = (cardioByWeek[wk] || 0) + (c.duration || 0);
  });
  const cardioWeekLabels = Object.keys(cardioByWeek).slice(-10);
  const cardioRows = cardioWeekLabels.map(wk => ({ label: wk, value: cardioByWeek[wk] }));
  renderBarChart("cardioChart", cardioRows);
  renderTileHistory("cardioChart", "cardioHistoryHint", "cardioHistoryList", cardioRows,
    v => `${v} min`, "week");
}

// Generic tap-to-expand history list for any bar-chart tile (weekly
// workouts, weekly cardio minutes) — same pattern as the weight trend
// chart's history: collapsed by default, a hint line says how many entries
// are available, tapping the chart or the hint toggles a newest-first list.
// Open/closed state AND the latest rows/formatter persist per chart across
// re-renders, so the click listeners (registered once, below) can toggle
// and redraw without needing the data passed back in at click time.
const tileHistoryOpen = {};
const tileHistoryData = {};
function renderTileHistory(chartId, hintId, listId, rows, formatValue, unitLabel = "entry") {
  tileHistoryData[chartId] = { hintId, listId, rows, formatValue, unitLabel };
  const hintEl = document.getElementById(hintId);
  const listEl = document.getElementById(listId);
  if (!rows.length) {
    hintEl.textContent = "";
    listEl.classList.add("hidden");
    return;
  }
  const open = !!tileHistoryOpen[chartId];
  hintEl.textContent = open ? "Hide history" : `See history (${rows.length} ${unitLabel}${rows.length === 1 ? "" : "s"})`;
  if (!open) {
    listEl.classList.add("hidden");
    return;
  }
  listEl.classList.remove("hidden");
  listEl.innerHTML = rows.slice().reverse().map(r =>
    `<div class="list-item"><div class="name">${r.label}</div><div class="meta">${formatValue(r.value)}</div></div>`
  ).join("");
}
function toggleTileHistory(chartId) {
  const cached = tileHistoryData[chartId];
  if (!cached) return; // nothing rendered yet (e.g. clicked before first renderProgressCharts)
  tileHistoryOpen[chartId] = !tileHistoryOpen[chartId];
  renderTileHistory(chartId, cached.hintId, cached.listId, cached.rows, cached.formatValue, cached.unitLabel);
}
document.getElementById("volumeChart").addEventListener("click", () => toggleTileHistory("volumeChart"));
document.getElementById("volumeHistoryHint").addEventListener("click", () => toggleTileHistory("volumeChart"));
document.getElementById("cardioChart").addEventListener("click", () => toggleTileHistory("cardioChart"));
document.getElementById("cardioHistoryHint").addEventListener("click", () => toggleTileHistory("cardioChart"));

// Tap/click the weight trend chart (or the hint under it) to expand a
// newest-first list of every logged measurement, each with its change from
// the entry before it. Stays open across re-renders (e.g. right after
// logging a new weight) so it doesn't collapse itself out from under you.
let weightHistoryOpen = false;
function renderWeightHistoryList() {
  const listEl = document.getElementById("weightHistoryList");
  const hintEl = document.getElementById("weightHistoryHint");
  const measurements = (state.measurements || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!measurements.length) {
    hintEl.textContent = "";
    listEl.classList.add("hidden");
    return;
  }
  hintEl.textContent = weightHistoryOpen ? "Hide history" : `See history (${measurements.length} ${measurements.length === 1 ? "entry" : "entries"})`;
  if (!weightHistoryOpen) {
    listEl.classList.add("hidden");
    return;
  }
  listEl.classList.remove("hidden");
  listEl.innerHTML = measurements.map((m, i) => {
    // measurements is newest-first here, so the "previous" entry chronologically is the next one in this array
    const prior = measurements[i + 1];
    const delta = prior ? m.weight - prior.weight : null;
    const deltaStr = delta == null ? "" : ` · ${delta > 0 ? "+" : ""}${delta.toFixed(1)}lb`;
    const bfStr = typeof m.bodyFatPct === "number" ? ` · ${m.bodyFatPct}% BF` : "";
    const neckStr = typeof m.neck === "number" ? `${m.neck}in neck` : "";
    const waistStr = typeof m.waist === "number" ? `${m.waist}in waist` : "";
    const measureStr = [neckStr, waistStr].filter(Boolean).join(", ");
    return `
      <div class="list-item" style="flex-direction:column; align-items:stretch;">
        <div class="name">${m.date}</div>
        <div class="meta">${m.weight}lb${deltaStr}${bfStr}${measureStr ? " · " + measureStr : ""}</div>
        <div class="row mt8">
          <button class="danger-link" style="color:var(--accent);" data-edit-measure="${m.date}">Edit</button>
          <button class="danger-link" style="margin-left:auto;" data-del-measure="${m.date}">Delete</button>
        </div>
        <div class="hidden" data-measure-edit-panel="${m.date}" style="margin-top:8px;">
          <div class="row">
            <div class="field"><div class="field-label">Weight (lb)</div><input type="text" inputmode="decimal" data-mfield="weight" value="${m.weight}"></div>
            <div class="field"><div class="field-label">Neck (in)</div><input type="text" inputmode="decimal" data-mfield="neck" value="${m.neck ?? ""}" placeholder="optional"></div>
          </div>
          <div class="row mt8">
            <div class="field"><div class="field-label">Waist (in)</div><input type="text" inputmode="decimal" data-mfield="waist" value="${m.waist ?? ""}" placeholder="optional"></div>
          </div>
          <button class="primary" data-save-measure="${m.date}" style="margin-top:10px;">Save changes</button>
        </div>
      </div>`;
  }).join("");
}
function toggleWeightHistory() {
  weightHistoryOpen = !weightHistoryOpen;
  renderWeightHistoryList();
}
document.getElementById("weightChart").addEventListener("click", toggleWeightHistory);
document.getElementById("weightHistoryHint").addEventListener("click", toggleWeightHistory);

// Edit/delete a logged measurement entry in place, keyed by its date (there's
// at most one entry per date — see the dedupe in the log-weight handler).
// Editing recomputes bodyFatPct from the edited waist/height, or drops it if
// waist is cleared, so a corrected entry doesn't keep a stale estimate.
document.getElementById("weightHistoryList").addEventListener("click", async (e) => {
  const editDate = e.target.dataset.editMeasure;
  if (editDate !== undefined) {
    document.querySelectorAll("[data-measure-edit-panel]").forEach(p => {
      if (p.dataset.measureEditPanel !== editDate) p.classList.add("hidden");
    });
    document.querySelector(`[data-measure-edit-panel="${editDate}"]`).classList.toggle("hidden");
    return;
  }
  const saveDate = e.target.dataset.saveMeasure;
  if (saveDate !== undefined) {
    const panel = document.querySelector(`[data-measure-edit-panel="${saveDate}"]`);
    const idx = state.measurements.findIndex(m => m.date === saveDate);
    if (idx === -1) return;
    const getVal = (field) => panel.querySelector(`[data-mfield="${field}"]`).value;
    const weightVal = parseFloat(getVal("weight"));
    const neckVal = parseFloat(getVal("neck"));
    const waistVal = parseFloat(getVal("waist"));
    const entry = { ...state.measurements[idx] };
    if (!isNaN(weightVal)) entry.weight = weightVal;
    if (!isNaN(neckVal)) entry.neck = neckVal; else delete entry.neck;
    if (!isNaN(waistVal)) {
      entry.waist = waistVal;
      const heightIn = state.settings.heightInches;
      const bf = heightIn ? relativeFatMassPct(waistVal, heightIn) : null;
      if (bf != null) entry.bodyFatPct = Math.round(bf * 10) / 10;
      else delete entry.bodyFatPct;
    } else {
      delete entry.waist;
      delete entry.bodyFatPct;
    }
    // A corrected waist/weight can change whether this was a bloat day.
    if (detectBloatDay(entry, state.measurements)) entry.bloatFlag = true;
    else delete entry.bloatFlag;
    state.measurements[idx] = entry;
    await persistNow();
    renderProgressCharts();
    renderCelebrations();
    return;
  }
  const delDate = e.target.dataset.delMeasure;
  if (delDate === undefined) return;
  state.measurements = state.measurements.filter(m => m.date !== delDate);
  await persistNow();
  renderProgressCharts();
  renderCelebrations();
});

// Shares computeWeightTrend() with computeMacroSuggestion (same regression,
// same flagged-day exclusion) so the two never disagree about what your
// actual pace is — kept as its own function only so this breakdown's return
// shape (status/margin/reasons) stays independent of what the macro-nudge
// card needs. The Today-tab banner only ever appears once caution is already
// active — this is for seeing how close you are before that happens.
function computeRecoveryStatus() {
  const targetMin = -0.75, targetMax = -0.25; // % bodyweight/week, negative = loss (caution line stays at -0.75)
  const trend = computeWeightTrend(14);
  if (!trend) {
    const ms = state.measurements || [];
    const reason = ms.length < 2
      ? "Log at least 2 weigh-ins to see your pace."
      : "Not enough spread between recent weigh-ins yet — need at least 5 days to trust a weekly rate.";
    return { ready: false, reason, targetMin, targetMax };
  }
  const { pctPerWeek, days, excludedFlagged } = trend;
  const status = pctPerWeek < targetMin ? "caution" : pctPerWeek > targetMax ? "slow" : "onpace";
  // How many more percentage-points/week you could lose before crossing the
  // caution line (positive = margin left) or how far past it you already are
  // (negative, shown as "past the line" below).
  const marginToCaution = pctPerWeek - targetMin;

  // Pull in whatever weight check-in reasons were logged for entries inside
  // this same 14-day window — a fast-loss pace is frequently dehydration, a
  // big workout, illness, or under-eating rather than actual fat/muscle
  // loss, and those get flagged right when a swing is logged (see
  // DECREASE_REASONS / the weightCheckIn flow). This intentionally looks at
  // ALL measurements in the window (not just the unflagged subset
  // computeWeightTrend fits its line to) — the whole point here is showing
  // which flagged days exist, not excluding them.
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const inWindow = (state.measurements || []).filter(m => new Date(m.date).getTime() >= cutoff);
  const reasonCounts = {};
  inWindow.forEach(m => (m.reasons || []).forEach(r => { reasonCounts[r] = (reasonCounts[r] || 0) + 1; }));
  const reasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count, suggestion: REASON_SUGGESTIONS[reason] || "" }))
    .sort((a, b) => b.count - a.count);

  return { ready: true, pctPerWeek, targetMin, targetMax, days, status, marginToCaution, reasons, excludedFlagged };
}

let recoveryStatusOpen = false;
function renderRecoveryStatus() {
  const hintEl = document.getElementById("recoveryStatusHint");
  const detailEl = document.getElementById("recoveryStatusDetail");
  const r = computeRecoveryStatus();
  if (!r.ready) {
    hintEl.textContent = r.reason;
    hintEl.style.color = "";
    detailEl.classList.add("hidden");
    return;
  }
  const STATUS_LABEL = {
    caution: "Losing faster than target — pace caution active",
    slow: "Losing slower than target — no caution",
    onpace: "On pace — no caution",
  };
  hintEl.textContent = `${STATUS_LABEL[r.status]} · ${recoveryStatusOpen ? "hide breakdown" : "see breakdown"}`;
  hintEl.style.color = r.status === "caution" ? "var(--gold)" : "";
  if (!recoveryStatusOpen) {
    detailEl.classList.add("hidden");
    return;
  }
  detailEl.classList.remove("hidden");
  const paceStr = `${r.pctPerWeek > 0 ? "+" : ""}${r.pctPerWeek.toFixed(2)}%/week`;
  const rangeStr = `${r.targetMax}% to ${r.targetMin}%/week`;
  const marginStr = r.marginToCaution < 0
    ? `${Math.abs(r.marginToCaution).toFixed(2)} pts past the ${r.targetMin}% caution line`
    : `${r.marginToCaution.toFixed(2)} pts of margin before the ${r.targetMin}% caution line`;
  const reasonsHtml = r.reasons.length ? `
    <div class="meta" style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border);">
      <strong style="color:var(--text);">Likely explanation, from what you logged this window:</strong>
    </div>
    ${r.reasons.map(x => `<div class="meta mt6">${x.reason} (${x.count})${x.suggestion ? ` — ${x.suggestion}` : ""}</div>`).join("")}
  ` : (r.status === "caution" ? `<div class="meta mt10">No reason logged for the check-ins in this window — worth logging one next time a swing prompts the check-in card, so this can point to a likely cause instead of just the number.</div>` : "");
  const excludedNote = r.excludedFlagged
    ? ` (excluding ${r.excludedFlagged} flagged day${r.excludedFlagged === 1 ? "" : "s"} from the trend line — still shown below)`
    : "";
  detailEl.innerHTML = `
    <div class="list-item"><div class="name">Current pace</div><div class="meta">${paceStr}</div></div>
    <div class="list-item"><div class="name">Target range</div><div class="meta">${rangeStr}</div></div>
    <div class="list-item"><div class="name">Margin to caution</div><div class="meta">${marginStr}</div></div>
    <div class="meta mt8">Based on a trend line across your last ${r.days.toFixed(0)} days of weigh-ins${excludedNote}. This is about weight-loss speed, not training recovery (soreness/sleep) — if pace drops past ${r.targetMin}%/week, progression holds steady (no intensity increases) until it's back in range; that's what "pace caution" means. Losing much faster than this target range risks losing muscle along with fat, not just fat — slower and steadier holds onto more of the muscle you're building.</div>
    ${reasonsHtml}`;
}
function toggleRecoveryStatus() {
  recoveryStatusOpen = !recoveryStatusOpen;
  renderRecoveryStatus();
}
document.getElementById("recoveryStatusHint").addEventListener("click", toggleRecoveryStatus);

let pendingCheckInMeasurementIdx = null;
let pendingCheckInDirection = null;
let pendingCheckInIsBloat = false;
const activeCheckInReasons = new Set();

const WATER_REASON = "Rehydrated (drank a lot of water)";
const INCREASE_REASONS = ["Traveling", "Poor sleep", "Missed workout", "Missed cross-training", "Didn't track food", "Alcohol", "Stress", "No BM in 2+ days", WATER_REASON];
const DECREASE_REASONS = ["Illness", "Dehydration/low water intake", "Big workout", "Didn't eat much", "Traveling", "Stress"];
// Daily check-in reuses this same tag vocabulary (defined here, after both
// lists exist) rather than a second taxonomy — see renderDailyCheckin above.
const ALL_CHECKIN_TAGS = [...new Set([...INCREASE_REASONS, ...DECREASE_REASONS])];

// Exclusive "nothing to report" chip shared by the up/down and bloat prompts.
// Selecting it clears every other chip; saving it records noReason:true instead
// of a reason, so it never counts as a pattern or excludes the day from the
// weight trend (both of which key off a non-empty reasons list).
const CHECKIN_NONE = "__none__";
function checkInChipsHtml(reasons) {
  return reasons.map(r => `<div class="chip" data-reason="${r}">${r}</div>`).join("")
    + `<div class="chip" data-reason="${CHECKIN_NONE}">Nothing unusual — all tracked</div>`;
}

function renderCheckInChips(direction) {
  const reasons = direction === "up" ? INCREASE_REASONS : DECREASE_REASONS;
  document.getElementById("weightCheckInChips").innerHTML = checkInChipsHtml(reasons);
}

document.getElementById("logWeightBtn").addEventListener("click", async () => {
  const weight = parseFloat(document.getElementById("weightInput").value);
  const date = document.getElementById("measurementDateInput").value || localDateStr();
  if (isNaN(weight)) { alert("Enter a weight first."); return; }
  state.measurements = state.measurements || [];

  // find the most recent prior entry (before this date) to compare against
  const prior = state.measurements
    .filter(m => m.date < date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const neckVal = parseFloat(document.getElementById("neckInput").value);
  const waistVal = parseFloat(document.getElementById("waistInput").value);
  const entry = { date, weight };
  if (!isNaN(neckVal)) entry.neck = neckVal;
  if (!isNaN(waistVal)) entry.waist = waistVal;
  if (!isNaN(waistVal)) {
    const heightIn = state.settings.heightInches;
    if (heightIn) {
      const bf = relativeFatMassPct(waistVal, heightIn);
      if (bf != null) entry.bodyFatPct = Math.round(bf * 10) / 10;
    } else {
      alert("Add your height in Settings → Body composition to get a body-fat estimate from this — weight is saved either way.");
    }
  }

  // Never silently replace an existing entry for this date — that's how a
  // stale date box once overwrote a previous day's reading.
  const existingForDate = state.measurements.find(m => m.date === date);
  if (existingForDate && !confirm(`You already have an entry for ${date} (${existingForDate.weight} lb). Replace it with ${weight} lb? (Use Edit in the history list to just fix a value.)`)) {
    return;
  }

  // Flag before saving so the day counts toward bloat patterns even if the
  // follow-up tag prompt below is skipped.
  const bloat = detectBloatDay(entry, state.measurements);
  if (bloat) entry.bloatFlag = true;

  state.measurements = state.measurements.filter(m => m.date !== date);
  state.measurements.push(entry);
  checkWeightMilestones();
  await persistNow();
  document.getElementById("weightInput").value = "";
  document.getElementById("neckInput").value = "";
  document.getElementById("waistInput").value = "";
  renderProgressCharts();
  renderCelebrations();

  let direction = null;
  if (prior && weight > prior.weight) {
    direction = "up"; // any increase at all — the goal is loss, so worth a look every time
  } else if (prior && weight < prior.weight) {
    const pctDrop = ((prior.weight - weight) / prior.weight) * 100;
    if (pctDrop >= 1.5) direction = "down"; // only flag decreases large enough to look unusual
  }

  document.getElementById("weightCheckInFood").classList.add("hidden");
  document.getElementById("weightCheckInFood").value = "";
  document.getElementById("weightCheckInWater").classList.add("hidden");
  document.getElementById("weightCheckInWater").value = "";
  document.getElementById("weightJumpExplain").classList.add("hidden");
  pendingCheckInIsBloat = false;

  if (bloat) {
    // Bloat takes priority over the up/down prompt: weight is flat here, and
    // the tags below are what the pattern-finder learns from.
    pendingCheckInIsBloat = true;
    pendingCheckInMeasurementIdx = state.measurements.findIndex(m => m.date === date);
    pendingCheckInDirection = null;
    activeCheckInReasons.clear();
    document.getElementById("weightCheckInChips").innerHTML = checkInChipsHtml(BLOAT_TAGS);
    document.getElementById("weightCheckInFood").classList.remove("hidden");
    document.getElementById("weightCheckInMessage").textContent =
      `Waist is up ${bloat.waistUp.toFixed(1)}in vs your recent average with weight about the same — often bloating or water. Anything different yesterday? (optional, pick any)`;
    document.getElementById("weightCheckInPanel").classList.remove("hidden");
  } else if (direction) {
    pendingCheckInMeasurementIdx = state.measurements.findIndex(m => m.date === date);
    pendingCheckInDirection = direction;
    activeCheckInReasons.clear();
    renderCheckInChips(direction);
    const diff = Math.abs(weight - prior.weight).toFixed(1);
    document.getElementById("weightCheckInMessage").textContent = direction === "up"
      ? `Up ${diff}lb since your last entry (${prior.weight}lb). What happened? (optional, pick any that apply)`
      : `Down ${diff}lb since your last entry (${prior.weight}lb) — that's a bigger drop than usual. Anything unusual? (optional)`;
    try {
      const ex = direction === "up" ? explainJump(date) : null;
      const exEl = document.getElementById("weightJumpExplain");
      if (ex) { exEl.innerHTML = ex; exEl.classList.remove("hidden"); }
    } catch (e) {}
    document.getElementById("weightCheckInPanel").classList.remove("hidden");
  } else {
    document.getElementById("weightCheckInPanel").classList.add("hidden");
    renderWeighInDetailsState();
  }
});

document.getElementById("weightCheckInChips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-reason]");
  if (!chip) return;
  const reason = chip.dataset.reason;
  const wasActive = activeCheckInReasons.has(reason);
  if (reason === CHECKIN_NONE) {
    // Exclusive: picking it clears everything else; tapping again just unpicks it.
    activeCheckInReasons.clear();
    document.querySelectorAll("#weightCheckInChips .chip").forEach(c => c.classList.remove("active"));
    if (!wasActive) { activeCheckInReasons.add(CHECKIN_NONE); chip.classList.add("active"); }
    return;
  }
  // Picking a real reason drops "nothing unusual".
  if (activeCheckInReasons.delete(CHECKIN_NONE)) {
    const noneChip = document.querySelector(`#weightCheckInChips [data-reason="${CHECKIN_NONE}"]`);
    if (noneChip) noneChip.classList.remove("active");
  }
  chip.classList.toggle("active");
  if (wasActive) activeCheckInReasons.delete(reason);
  else activeCheckInReasons.add(reason);
  if (reason === WATER_REASON) {
    document.getElementById("weightCheckInWater").classList.toggle("hidden", wasActive);
    if (wasActive) document.getElementById("weightCheckInWater").value = "";
  }
});

document.getElementById("weightCheckInSaveBtn").addEventListener("click", async () => {
  if (pendingCheckInMeasurementIdx !== null && state.measurements[pendingCheckInMeasurementIdx]) {
    const m = state.measurements[pendingCheckInMeasurementIdx];
    const none = activeCheckInReasons.has(CHECKIN_NONE);
    const picked = [...activeCheckInReasons].filter(r => r !== CHECKIN_NONE);
    if (pendingCheckInIsBloat) {
      // Kept separate from reasons/checkInDirection so bloat days never feed
      // the weight-pace maths or the up/down weigh-in reason counts.
      m.bloatTags = picked;
      if (none) m.noReason = true; else delete m.noReason;
      const food = document.getElementById("weightCheckInFood").value.trim();
      if (food) m.bloatFoods = food.slice(0, 120); else delete m.bloatFoods;
      pendingCheckInIsBloat = false;
    } else {
      m.reasons = picked;
      const waterOz = parseFloat(document.getElementById("weightCheckInWater").value);
      if (picked.includes(WATER_REASON) && waterOz > 0) m.waterOz = Math.round(waterOz); else delete m.waterOz;
      m.checkInDirection = pendingCheckInDirection;
      if (none) m.noReason = true; else delete m.noReason;
    }
    await persistNow();
    renderReasonPatterns();
    renderBloatPatterns();
    renderWeeklyReview();
  }
  document.getElementById("weightCheckInPanel").classList.add("hidden");
  renderWeighInDetailsState();
});

document.getElementById("weightCheckInSkipBtn").addEventListener("click", () => {
  pendingCheckInIsBloat = false;
  document.getElementById("weightCheckInPanel").classList.add("hidden");
  renderWeighInDetailsState();
});

// The date box defaults to today, but the app can stay open overnight — a
// morning weigh-in then silently landed on yesterday's date and replaced
// that day's entry. Re-sync the default whenever the app comes back into
// view, but only if the box still holds the old auto-filled date (never
// overwrite a date you picked yourself).
let measurementDateAuto = localDateStr();
function refreshMeasurementDateDefault() {
  const el = document.getElementById("measurementDateInput");
  const today = localDateStr();
  if (!el.value || el.value === measurementDateAuto) el.value = today;
  measurementDateAuto = today;
}
document.getElementById("measurementDateInput").value = measurementDateAuto;
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshMeasurementDateDefault(); });
window.addEventListener("focus", refreshMeasurementDateDefault);
