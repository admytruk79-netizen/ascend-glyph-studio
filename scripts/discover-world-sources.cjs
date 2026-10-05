#!/usr/bin/env node
/**
 * Enumerate distinct institutional source websites from vetted discovery directories.
 * This DOES NOT count individual museum objects as sources.
 * It emits a candidate registry for manual/automatic verification.
 */
const fs=require("node:fs");
const path=require("node:path");
const seeds=[
 "https://pieceworkmagazine.com/museums/",
 "https://www.textilesociety.org.uk/resources/online-databases",
 "https://www.nyhandweavers.org/online-museums",
 "https://www.chinastitches.com/en/repositories",
 "https://en.wikipedia.org/wiki/List_of_museums_in_the_United_States",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Canada",
 "https://en.wikipedia.org/wiki/List_of_museums_in_England",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Scotland",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Wales",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Australia",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Japan",
 "https://en.wikipedia.org/wiki/List_of_museums_in_China",
 "https://en.wikipedia.org/wiki/List_of_museums_in_India",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Mexico",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Brazil",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Argentina",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Peru",
 "https://en.wikipedia.org/wiki/List_of_museums_in_Chile",
 "https://en.wikipedia.org/wiki/List_of_museums_in_New_Zealand",
 "https://en.wikipedia.org/wiki/List_of_museums_in_South_Africa"
];
const badHosts=new Set(["facebook.com","www.facebook.com","instagram.com","www.instagram.com","x.com","twitter.com","youtube.com","www.youtube.com","linkedin.com","www.linkedin.com","google.com","www.google.com","wikipedia.org","en.wikipedia.org","wikimedia.org","commons.wikimedia.org"]);
const textile=/textile|embroid|weav|costume|dress|folk|ethnog|anthrop|craft|indigenous|decorative|fabric|needle|quil|sampler|tapestr|ikat|batik|bead|quill|rug|carpet|heritage|museum|collection/i;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function normalize(raw){try{const u=new URL(raw);u.hash="";u.search="";if(!/^https?:$/.test(u.protocol)||badHosts.has(u.hostname.toLowerCase()))return null;return u.origin+"/"}catch{return null}}
async function get(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);try{const r=await fetch(url,{redirect:"follow",signal:c.signal,headers:{"user-agent":"ASCEND-Corpus-Discovery/1.0 (+research source enumeration; respectful rate limits)"}});return r.ok?await r.text():""}catch{return""}finally{clearTimeout(t)}}
function links(html,base){const out=[];for(const m of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)){try{out.push(new URL(m[1],base).href)}catch{}}return out}
async function main(){const seen=new Map();for(const seed of seeds){const html=await get(seed);for(const href of links(html,seed)){const root=normalize(href);if(!root)continue;const h=new URL(root).hostname.toLowerCase();if(!seen.has(h))seen.set(h,{url:root,discoveredFrom:seed,score:textile.test(href)?2:1,status:"candidate"});}await sleep(750)}
 const arr=[...seen.values()].sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url));
 fs.mkdirSync("packages/tesseract-engine/data/generated",{recursive:true});
 fs.writeFileSync("packages/tesseract-engine/data/generated/world-source-candidates.json",JSON.stringify({version:"candidate-v1",generatedAt:new Date().toISOString(),count:arr.length,seeds,items:arr},null,2)+"\n");
 console.log("candidate sources:",arr.length);
 if(arr.length<500)process.exitCode=2;
}
main();