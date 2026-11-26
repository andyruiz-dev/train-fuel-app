// Screenshot + rule check of every main screen (Coach, Food, Today, Today expanded, guided set).
// Rules live in docs/UI-RULES.md. Run before every PR (check.sh calls this).
// Screenshots go to $SCREEN_OUT (default: os temp dir) so they can be looked at.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const R = path.join(__dirname, '..');
const OUT = process.env.SCREEN_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tf-screens-'));
const src = fs.readFileSync(R + '/js/exercises.js', 'utf8');
const i0 = src.indexOf('[', src.indexOf('const BUILTIN_EXERCISES'));
let d = 0, k = i0; for (; k < src.length; k++) { if (src[k] == '[') d++; if (src[k] == ']') { d--; if (!d) break; } }
const LIB = eval(src.slice(i0, k + 1)).map(e => Object.assign({ source: 'built-in' }, e));
const FAKE = '2026-11-26T08:00:00'; // a Thursday, training day
const iso = (dd, h = 12) => { const x = new Date(FAKE); x.setDate(x.getDate() + dd); x.setHours(h, 0, 0, 0); return x.toISOString(); };
const prog = { id: 'prog-daily-1', name: 'Daily short: rings and bodyweight', duration_weeks: 24, source: 'built-in', structure: { name: 'Daily short', backBlock: true, session: { days: 5, minutes: '15-20' }, equipment: ['bodyweight', 'rings'], avoid: [], phases: [{ phase: 'Block 1', week_start: 1, week_end: 4, deload_weeks: [4], days: ['Push + core A', 'Pull + legs A', 'Push + core B', 'Pull + legs B', 'Full body'].map(n => ({ day: n, slots: [{ muscle_group: 'push', sets: 3, reps: '8-12' }, { muscle_group: 'core', sets: 3, reps: '8-12' }] })) }] } };
const WK = { day: 'Push + core A', warmup: [{ name: 'Cat-cow', detail: '6 slow reps' }], exercises: [{ name: 'Ring push-up', muscle_group: 'push', sets: 3, reps: '8-12', superset_group: 'A' }, { name: 'Ring row', muscle_group: 'pull', sets: 3, reps: '8-12', superset_group: 'A' }, { name: 'Hollow hold (tucked)', muscle_group: 'core', sets: 3, reps: '20-30', superset_group: null }], cooldown: [{ name: 'Childs pose reach', detail: 'hold 45s' }] };
const state = JSON.stringify({ progressLevels: { push: 3, pull: 2, legs: 1, hinge: 1, core: 2, ruck: 1 }, planeLevels: { push_h: 3, push_v: 1, pull_h: 2, pull_v: 1 }, logs: [{ date: iso(-1), exercise: 'Ring push-up', result: 'hold', muscle_group: 'push', actuals: [8, 9, 9] }, { date: iso(-6), exercise: 'Ring push-up', result: 'hold', muscle_group: 'push', actuals: [8, 8, 8] }], settings: { macroTargets: { calories: 2000, protein: 125, carbs: 230, fat: 65 }, weeklyWorkoutGoal: 5, startingLevels: {} }, foodLogs: [{ date: iso(-1, 13), name: 'Chicken bowl with a very long descriptive name', calories: 700, protein: 50, carbs: 60, fat: 20, source: 'photo' }], cardioLogs: [], measurements: [{ date: '2026-11-24', weight: 203.2 }], flags: [], sessionNotes: [], chestLogs: [], activeProgramId: 'prog-daily-1', pendingWorkout: { programId: 'prog-daily-1', phaseKey: 'x', dayIndex: 0, workout: WK, completed: false }, programProgress: { 'prog-daily-1': { mode: 'count', completed: 0 } }, programStartedAt: { 'prog-daily-1': iso(-1) } });

