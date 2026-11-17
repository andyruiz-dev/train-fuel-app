// Pause / resume / end-early check for the guided session (synthetic data only).
const {chromium}=require('playwright');
(async()=>{
const WK={day:'Bell B',warmup:[],exercises:[{name:'One-hand kettlebell swing',muscle_group:'hinge',sets:3,reps:'10'},{name:'Reverse lunge',muscle_group:'legs',sets:2,reps:'6'}],cooldown:[]};
const st=JSON.stringify({flags:[],cardioLogs:[],sessionNotes:[],progressLevels:{push:1,pull:1,legs:1,hinge:1,core:1,ruck:1},planeLevels:{push_h:1,push_v:1,pull_h:1,pull_v:1},logs:[],settings:{macroTargets:{calories:2000,protein:125,carbs:210,fat:65}},foodLogs:[],measurements:[],chestLogs:[],activeProgramId:'p1',pendingWorkout:{programId:'p1',phaseKey:'k',dayIndex:0,workout:WK,completed:false}});
const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>{if(process.env.DBG)console.log(e.stack);if(!/ServiceWorker/.test(e.message))errs.push(e.message)});p.on('dialog',d=>d.accept());
await p.route(/^https?:/,r=>{if(r.request().url().includes('/api/'))return r.fallback();r.abort()});
await p.route('**/api/**',r=>{const u=r.request().url(),m=r.request().method();r.fulfill({status:200,contentType:'application/json',body:u.includes('/api/state')&&m==='GET'?st:(m==='PUT'?'{}':'[]')})});
await p.goto('file://'+require('path').join(__dirname,'..','index.html'));await p.waitForTimeout(1500);
const ok=[];const t=(n,c)=>{ok.push((c?'PASS ':'FAIL ')+n)};
await p.click('nav.tabs .tab-btn[data-tab="today"]');await p.waitForTimeout(500);await p.evaluate(w=>{currentWorkout=w;startSession();},WK);
await p.waitForTimeout(200);
t('pause button on set screen',await p.locator('#pauseSessionBtn').count()===1);
await p.fill('#actualRepsInput','10');await p.click('#completeSetBtn');await p.waitForTimeout(200);
t('pause button on rest screen',await p.locator('#pauseSessionBtn').count()===1);
const left0=await p.evaluate(()=>session.restEndTime-Date.now());
await p.click('#pauseSessionBtn');await p.waitForTimeout(1500);
t('paused screen shown',await p.locator('#resumePausedBtn').count()===1);
t('timers stopped',await p.evaluate(()=>session.timerId===null&&!session.resting&&session.paused));
t('snapshot saved paused',await p.evaluate(()=>JSON.parse(localStorage.getItem('tf_session_snapshot')).session.paused===true));
await p.click('#resumePausedBtn');await p.waitForTimeout(200);
const left1=await p.evaluate(()=>session.restEndTime-Date.now());
t('rest time kept ('+Math.round(left0)+' -> '+Math.round(left1)+'ms)',left1>left0-1500&&left1<=left0+200);
t('resting again',await p.evaluate(()=>session.resting&&!session.paused));
// pause, simulate closing the app, resume from the Today card
await p.click('#pauseSessionBtn');await p.waitForTimeout(100);
await p.reload();await p.waitForTimeout(1500);
await p.evaluate(()=>{document.querySelector('nav.tabs .tab-btn[data-tab="today"]').click()});await p.waitForTimeout(300);
await p.evaluate(w=>{currentWorkout=w;renderTodayWorkout(w)},WK);
t('resume card says paused',(await p.locator('#resumeSessionBtn').innerText()).startsWith('Resume workout'));
await p.click('#resumeSessionBtn');await p.waitForTimeout(300);
t('back in session after reload',await p.evaluate(()=>session&&!session.paused&&session.pos===1));
// end early logs finished sets
await p.evaluate(()=>{clearInterval(session.timerId);session.resting=false;renderSession()});
await p.click('#endSessionBtn');await p.waitForTimeout(800);
t('end early logged',await p.evaluate(()=>state.logs.length>0));
t('day marked complete',await p.evaluate(()=>state.pendingWorkout.completed===true));
t('summary shown',await p.locator('#sessionSummaryDoneBtn').count()===1);
console.log(ok.join('\n'));console.log('errors',errs);await b.close()})();
