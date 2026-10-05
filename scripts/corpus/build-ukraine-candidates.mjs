import fs from"node:fs";import path from"node:path";
const OUT=".corpus-out/ukraine";fs.mkdirSync(OUT,{recursive:true});
const TARGET=Math.max(1000,Number(process.env.TARGET||25000));
const seeds=[
 {id:"museum-fund-ua",base:"https://museum.mincult.gov.ua/",queries:["рушник","вишивка","сорочка","пояс","тканина","килим","народне мистецтво"]},
 {id:"krovets",base:"https://krovets.ua/en",queries:["rushnyk","embroidery","shirt","vyshyvanka","Poltava","Hutsul","Bukovyna","Pokuttia","Zakarpattia","Podillia","Polissia"]},
 {id:"slobocode",base:"https://slobocode.art/en-US/",queries:["embroidery","rushnyk","shirt","textile","Slobozhanshchyna","Kharkiv"]},
 {id:"ukrainian-museum-ny",base:"https://www.theukrainianmuseum.org/collections/",queries:["embroidery","woven","rushnyk","shirt","sash","costume"]}
];
const uaTerms=/rushnyk|рушник|vyshyv|вишив|soroch|сороч|embroid|woven|weav|textile|ткан|килим|carpet|belt|пояс|costume|костюм|shirt|сорочка|hutsul|гуцул|bukov|буков|pokutt|покут|zakarp|закарп|podill|поділ|poliss|поліс|poltav|полтав|slobozh|слобож|kharkiv|харків/i;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);try{const r=await fetch(url,{redirect:"follow",signal:c.signal,headers:{"User-Agent":"ASCEND-Tesseract-Corpus/1.0 (+research; respectful crawling)"}});return r.ok?await r.text():""}catch{return""}finally{clearTimeout(t)}}
function links(html,base){const a=[];for(const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)){try{a.push(new URL(m[1],base).href)}catch{}}return a}
function strip(s){return s.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
const seen=new Set(),items=[];
async function crawl(seed){const queue=[seed.base],visited=new Set();while(queue.length&&items.length<TARGET){const url=queue.shift();if(visited.has(url)||visited.size>1200)continue;visited.add(url);const html=await get(url);if(!html)continue;const text=strip(html);if(uaTerms.test(text+url)){const key=seed.id+"|"+url;if(!seen.has(key)){seen.add(key);items.push({source:seed.id,url,title:(text.slice(0,180)||url),status:"candidate",country:"Ukraine",provenance:seed.base});}}
for(const l of links(html,url)){try{const u=new URL(l),b=new URL(seed.base);if(u.hostname===b.hostname&&!visited.has(u.href)&&u.pathname.length<220)queue.push(u.href)}catch{}}
if(visited.size%25===0)await sleep(300);
}}
for(const s of seeds){await crawl(s);if(items.length>=TARGET)break}
fs.writeFileSync(path.join(OUT,"ukraine-candidates.jsonl"),items.map(x=>JSON.stringify(x)).join("\n")+"\n");
fs.writeFileSync(path.join(OUT,"ukraine-stats.json"),JSON.stringify({target:TARGET,count:items.length,bySource:Object.fromEntries(seeds.map(s=>[s.id,items.filter(x=>x.source===s.id).length])),generatedAt:new Date().toISOString()},null,2));
console.log({target:TARGET,count:items.length});
if(items.length<1000)process.exitCode=2;
