import fs from"node:fs";import path from"node:path";
const input=process.env.INPUT||".corpus-out/ukraine/ukraine-candidates.jsonl";
const out=process.env.OUTPUT||".corpus-out/ukraine/ukraine-normalized.json";
const regionRules=[
 ["poltava","poltavshchyna"],["полтав","poltavshchyna"],
 ["hutsul","hutsulshchyna"],["гуцул","hutsulshchyna"],
 ["bukov","bukovyna"],["буков","bukovyna"],
 ["pokutt","pokuttia"],["покут","pokuttia"],
 ["zakarp","zakarpattia"],["закарп","zakarpattia"],
 ["podill","podillia"],["поділ","podillia"],
 ["poliss","polissia"],["поліс","polissia"],
 ["slobozh","slobozhanshchyna"],["слобож","slobozhanshchyna"],
 ["kharkiv","slobozhanshchyna"],["харків","slobozhanshchyna"]
];
const typeRules=[
 ["rushnyk","rushnyk"],["рушник","rushnyk"],["shirt","shirt"],["сороч","shirt"],
 ["belt","belt"],["пояс","belt"],["carpet","carpet"],["килим","carpet"],
 ["costume","costume"],["костюм","costume"],["textile","textile"],["ткан","textile"]
];
const techniqueRules=[
 ["embro","embroidery"],["вишив","embroidery"],["woven","weaving"],["weav","weaving"],["ткал","weaving"],["bead","beadwork"],["бісер","beadwork"]
];
const read=fs.readFileSync(input,"utf8").split(/\n+/).filter(Boolean).map(JSON.parse);
const sources=[],objects=[],observations=[];let oi=0;
for(const r of read){const sid="ua:"+r.source;if(!sources.some(x=>x.id===sid))sources.push({id:sid,institution:r.source,title:r.source,url:r.provenance,authority:.75});
 const text=((r.title||"")+" "+(r.url||"")).toLowerCase();
 const regions=[...new Set(regionRules.filter(([k])=>text.includes(k)).map(([,v])=>v))];
 const objectType=(typeRules.find(([k])=>text.includes(k))||[])[1]||"textile-object";
 const id="uaobj:"+(++oi);
 objects.push({id,sourceIds:[sid],cultureIds:["ukrainian"],traditionIds:regions.length?regions:["ukrainian-unspecified"],regionIds:regions,objectType,access:"review",sourceUrl:r.url});
 for(const [,v] of techniqueRules.filter(([k])=>text.includes(k)))observations.push({id:id+":tech:"+v,objectId:id,kind:"technique",value:v,weight:.7,status:"interpretive",sourceIds:[sid]});
 if(regions.length)for(const rg of regions)observations.push({id:id+":region:"+rg,objectId:id,kind:"placement",value:"regional-provenance:"+rg,weight:.6,status:"interpretive",sourceIds:[sid]});
}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({version:"ukraine-normalized-v1",sources,objects,observations,relationships:[]},null,2));
console.log({sources:sources.length,objects:objects.length,observations:observations.length});
