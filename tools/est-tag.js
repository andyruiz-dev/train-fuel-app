const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>{if(!/ServiceWorker|programs/.test(e.message))errs.push(e.message)});
await p.route(/^https?:/,r=>{const u=r.request().url();if(u.includes('/api/'))return r.fulfill({status:200,contentType:'application/json',body:u.includes('/api/state')?'{}':'[]'});r.abort()});
await p.goto('file://'+require('path').join(__dirname,'..','index.html'));await p.waitForTimeout(1500);
await p.click('nav.tabs .tab-btn[data-tab="food"]');
await p.evaluate(()=>{const now=new Date().toISOString();state.foodLogs.push({date:now,name:'Burrito',calories:700,protein:30,carbs:80,fat:25,source:'photo',est:true},{date:now,name:'Bar',calories:200,protein:10,carbs:20,fat:7,source:'photo',est:false},{date:now,name:'Eggs',calories:150,protein:12,carbs:1,fat:10,source:'manual'});renderFoodLogList()});
console.log(await p.evaluate(()=>[...document.querySelectorAll('#foodLogList .tf-fl-name')].map(e=>e.innerText.replace(/\n/g,' | '))));console.log(errs);await b.close()})();
