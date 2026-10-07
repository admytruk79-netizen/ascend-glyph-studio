import type {CorpusCanonicalGeometry} from "./corpus-canonical";
export type PrimitiveId="torus"|"axis"|"spatial-flow"|"opposition"|"radial-emission"|"seed"|"branch"|"orbit"|"crossing"|"void";
export type PrimitivePort={id:string;x:number;y:number;angleDeg:number;role:"entry"|"exit"|"branch"|"orbit"|"center"};
export type PrimitiveGeometry={id:PrimitiveId;viewBox:string;paths:string[];ports:PrimitivePort[];closure:"open"|"closed"|"mixed";status:"source-derived-provisional"|"canonical-verified"|"corpus-canonical";source:string};

const src="Oleksandr source-symbol board / hand-drawn geometry";
export const ASCEND_PRIMITIVES:Record<PrimitiveId,PrimitiveGeometry>={
 torus:{id:"torus",viewBox:"0 0 100 100",paths:["M15 50 C18 25 38 12 61 18 C85 24 92 44 80 65 C68 85 40 91 22 72 C12 62 11 52 15 50","M29 49 C32 35 44 29 59 32 C72 35 78 45 71 57 C64 69 48 73 36 64 C29 59 26 53 29 49","M17 43 C36 54 61 55 84 47","M22 31 C43 43 66 44 82 38"],ports:[{id:"center",x:50,y:51,angleDeg:0,role:"center"},{id:"orbit-a",x:15,y:50,angleDeg:180,role:"orbit"},{id:"orbit-b",x:80,y:65,angleDeg:45,role:"orbit"}],closure:"mixed",status:"source-derived-provisional",source:src},
 axis:{id:"axis",viewBox:"0 0 100 100",paths:["M50 8 L50 91","M50 18 C33 23 25 38 26 53 C27 70 38 81 50 84","M50 18 C68 23 77 39 75 55 C73 70 62 81 50 84","M19 52 C35 47 66 47 82 52"],ports:[{id:"top",x:50,y:8,angleDeg:-90,role:"entry"},{id:"bottom",x:50,y:91,angleDeg:90,role:"exit"},{id:"center",x:50,y:52,angleDeg:0,role:"center"}],closure:"open",status:"source-derived-provisional",source:src},
 "spatial-flow":{id:"spatial-flow",viewBox:"0 0 100 100",paths:["M9 46 C22 14 67 9 88 37 C101 55 82 83 51 82 C23 81 13 63 19 44","M18 69 C35 46 60 30 91 30","M23 22 C43 40 66 56 91 64"],ports:[{id:"entry",x:9,y:46,angleDeg:200,role:"entry"},{id:"exit",x:91,y:64,angleDeg:20,role:"exit"},{id:"center",x:51,y:50,angleDeg:0,role:"center"}],closure:"open",status:"source-derived-provisional",source:src},
 opposition:{id:"opposition",viewBox:"0 0 100 100",paths:["M8 29 L25 45 L40 29","M8 50 L25 66 L40 50","M92 29 L75 45 L60 29","M92 50 L75 66 L60 50","M38 18 L50 30 L62 18","M38 78 L50 66 L62 78"],ports:[{id:"left",x:8,y:50,angleDeg:180,role:"entry"},{id:"right",x:92,y:50,angleDeg:0,role:"entry"},{id:"center",x:50,y:50,angleDeg:0,role:"center"}],closure:"open",status:"source-derived-provisional",source:src},
 "radial-emission":{id:"radial-emission",viewBox:"0 0 100 100",paths:["M50 50 C43 36 42 19 48 6","M50 50 C57 34 64 21 75 11","M50 50 C65 43 79 38 94 40","M50 50 C66 55 80 65 88 78","M50 50 C56 66 56 80 51 95","M50 50 C41 66 31 78 18 87","M50 50 C35 55 20 54 7 47","M50 50 C36 43 26 31 18 18","M50 50 C47 43 52 36 58 31"],ports:[{id:"center",x:50,y:50,angleDeg:0,role:"center"},{id:"ray-a",x:48,y:6,angleDeg:-95,role:"exit"},{id:"ray-b",x:94,y:40,angleDeg:-10,role:"exit"},{id:"ray-c",x:18,y:87,angleDeg:135,role:"exit"}],closure:"open",status:"source-derived-provisional",source:src},
 seed:{id:"seed",viewBox:"0 0 100 100",paths:["M50 27 C64 31 69 43 64 54 C59 66 43 70 34 59 C25 48 32 32 50 27"],ports:[{id:"center",x:50,y:49,angleDeg:0,role:"center"},{id:"growth",x:50,y:27,angleDeg:-90,role:"exit"}],closure:"closed",status:"source-derived-provisional",source:src},
 branch:{id:"branch",viewBox:"0 0 100 100",paths:["M50 92 C49 69 50 50 50 35","M50 56 C40 46 31 39 19 34","M50 47 C60 37 68 29 80 22"],ports:[{id:"root",x:50,y:92,angleDeg:90,role:"entry"},{id:"left",x:19,y:34,angleDeg:210,role:"branch"},{id:"right",x:80,y:22,angleDeg:-35,role:"branch"}],closure:"open",status:"source-derived-provisional",source:src},
 orbit:{id:"orbit",viewBox:"0 0 100 100",paths:["M12 53 C19 25 45 13 70 23 C92 32 94 58 76 73 C56 90 25 81 16 62","M70 23 C57 35 46 52 39 76"],ports:[{id:"entry",x:12,y:53,angleDeg:190,role:"orbit"},{id:"exit",x:76,y:73,angleDeg:35,role:"orbit"},{id:"center",x:51,y:51,angleDeg:0,role:"center"}],closure:"open",status:"source-derived-provisional",source:src},
 crossing:{id:"crossing",viewBox:"0 0 100 100",paths:["M15 18 C37 35 59 60 84 84","M82 15 C62 36 42 60 18 85"],ports:[{id:"nw",x:15,y:18,angleDeg:225,role:"entry"},{id:"se",x:84,y:84,angleDeg:45,role:"exit"},{id:"ne",x:82,y:15,angleDeg:-45,role:"entry"},{id:"sw",x:18,y:85,angleDeg:135,role:"exit"}],closure:"open",status:"source-derived-provisional",source:src},
 void:{id:"void",viewBox:"0 0 100 100",paths:["M15 50 C21 24 41 14 59 18","M77 30 C88 43 85 62 73 74","M58 83 C40 87 24 77 18 65"],ports:[{id:"gap-a",x:59,y:18,angleDeg:-20,role:"exit"},{id:"gap-b",x:77,y:30,angleDeg:210,role:"entry"},{id:"center",x:50,y:50,angleDeg:0,role:"center"}],closure:"open",status:"source-derived-provisional",source:src}
};
let CORPUS_CANON:CorpusCanonicalGeometry[]=[];
export function installCorpusCanon(canon:CorpusCanonicalGeometry[]){CORPUS_CANON=canon.filter(x=>x.status==="canonical");}
function corpusScore(form:string,c:CorpusCanonicalGeometry){
 const v=c.centroid;
 const target:Record<string,number>={seed:v.focalDominance+v.closure+v.voidRatio*.3,axis:v.axisStrength+v.vertical*.6,torus:v.closure+v.radial+v.voidRatio*.4,bifurcation:v.branching+v.directionalEntropy*.5,branch:v.branching+v.directionalEntropy*.55,opposition:v.asymmetryBalance+v.interruption+v.directionalEntropy*.35,crossing:v.interruption+v.directionalEntropy+v.axisStrength*.2,enclosure:v.closure+v.voidRatio+v.radial*.35,mutation:v.densityVariation+v.asymmetryBalance+v.interruption*.5,"spatial-flow":v.directionalEntropy+v.asymmetryBalance+v.horizontal*.35,"radial-emission":v.radial+v.branching+v.directionalEntropy*.35,void:v.voidRatio+v.interruption+v.asymmetryBalance*.25,orbit:v.radial+v.closure+v.directionalEntropy*.3};
 return (target[form]??v.compositionalDepth)+Math.log1p(c.support)*.015+c.nearestReferenceDistance*.2;
}
function corpusPrimitiveForForm(form:string):PrimitiveGeometry|undefined{
 const c=CORPUS_CANON.length?[...CORPUS_CANON].sort((a,b)=>corpusScore(form,b)-corpusScore(form,a))[0]:undefined;
 if(!c)return undefined;
 const id=(form==="bifurcation"?"branch":form==="enclosure"?"torus":form==="mutation"?"spatial-flow":form) as PrimitiveId;
 return {id,viewBox:c.viewBox,paths:c.paths,ports:[],closure:c.centroid.closure>.58?"closed":c.centroid.closure>.28?"mixed":"open",status:"corpus-canonical",source:`full-corpus:${c.id};support=${c.support};traditions=${c.traditions.length};sources=${c.sources.length}`};
}
export function primitiveForForm(form:string):PrimitiveGeometry|undefined{
 const corpus=corpusPrimitiveForForm(form);if(corpus)return corpus;
 const map:Record<string,PrimitiveId>={seed:"seed",axis:"axis",torus:"torus",bifurcation:"branch",branch:"branch",opposition:"opposition",crossing:"crossing",enclosure:"torus",mutation:"spatial-flow","spatial-flow":"spatial-flow","radial-emission":"radial-emission",void:"void",orbit:"orbit"};
 return ASCEND_PRIMITIVES[map[form]];
}
