const {chromium}=require('playwright');const fs=require('fs');
const OUT=process.argv[2]||require('os').tmpdir()+'/tf-smoke';const THEME=process.env.THEME||'dark';const FAKE=process.env.FAKE||'2026-11-17T10:00:00';
(async()=>{
const W=require('./seed.js').W,F=require('./seed.js').F;
const meas=W.split(';').map(x=>{const[k,v]=x.trim().split(' ');return{date:'2026-'+k,weight:+v}});meas.push({date:'2026-11-09',weight:207,reasons:['Alcohol'],checkInDirection:'up'});
const foods=[];F.split(';').forEach(r=>{const p=r.trim().split(' ');const d='2026-'+p[0];const [k,c,f,a,rs]=p.slice(1).map(Number);const base=k-a-rs;foods.push({date:d+'T14:00:00.000Z',name:'Meals '+d,calories:Math.max(0,base),protein:Math.round(base*0.07),carbs:c,fat:f,source:'manual'});if(a)foods.push({date:d+'T23:00:00.000Z',name:'Beer',calories:a,protein:0,carbs:0,fat:0,source:'recent'});});
const R0=new Date(FAKE);const iso=(h,dd=0)=>{const d=new Date(R0);d.setDate(d.getDate()+dd);d.setHours(h,0,0,0);return d.toISOString()};
[['Protein shake',180,30,8],['Eggs x2 + toast',420,26,9],['Greek yogurt',150,16,10]].forEach(([n,c,p,h])=>foods.push({date:iso(h),name:n,calories:c,protein:p,carbs:10,fat:5,source:'quick'}));
const logs=[];for(let i of [3,5,8,10,12,15,17,19,22,24,26]){const d=new Date(R0);d.setDate(d.getDate()-i);d.setHours(12);logs.push({date:d.toISOString(),exercise:'Kettlebell swing',result:'max'});}
logs.push({date:iso(9,-1),exercise:'Kettlebell swing',result:'max'}); // Monday done
const st=JSON.stringify({logs,settings:{macroTargets:{calories:2000,protein:125,carbs:210,fat:65}},foodLogs:foods,measurements:meas,chestLogs:[]});
const WK={day:'Bell B: hinge, pull, single leg',warmup:[{name:'Cat-cow',detail:'8'}],exercises:[{name:'One-hand kettlebell swing',muscle_group:'hinge',sets:6,reps:'10'},{name:'Kettlebell dead high pull',muscle_group:'pull',sets:4,reps:'5'},{name:'Reverse lunge',muscle_group:'legs',sets:3,reps:'6'}],cooldown:[{name:'Figure-4',detail:'45s'}]};
const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:+process.env.H||844},deviceScaleFactor:2});p.on('pageerror',e=>{if(!/ServiceWorker/.test(e.message))errs.push(e.message)});
await p.route(/^https?:/,r=>{if(r.request().url().includes('/api/'))return r.fallback();r.abort()});await p.route('**/api/**',r=>{const u=r.request().url(),m=r.request().method();r.fulfill({status:200,contentType:'application/json',body:u.includes('/api/state')&&m==='GET'?st:(m==='PUT'?'{}':'[]')})});
await p.addInitScript(({fake})=>{const R=Date;const off=new R(fake).getTime()-R.now();class D extends R{constructor(...a){if(a.length)super(...a);else super(R.now()+off)}static now(){return R.now()+off}}window.Date=D;},{fake:FAKE});
await p.goto('file://'+require('path').join(__dirname,'..','index.html'));await p.waitForTimeout(2000);
await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
await p.evaluate(t=>applyMode(t),THEME);
const info={};
for(const t of ['coach','food','today']){await p.click(`nav.tabs .tab-btn[data-tab="${t}"]`);await p.waitForTimeout(400);
 if(t==='today'){await p.evaluate(w=>{state.todayFocus=null;state.pendingWorkout={completed:false,workout:{},dayIndex:1};renderTodayWorkout(w);window.scrollTo(0,0)},WK);await p.waitForTimeout(300);}
 await p.screenshot({path:`${OUT}_${THEME}_${t}.png`});info[t]=await p.evaluate(()=>({sh:document.scrollingElement.scrollHeight,vh:innerHeight,hw:document.documentElement.scrollWidth}));}
console.log(JSON.stringify(info),'ribbon',await p.evaluate(()=>[...document.querySelectorAll('#wkRibbon .wr-d')].map(e=>e.className.replace('wr-d ','')).join(' | ')));
await p.click('#profileBtn');await p.waitForTimeout(300);console.log('ribbon hidden on settings:',await p.evaluate(()=>document.getElementById('wkRibbon').hidden));
console.log('fonts',await p.evaluate(async()=>{await document.fonts.ready;await document.fonts.load('500 11px "Roboto Mono"');return ['600 20px Rubik','400 14px Inter','500 11px "Roboto Mono"'].map(f=>f+':'+document.fonts.check(f)).join(', ')+' loaded='+[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+f.weight).join(',')}));console.log('errors',errs);await b.close()})();