// Rules measured inside the page. Each returns a list of problems (empty = pass).
function pageRules() {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && e.offsetParent !== null; };
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const out = { overflow: [], tap: [], font: [], title: [], contrast: [], mast: null };
  if (document.documentElement.scrollWidth > innerWidth + 1) out.overflow.push('page scrolls sideways (' + document.documentElement.scrollWidth + ' > ' + innerWidth + ')');
  const sp = document.getElementById('sessionPanel'); const inSession = sp && sp.getBoundingClientRect().height > 0 && !sp.classList.contains('hidden');
  document.querySelectorAll('button, .chip, summary, [role=button], .tab-btn').forEach(e => {
    if (!vis(e) || e.closest('#tfCardStore')) return; if (inSession && !e.closest('#sessionPanel')) return; const r0 = e.getBoundingClientRect(); const zs = e.closest('.tab-panel'); const z = (zs && parseFloat(zs.style.zoom)) || 1; const r = { width: r0.width / z, height: r0.height / z };
    if (r.height < 32 && r.width < 400 && !e.closest('#wkRibbon, #tfExSheet')) out.tap.push((e.id || (typeof e.className==='string' && e.className) || e.tagName) + ' <' + e.tagName.toLowerCase() + ' ' + (e.parentElement && e.parentElement.id || (e.parentElement && e.parentElement.className) || '') + '>' + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' "' + (e.textContent || '').trim().slice(0, 24) + '"');
  });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const e = n.parentElement; if (!e || !vis(e) || e.closest('script,style,svg')) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 11) out.font.push(fs + 'px "' + n.textContent.trim().slice(0, 24) + '"'); }
  document.querySelectorAll('.tf-hero2-title, .tf-fin-day').forEach(e => { if (!vis(e)) return; const bad = e.textContent.trim().split(/\s+/).filter(wd => /^[a-z]/.test(wd) && !['and', 'of', 'the', 'a', 'to', 'for'].includes(wd)); if (bad.length) out.title.push('day name not Title Case: "' + e.textContent.trim() + '"'); });
  const bg = getComputedStyle(document.body).backgroundColor;
  document.querySelectorAll('.tf-tile, .tf-hero-food, .tf-hero2, .tf-recent .chip, .tf-qbtn, #foodLogList, .tf-mv').forEach(e => { if (!vis(e)) return; const c = getComputedStyle(e).backgroundColor; if (/rgba\(.*,\s*0\)/.test(c) || c === 'transparent') return; const rt = ratio(c, bg); if (rt < 1.12) out.contrast.push((e.className || e.id) + ' card vs background ' + rt.toFixed(2)); });
  const mainEl = document.querySelector('main'), navEl = document.querySelector('nav.tabs'), secEl = mainEl && mainEl.querySelector('.tab-panel:not(.hidden)'); if (mainEl) mainEl.scrollTop = 0; out.fit = secEl && navEl ? Math.ceil(secEl.getBoundingClientRect().bottom + 8 - navEl.getBoundingClientRect().top) : 0;
  const hero = document.getElementById('dayHero'), rib = document.getElementById('wkRibbon');
  if (hero && hero.offsetParent !== null && rib) out.mast = Math.round(rib.getBoundingClientRect().bottom);
  return out;
}

