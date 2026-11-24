// Daily-short program + consistency scorecard check (synthetic data only).
const {chromium}=require('playwright');
(async()=>{
const FAKE='2026-11-26T10:00:00'; // Thursday
const iso=(dd,h=12)=>{const d=new Date(FAKE);d.setDate(d.getDate()+dd);d.setHours(h,0,0,0);return d.toISOString()};
const logs=[{date:iso(-3),exercise:'Ring row',result:'hold',muscle_group:'pull'},{date:iso(-2),exercise:'Push-up',result:'hold',muscle_group:'push'}];
const foods=[0,-1,-2,-4].map(d=>({date:iso(d,13),name:'Meal',calories:2000,protein:130,carbs:200,fat:60,source:'manual'}));
let st=JSON.stringify({progressLevels:{push:1,pull:1,legs:1,hinge:1,core:1,ruck:1},planeLevels:{push_h:1,push_v:1,pull_h:1,pull_v:1},logs,settings:{macroTargets:{calories:2000,protein:125,carbs:210,fat:65},weeklyWorkoutGoal:5},foodLogs:foods,cardioLogs:[{date:iso(-1),type:'walk',distance:1,duration:20}],measurements:[{date:'2026-11-25',weight:203.4}],flags:[],sessionNotes:[],chestLogs:[]});
const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message)});p.on('dialog',d=>d.accept());
let genPrompt='',posted=null;
const src=require('fs').readFileSync(require('path').join(__dirname,'..','js','exercises.js'),'utf8');
const i0=src.indexOf('[',src.indexOf('const BUILTIN_EXERCISES'));let dd=0,k=i0;for(;k<src.length;k++){if(src[k]=='[')dd++;if(src[k]==']'){dd--;if(!dd)break}}
const LIB=eval(src.slice(i0,k+1)).map(e=>Object.assign({source:'built-in'},e));
await p.route(/^https?:/,r=>{if(r.request().url().includes('/api/'))return r.fallback();r.abort()});
await p.route('**/api/**',r=>{const u=r.request().url(),m=r.request().method();
 if(u.includes('/api/generate')){genPrompt=r.request().postData()||'';return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:[{text:JSON.stringify({exercises:[{name:'Ring row',muscle_group:'pull',sets:3,reps:'8-12',superset_group:null},{name:'Bodyweight squat',muscle_group:'legs',sets:3,reps:'8-12',superset_group:null}],warmup:[{name:'Cat-cow',detail:'8'}],cooldown:[{name:'Childs pose reach',detail:'hold 45s'}]})}]})})}
 if(u.includes('/api/exercises')&&m==='GET')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(LIB)});
 if(u.includes('/api/programs')&&m==='POST'){posted=JSON.parse(r.request().postData());return r.fulfill({status:200,contentType:'application/json',body:'{}'})}
 if(u.includes('/api/state')&&m==='PUT'){st=r.request().postData();return r.fulfill({status:200,contentType:'application/json',body:'{}'})}
 r.fulfill({status:200,contentType:'application/json',body:u.includes('/api/state')&&m==='GET'?st:(u.includes('/api/programs')&&m==='GET'?JSON.stringify(posted?[posted]:[]):(m==='PUT'?'{}':'[]'))})});
await p.addInitScript(({fake})=>{const R=Date;const off=new R(fake).getTime()-R.now();class D extends R{constructor(...a){if(a.length)super(...a);else super(R.now()+off)}static now(){return R.now()+off}}window.Date=D;},{fake:FAKE});
await p.goto('file://'+require('path').join(__dirname,'..','index.html'));await p.waitForTimeout(1800);
const ok=[];const t=(n,c)=>ok.push((c?'PASS ':'FAIL ')+n);
const hero=await p.evaluate(()=>document.getElementById('coachHero').innerText);
t('scorecard shows 2 of 5',/2\s*of 5 sessions/.test(hero));
t('weight is secondary',/Weight 203\.4/.test(hero));
t('food logged 4/7',/4 \/ 7\s*food logged/.test(hero.replace(/\n/g,' ')));
t('walk days 1/7',/1 \/ 7\s*walk days/.test(hero.replace(/\n/g,' ')));
await p.screenshot({path:'/tmp/claude-0/-home-claude/83ad12a1-a0e9-5399-853a-4bd37ae84b17/scratchpad/coach.png'});
// add program
await p.evaluate(()=>{document.getElementById('programsBtn').click()});await p.waitForTimeout(300);
await p.evaluate(()=>{document.getElementById('programManage').open=true;document.querySelectorAll('#subtab-my-programs details').forEach(d=>d.open=true)});
await p.click('#addDailyProgramBtn');await p.waitForTimeout(1500);
t('program posted',!!posted&&posted.name.startsWith('Daily short'));
t('5 days per block',posted&&posted.structure.phases[0].days.length===5);
t('goal set to 5',await p.evaluate(()=>state.settings.weeklyWorkoutGoal===5));
const act=await p.evaluate(()=>state.activeProgramId);console.log('active=',act);t('program active',/prog-daily-/.test(act||''));
t('chip 15-20 present',await p.locator('#minutesChips [data-minutes="15-20"]').count()===1);
await p.waitForTimeout(800);
t('AI prompt lists real exercises',/Ring row|Push-up/.test(genPrompt.split('Available exercises:')[1]||''));
t('AI prompt excludes kettlebell',genPrompt.length>0&&!/kettlebell/i.test(genPrompt.split('Available exercises:')[1]||''));
t('AI prompt excludes good morning',!/Good morning/i.test(genPrompt.split('Mobility library')[0]));
t('15-20 minute session told to AI',/15-20-minute/.test(genPrompt));
t('rest days Wed/Sun',await p.evaluate(()=>[0,3].every(d=>DAY_PLAN[d]==='rest')&&[1,2,4,5,6].every(d=>DAY_PLAN[d]==='train')));
const wu=await p.evaluate(()=>((state.pendingWorkout&&state.pendingWorkout.workout&&state.pendingWorkout.workout.warmup)||[]).map(w=>w.name));
console.log('WU',JSON.stringify(wu));t('back block leads the warm-up ('+wu.slice(0,3).join(', ')+')',wu[0]==='Cat-cow'&&wu.some(n=>/bird/i.test(n))&&wu.some(n=>/dead bug/i.test(n)));
console.log(ok.join('\n'));console.log('errors',errs);await b.close()})();
