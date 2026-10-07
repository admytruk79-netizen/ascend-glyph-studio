import type {ImageObservation} from "./image-corpus";
import type {VisualFeatureVector} from "./visual-features";
import {observationVector,visualDistance} from "./visual-features";

export type CorpusCanonicalGeometry={
 id:string;version:"corpus-canonical/0.1";viewBox:"0 0 100 100";paths:string[];
 centroid:VisualFeatureVector;support:number;traditions:string[];sources:string[];
 nearestReferenceDistance:number;status:"candidate"|"canonical";provenance:{observationIds:string[]};
};

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const keys: (keyof VisualFeatureVector)[]=[
 "symmetry","density","voidRatio","scaleLevels","vertical","horizontal","radial","field","wrap","branching","repetition","interruption","closure",
 "densityVariation","directionalEntropy","axisStrength","rotation180","periodicity","focalDominance","asymmetryBalance","motifFieldRatio","compositionalDepth","embroideryComplexity"
];
const zero=()=>Object.fromEntries(keys.map(k=>[k,0])) as VisualFeatureVector;
function mean(vs:VisualFeatureVector[]):VisualFeatureVector{
 const out=zero(); if(!vs.length)return out;
 for(const v of vs)for(const k of keys)out[k]+=v[k]/vs.length;
 return out;
}
function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seededFarthest(vs:VisualFeatureVector[],k:number){
 if(!vs.length)return [] as number[];
 const seeds=[hash(String(vs.length))%vs.length];
 while(seeds.length<Math.min(k,vs.length)){
  let best=-1,bd=-1;
  for(let i=0;i<vs.length;i++){if(seeds.includes(i))continue;const d=Math.min(...seeds.map(s=>visualDistance(vs[i]!,vs[s]!)));if(d>bd){bd=d;best=i}}
  if(best<0)break;seeds.push(best);
 }
 return seeds;
}
function cluster(vs:VisualFeatureVector[],k:number,iters=10){
 let centers=seededFarthest(vs,k).map(i=>vs[i]!);
 let assign=new Array(vs.length).fill(0);
 for(let it=0;it<iters;it++){
  assign=vs.map(v=>{let b=0,bd=Infinity;for(let j=0;j<centers.length;j++){const d=visualDistance(v,centers[j]!);if(d<bd){bd=d;b=j}}return b});
  centers=centers.map((c,j)=>{const m=vs.filter((_,i)=>assign[i]===j);return m.length?mean(m):c});
 }
 return {centers,assign};
}
function srcOf(o:ImageObservation){return o.sourceRef||o.provenance||o.id}
function traditionOf(o:ImageObservation){return String(o.tradition??o.notes?.[1]??"unknown")}
function p(n:number){return Number(n.toFixed(2))}
function geometryFrom(v:VisualFeatureVector,seed:number):string[]{
 const paths:string[]=[];
 const cx=50+(v.asymmetryBalance-.5)*18,cy=50+(v.focalDominance-.5)*8;
 const span=24+v.scaleLevels*22,open=8+v.voidRatio*20,amp=8+v.densityVariation*18;
 // dominant axis
 if(v.axisStrength>.32)paths.push(`M${p(cx)} ${p(10+open*.3)} C${p(cx-amp*.18)} 34 ${p(cx+amp*.16)} 66 ${p(cx)} ${p(90-open*.15)}`);
 // enclosure / orbit
 if(v.closure>.28||v.radial>.35){
  const rx=18+v.compositionalDepth*18,ry=14+v.motifFieldRatio*20;
  paths.push(`M${p(cx-rx)} ${p(cy)} C${p(cx-rx*.8)} ${p(cy-ry)} ${p(cx+rx*.55)} ${p(cy-ry*1.1)} ${p(cx+rx)} ${p(cy-open*.08)} C${p(cx+rx*.75)} ${p(cy+ry)} ${p(cx-rx*.6)} ${p(cy+ry*.15)} ${p(cx-rx*.25)} ${p(cy+open*.18)}`);
 }
 // branching
 if(v.branching>.18||v.directionalEntropy>.58){
  const y=58-v.focalDominance*12;
  paths.push(`M${p(cx)} ${p(y+24)} C${p(cx-2)} ${p(y+10)} ${p(cx-3)} ${p(y)} ${p(cx)} ${p(y-8)}`);
  paths.push(`M${p(cx)} ${p(y+4)} C${p(cx-12)} ${p(y-2)} ${p(cx-span*.55)} ${p(y-amp*.55)} ${p(cx-span)} ${p(y-amp)}`);
  paths.push(`M${p(cx+1)} ${p(y-1)} C${p(cx+10)} ${p(y-7)} ${p(cx+span*.55)} ${p(y-amp*.3)} ${p(cx+span*.88)} ${p(y-amp*.8)}`);
 }
 // crossing / interruption
 if(v.interruption>.22||v.directionalEntropy>.48){
  const skew=(seed%11)-5;
  paths.push(`M${p(18+skew)} 28 C38 41 62 59 ${p(82-skew)} 76`);
  if(v.asymmetryBalance>.42)paths.push(`M${p(78+skew*.3)} 20 C61 39 42 63 ${p(20-skew*.3)} 84`);
 }
 // periodic flow, deliberately non-periodic in final form
 if(v.repetition>.25||v.periodicity>.25){
  const y=30+((seed>>>4)%35);
  paths.push(`M12 ${y} Q28 ${p(y-amp*.45)} 43 ${p(y+amp*.18)} T72 ${p(y-amp*.22)} T90 ${p(y+amp*.1)}`);
 }
 // radial emission
 if(v.radial>.42){
  const rays=4+Math.round(v.directionalEntropy*4);
  for(let i=0;i<rays;i++){const a=(i/rays)*Math.PI*2+((seed%17)/17)*.35,r=18+((i*7+seed)%11);paths.push(`M${p(cx)} ${p(cy)} L${p(cx+Math.cos(a)*r)} ${p(cy+Math.sin(a)*r)}`)}
 }
 // explicit void/open ending
 if(v.voidRatio>.45)paths.push(`M16 88 C30 ${p(82-amp*.2)} 38 84 46 86 M58 86 C69 83 78 ${p(80+amp*.15)} 88 72`);
 return paths.length?paths:[`M18 52 C34 24 67 22 84 48 C70 76 38 82 18 52`];
}
export function deriveCorpusCanon(observations:ImageObservation[],options:{count?:number;minTraditions?:number;minSources?:number;minSupport?:number;minReferenceDistance?:number}={}):CorpusCanonicalGeometry[]{
 const eligible=observations.filter(o=>o.verifiedReal&&o.trainingUse!=="negative-example");
 const vectors=eligible.map(observationVector),count=Math.max(4,Math.min(options.count??16,32));
 const {centers,assign}=cluster(vectors,count);
 const out:CorpusCanonicalGeometry[]=[];
 for(let j=0;j<centers.length;j++){
  const members=eligible.filter((_,i)=>assign[i]===j),center=centers[j]!;
  const traditions=[...new Set(members.map(traditionOf).filter(x=>x!=="unknown"))];
  const sources=[...new Set(members.map(srcOf))];
  const nearest=Math.min(...eligible.map(o=>visualDistance(center,observationVector(o))));
  const minT=options.minTraditions??4,minS=options.minSources??8,minN=options.minSupport??24,minD=options.minReferenceDistance??.035;
  const status=members.length>=minN&&traditions.length>=minT&&sources.length>=minS&&nearest>=minD?"canonical":"candidate";
  out.push({
   id:`corpus-canonical-${String(j+1).padStart(2,"0")}`,version:"corpus-canonical/0.1",viewBox:"0 0 100 100",
   paths:geometryFrom(center,hash(members.map(x=>x.id).slice(0,64).join("|"))),centroid:center,support:members.length,traditions,sources,
   nearestReferenceDistance:nearest,status,provenance:{observationIds:members.slice(0,128).map(x=>x.id)}
  });
 }
 return out.sort((a,b)=>(b.status==="canonical"?1:0)-(a.status==="canonical"?1:0)||b.support-a.support);
}
