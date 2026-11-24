// Unit check for enforceUniqueAndRepMoves: no repeated move in one session, rep moves preferred over holds on push/pull/legs.
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();p.on('pageerror',e=>errs.push(e.message));
await p.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:r.request().method()==='PUT'?'{}':(r.request().url().includes('/api/state')?'{}':'[]')}));
await p.goto('file://'+require('path').join(__dirname,'..','index.html'));await p.waitForTimeout(1500);
const out=await p.evaluate(()=>{
  exercises.splice(0,exercises.length,...BUILTIN_EXERCISES);
  const avail=[{name:'Ring support hold',muscle_group:'push'},{name:'Ring push-up',muscle_group:'push'},{name:'Pike push-up',muscle_group:'push'},{name:'Dead bug',muscle_group:'core'},{name:'Hollow hold',muscle_group:'core'}];
  const r={exercises:[{name:'Ring support hold',muscle_group:'push',sets:3,reps:'20-30'},{name:'Ring support hold',muscle_group:'push',sets:2,reps:'20-30'},{name:'Dead bug',muscle_group:'core',sets:3,reps:'8-10'}]};
  enforceUniqueAndRepMoves(r,avail,new Set());
  const only={exercises:[{name:'Ring support hold',muscle_group:'push',sets:3,reps:'20-30'},{name:'Ring support hold',muscle_group:'push',sets:2,reps:'20-30'}]};
  enforceUniqueAndRepMoves(only,[{name:'Ring support hold',muscle_group:'push'}],new Set());
  return {r:r.exercises.map(e=>e.name+' '+e.reps),only:only.exercises.map(e=>e.name+' '+e.reps)};});
const names=out.r.map(x=>x.replace(/ [\d-]+$/,''));
const t=(n,c)=>console.log((c?'PASS ':'FAIL ')+n);
t('no duplicate moves',new Set(names).size===names.length);
t('push slots use rep moves',!/support hold/i.test(out.r[0]+out.r[1]));
t('swapped hold gets 8-12 reps',/8-12/.test(out.r[0])&&/8-12/.test(out.r[1]));
t('core can stay as is',/Dead bug 8-10/.test(out.r[2]));
t('falls back if no alternative (unchanged, no crash)',out.only.length===2&&/support hold/i.test(out.only[0]));
const dis=await p.evaluate(()=>({d:state.dislikedExercises,ids:['supine-heel-taps','plank-reach-out'].map(i=>!!BUILTIN_EXERCISES.find(e=>e.id===i))}));
t('bear crawl is on the never-show list',Array.isArray(dis.d)&&dis.d.includes('bear-crawl'));
t('replacement core moves exist',dis.ids.every(Boolean));
console.log('errors',errs.filter(e=>!/ServiceWorker/.test(e)));await b.close()})();
