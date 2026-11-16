const {chromium}=require('playwright');const fs=require('fs');
const OUT=process.argv[2];const FILE=process.argv[3]||require('path').join(__dirname,'..','index.html');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{

const W=require('./seed.js').W,F=require('./seed.js').F;
const meas=W.split(';').map(x=>{const[k,v]=x.trim().split(' ');return{date:'2026-'+k,weight:+v}});
meas.push({date:'2026-11-09',weight:207,reasons:['Alcohol'],checkInDirection:'up'});
const b=await chromium.launch();const errs=[];let n=0;
const WK={day:'Bell B: hinge, pull, single leg',warmup:[{name:'Cat-cow',detail:'8'}],exercises:[{name:'One-hand kettlebell swing',muscle_group:'hinge',sets:6,reps:'10'},{name:'Kettlebell dead high pull',muscle_group:'pull',sets:4,reps:'5'},{name:'Reverse lunge',muscle_group:'legs',sets:3,reps:'6'}],cooldown:[{name:'Figure-4',detail:'45s'}]};
async function run(theme,scn){
 const FAKE=scn==='rest'?'2026-11-15T14:00:00':scn==='chest'?'2026-11-16T10:00:00':'2026-11-17T10:00:00';
 const foods=[];
 F.split(';').forEach(r=>{const p=r.trim().split(' ');const d='2026-'+p[0];const [k,c,f,a,rs]=p.slice(1).map(Number);const base=k-a-rs;foods.push({date:d+'T14:00:00.000Z',name:'Meals '+d,calories:Math.max(0,base),protein:Math.round(base*0.07),carbs:c,fat:f,source:'manual'});if(a)foods.push({date:d+'T23:00:00.000Z',name:'Beer',calories:a,protein:0,carbs:0,fat:0,source:'recent'});});
 const R0=new Date(FAKE);const iso=(h)=>{const d=new Date(R0);d.setHours(h,0,0,0);return d.toISOString()};
 [['Protein shake',180,30,8],['Eggs x2 + toast',420,26,9],['Greek yogurt',150,16,10],['Chicken bowl',640,52,13],['Apple',95,0,15]].forEach(([nm,c,p,h])=>foods.push({date:iso(h),name:nm,calories:c,protein:p,carbs:10,fat:5,source:'quick'}));
 const logs=[];for(let i of [3,5,8,10,12,15,17,19,22,24,26]){const d=new Date(R0);d.setDate(d.getDate()-i);d.setHours(12);logs.push({date:d.toISOString(),exercise:'Kettlebell swing',result:'max'});}
 if(scn==='done')logs.push({date:iso(9),exercise:'Kettlebell swing',result:'max'});
 const st=JSON.stringify({logs,settings:{macroTargets:{calories:2000,protein:125,carbs:210,fat:65}},foodLogs:foods,measurements:meas});
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(theme+scn+': '+e.message)});
 await p.route('**/api/**',r=>{const u=r.request().url(),m=r.request().method();r.fulfill({status:200,contentType:'application/json',body:u.includes('/api/state')&&m==='GET'?st:(m==='PUT'?'{}':'[]')})});
 await p.addInitScript(({fake})=>{const R=Date;const off=new R(fake).getTime()-R.now();class D extends R{constructor(...a){if(a.length)super(...a);else super(R.now()+off)}static now(){return R.now()+off}}window.Date=D;},{fake:FAKE});
 await p.goto('file://'+FILE);await p.waitForTimeout(1800);
 await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
 await p.evaluate(t=>applyMode(t),theme);
 const shot=async(name)=>{await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(250);await p.screenshot({path:`${OUT}/${theme}_${scn}_${name}.png`,fullPage:true});n++};
 const tab=async t=>{await p.click(`nav.tabs .tab-btn[data-tab="${t}"]`);await p.waitForTimeout(350)};
 await tab('today');
 await p.evaluate(w=>{state.todayFocus=null;state.pendingWorkout={completed:false,workout:{},dayIndex:1};renderTodayWorkout(w);window.scrollTo(0,0)},WK);await shot('today');
 if(scn==='train'){await p.click('#logWalkChip');await shot('cardio');await p.click('#logWalkChip');await p.evaluate(()=>{try{openExerciseSheet('One-hand kettlebell swing',0)}catch(e){}});await shot('exsheet');await p.evaluate(()=>{try{closeExerciseSheet()}catch(e){}});await p.evaluate(()=>{try{startSession()}catch(e){}});await shot('session');await p.evaluate(()=>{try{session.resting=true;session.restEndTime=Date.now()+60000;renderSession()}catch(e){}});await shot('session_rest');await p.reload();await p.waitForTimeout(1500);await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});await p.evaluate(t=>applyMode(t),theme);await tab('today');await p.evaluate(w=>{state.todayFocus=null;state.pendingWorkout={completed:false,workout:{},dayIndex:1};renderTodayWorkout(w);window.scrollTo(0,0)},WK);}
 await tab('coach');await shot('coach');
 await p.evaluate(()=>document.querySelectorAll('#tab-coach details').forEach(d=>d.open=true));await shot('coach_open');
 await p.evaluate(()=>document.querySelectorAll('#tab-coach details').forEach(d=>d.open=false));
 await tab('food');await shot('food');
 if(scn==='rest'){
  await p.click('#photoOptionsToggle');await shot('food_photoopts');await p.click('#photoOptionsToggle');
  await p.click('#tfQuickTile');await shot('food_quick');await p.click('#tfQuickTile');
  await p.click('#tfExactTile');await shot('food_exact');await p.click('#tfExactTile');
  await p.click('[data-my-foods-open]');await shot('food_all');await p.click('[data-my-foods-open]');
  await p.click('#foodLogList [data-log-toggle]');await p.click('#foodLogList [data-row-toggle]');await shot('food_rowopen');
  await p.click('#foodHistoryOpen');await shot('food_history');
 }
 await p.click('#profileBtn');await p.waitForTimeout(400);await shot('settings');
 await p.evaluate(()=>document.querySelectorAll('#tab-settings details').forEach(d=>d.open=true));await shot('settings_open');
 if(scn==='rest'){
  await p.click('#programsBtn',{force:true}).catch(()=>{});await p.waitForTimeout(400);await shot('programs');
  await tab('coach');await p.click('#coachHero').catch(()=>{});await p.waitForTimeout(400);await shot('progsheet');
 }
 await p.close();
}
for(const th of ['dark','light'])for(const sc of ['rest','train','chest','done'])await run(th,sc);
console.log('shots',n,'errors',errs);await b.close();})();
