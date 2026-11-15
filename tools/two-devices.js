const {chromium}=require('playwright');
const FILE=process.argv[2]||require('path').join(__dirname,'..','index.html');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
const b=await chromium.launch();
const server={data:JSON.stringify({logs:[],foodLogs:[{date:'2026-11-10T12:00:00.000Z',name:'Seed A',calories:100,protein:1,carbs:1,fat:1}],cardioLogs:[],measurements:[],settings:{macroTargets:{calories:2000,protein:125,carbs:210,fat:65}},chestLogs:[]}),puts:0};
async function device(name){
  const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker|\.find is not|programs/.test(e.message))errs.push(e.message)});
  await p.route(/^https?:/,r=>{const u=r.request().url(),m=r.request().method();
    if(u.includes('/api/state')){ if(m==='GET')return r.fulfill({status:200,contentType:'application/json',body:server.data}); if(m==='PUT'){server.data=r.request().postData();server.puts++;return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});}}
    if(u.includes('/api/'))return r.fulfill({status:200,contentType:'application/json',body:'[]'});
    r.abort()});
  await p.goto('file://'+FILE);await p.waitForTimeout(1500);p.dev=name;p.errs=errs;return p}
const S=()=>JSON.parse(server.data);
const A=await device('A'),B=await device('B');
const food=(n,c)=>({date:new Date().toISOString(),name:n,calories:c,protein:5,carbs:5,fat:5,source:'manual'});
// 1: both add different foods, B is stale
await A.evaluate(async f=>{state.foodLogs.push(f);await persistNow()},food('From A',111));
await B.evaluate(async f=>{state.foodLogs.push(f);await persistNow()},food('From B',222));
let names=S().foodLogs.map(x=>x.name);
ok(names.includes('From A')&&names.includes('From B')&&names.includes('Seed A'),'1 stale device add keeps both devices\' foods: '+names.join(','));
ok((await B.evaluate(()=>state.foodLogs.map(x=>x.name))).includes('From A'),'1b B now shows A\'s food after merge');
// 2: A changes a setting, B (stale vs A now? sync B first) -> make B stale again
await A.evaluate(async()=>{state.settings.macroTargets.protein=150;await persistNow()});
await B.evaluate(async f=>{state.foodLogs.push(f);await persistNow()},food('B lunch',300));
ok(S().settings.macroTargets.protein===150,'2 A\'s setting change survives B\'s later save (protein='+S().settings.macroTargets.protein+')');
ok(S().foodLogs.some(x=>x.name==='B lunch'),'2b B\'s food also saved');
// 3: A deletes an entry, B stale adds another
await A.evaluate(async()=>{await pullRemoteIfChanged();const i=state.foodLogs.findIndex(x=>x.name==='Seed A');state.foodLogs.splice(i,1);await persistNow()});
await B.evaluate(async f=>{state.foodLogs.push(f);await persistNow()},food('B snack',90));
names=S().foodLogs.map(x=>x.name);
ok(!names.includes('Seed A')&&names.includes('B snack'),'3 A\'s deletion kept and B\'s add kept: '+names.join(','));
// 4: same scalar conflict: later writer wins
await A.evaluate(async()=>{state.settings.macroTargets.calories=1900;await persistNow()});
await B.evaluate(async()=>{state.settings.macroTargets.calories=2100;await persistNow()});
ok(S().settings.macroTargets.calories===2100,'4 same-field conflict: later save wins ('+S().settings.macroTargets.calories+')');
// 5: foreground refresh when clean
await B.evaluate(async f=>{state.foodLogs.push(f);await persistNow()},food('B dinner',500));
await A.evaluate(async()=>{await pullRemoteIfChanged()});
ok((await A.evaluate(()=>state.foodLogs.map(x=>x.name))).includes('B dinner'),'5 idle device picks up other device\'s save on return');
// 6: offline edits then reconnect (dirty path)
await B.context().setOffline(true);
await B.evaluate(async f=>{state.foodLogs.push(f);try{await persistNow()}catch(e){}},food('B offline',77));
await A.evaluate(async f=>{state.foodLogs.push(f);await persistNow()},food('A online',88));
await B.context().setOffline(false);
await B.evaluate(async()=>{if(isDirty())await putState()});
names=S().foodLogs.map(x=>x.name);
ok(names.includes('B offline')&&names.includes('A online'),'6 offline edits merge with online edits on reconnect: '+names.slice(-3).join(','));
// 7: no extra GET/merge when alone: counts only
const before=server.puts;await A.evaluate(async()=>{await persistNow()});ok(server.puts===before+1,'7 plain save is a single PUT');
// 8: reload picks up final state, no dupes
await B.reload();await B.waitForTimeout(1500);
const dup=await B.evaluate(()=>{const k=state.foodLogs.map(x=>x.date+x.name);return k.length-new Set(k).size});ok(dup===0,'8 no duplicate entries after merges ('+dup+')');
console.log('errors',A.errs,B.errs);console.log(fails?('FAILED '+fails):'ALL PASS');await b.close();process.exit(fails?1:0)})();