(async () => {
  const b = await chromium.launch(); const errs = []; let fails = 0;
  const VP = (process.env.VP || '390x844').split('x').map(Number);
  const p = await b.newPage({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:/, r => { if (r.request().url().includes('/api/')) return r.fallback(); r.abort(); });
  await p.route('**/api/**', r => { const u = r.request().url(), m = r.request().method(); const j = x => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (u.includes('/api/state') && m === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: state });
    if (u.includes('/api/generate')) return j({ content: [{ text: JSON.stringify({ day: WK.day, warmup: WK.warmup, exercises: WK.exercises, cooldown: WK.cooldown }) }] });
    if (u.includes('/api/exercises')) return j(LIB); if (u.includes('/api/programs')) return j([prog]); return j({}); });
  await p.addInitScript(({ fake }) => { const R0 = Date; const off = new R0(fake).getTime() - R0.now(); class D extends R0 { constructor(...a) { if (a.length) super(...a); else super(R0.now() + off); } static now() { return R0.now() + off; } } window.Date = D; }, { fake: FAKE });
  await p.goto('file://' + R + '/index.html'); await p.waitForTimeout(2000);
  await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  const report = async (name) => {
    await p.screenshot({ path: path.join(OUT, name + '-' + VP.join('x') + '.png') });
    const o = await p.evaluate(pageRules); const probs = []; if (o.fit > 1 && name !== 'today-expanded' && name !== 'guided-set') probs.push('does not fit the screen: ' + o.fit + 'px cut off or needing a scroll');
    o.overflow.forEach(x => probs.push('overflow: ' + x)); o.tap.forEach(x => probs.push('tap target under 32px: ' + x));
    o.font.forEach(x => probs.push('text under 11px: ' + x)); o.title.forEach(x => probs.push(x)); o.contrast.forEach(x => probs.push('low contrast: ' + x));
    if (o.mast !== null && o.mast > VP[1] * 0.3) probs.push('masthead too tall: content starts at ' + o.mast + 'px (max 30% of screen)');
    if (probs.length) { fails++; console.log('FAIL ' + name); probs.slice(0, 8).forEach(x => console.log('   ' + x)); } else console.log('PASS ' + name);
  };
  // Late layout change (a web font arriving, the header resizing): the screen must re-fit by itself.
  for (const tab of ['coach', 'food', 'today']) {
    await p.click('nav.tabs .tab-btn[data-tab="' + tab + '"]'); await p.waitForTimeout(tab === 'today' ? 3500 : 800);
    await p.evaluate(() => { const h = document.getElementById('dayHero'); h.style.paddingBottom = '50px'; });
    await p.waitForTimeout(600);
    const over = await p.evaluate(() => { const m = document.querySelector('main'), n = document.querySelector('nav.tabs'), c = m.querySelector('.tab-panel:not(.hidden)'); m.scrollTop = 0; return Math.ceil(c.getBoundingClientRect().bottom + 8 - n.getBoundingClientRect().top); });
    await p.evaluate(() => { document.getElementById('dayHero').style.paddingBottom = ''; }); await p.waitForTimeout(400);
    if (over > 1) { fails++; console.log('FAIL late-layout ' + tab + ': still ' + over + 'px cut off after the header grew'); } else console.log('PASS late-layout ' + tab);
  }
  for (const tab of ['coach', 'food', 'today']) { await p.click('nav.tabs .tab-btn[data-tab="' + tab + '"]'); await p.waitForTimeout(tab === 'today' ? 3500 : 500); await report(tab); }
  // Programs: the up-next day lists real move names, not just muscle groups.
  const pv = await p.evaluate(() => { try { renderProgramView(); } catch (e) { return 'err ' + e.message; } const c = document.querySelector('#tfProgramView .tf-dcard.next .ex'); return c ? c.textContent : 'no card'; });
  if (!pv || /^(err|no card)/.test(pv) || /^(push|pull|legs|core) \d/i.test(pv)) { fails++; console.log('FAIL programs up-next: ' + pv); } else console.log('PASS programs up-next');
  // Opened sections must scroll: open More on Today, scroll down, wait, and the scroll position must stay.
  await p.waitForTimeout(2000); await p.click('#tfMore > summary').catch(() => {}); await p.waitForTimeout(800);
  const sc = await p.evaluate(async () => { const m = document.querySelector('main'); const max = m.scrollHeight - m.clientHeight; const can = max > 20; m.scrollTop = max; await new Promise(r => setTimeout(r, 600)); return { can, top: m.scrollTop, max: m.scrollHeight - m.clientHeight, zoom: document.querySelector('.tab-panel:not(.hidden)').style.zoom }; });
  if (!sc.can || sc.top < sc.max - 2 || sc.zoom) { fails++; console.log('FAIL scroll-when-open: scrollable=' + sc.can + ' scrollTop=' + sc.top + '/' + sc.max + ' zoom=' + (sc.zoom || 'none')); } else console.log('PASS scroll-when-open');
  // Programs: a later day can show likely moves on tap, labelled, without changing the real next workout.
  const fv = await p.evaluate(async () => {
    const keep = JSON.stringify(state.lastWarmupCooldownNames || null); const orig = generateTodayWorkout;
    generateTodayWorkout = async (pr, i, ...rest) => { if (i < 1) return orig(pr, i, ...rest); state.lastWarmupCooldownNames = ['x']; return { day: 'Pull + Legs A', exercises: [{ name: 'Ring row', muscle_group: 'pull', sets: 3, reps: '8-12' }] }; };
    renderProgramView(); const btn = document.querySelector('#tfProgramView [data-fpreview]'); if (!btn) { generateTodayWorkout = orig; return 'no button'; }
    btn.click(); await new Promise(r => setTimeout(r, 500)); generateTodayWorkout = orig;
    const card = [...document.querySelectorAll('#tfProgramView .tf-dcard.pre .ex')].find(e => /Ring row/.test(e.textContent));
    return { shown: !!card, label: card ? /Likely/.test(card.textContent) : false, kept: !(state.lastWarmupCooldownNames || []).includes('x') };
  });
  if (typeof fv === 'string' || !fv.shown || !fv.label || !fv.kept) { fails++; console.log('FAIL programs later-day preview: ' + JSON.stringify(fv)); } else console.log('PASS programs later-day preview');
  await p.click('#tfMore > summary').catch(() => {}); await p.waitForTimeout(400);
  await p.evaluate(() => { document.querySelector('main').scrollTop = 0; });
  await p.click('.tf-ph-main [data-moves-toggle]').catch(() => {}); await p.waitForTimeout(400); await report('today-expanded');
  await p.evaluate(w => { currentWorkout = w; startSession(); }, WK); await p.waitForTimeout(400);
  await p.click('#warmCoolContinueBtn').catch(() => {}); await p.waitForTimeout(400); await report('guided-set');
  console.log('screens saved to', OUT); console.log('errors', errs.filter(e => !/ServiceWorker/.test(e)));
  console.log(fails ? 'SCREENS FAIL (' + fails + ')' : 'SCREENS OK'); await b.close();
})();
