import type {Topology} from "./topology";

export type LearnedRelationPrior={
  relationWeights:Record<string,number>;
  preferredScaleRatio:number;
  mirrorStrength:number;
  repeatStrength:number;
  exploration:number;
  evidenceImages:number;
  sourceModel:string;
};

const clamp=(n:number)=>Math.max(0,Math.min(1,n));

export function normalizeRelationPrior(p:LearnedRelationPrior):LearnedRelationPrior{
  const weights=Object.fromEntries(Object.entries(p.relationWeights).map(([k,v])=>[k,Math.max(.01,Number(v)||.01)]));
  return {...p,relationWeights:weights,preferredScaleRatio:Math.max(.2,Math.min(3,p.preferredScaleRatio||1)),mirrorStrength:clamp(p.mirrorStrength),repeatStrength:clamp(p.repeatStrength),exploration:clamp(p.exploration)};
}

export function learnedRelationScore(t:Topology,prior?:LearnedRelationPrior){
  if(!prior||!t.edges.length)return 0;
  const p=normalizeRelationPrior(prior);
  let relation=0;
  for(const e of t.edges)relation+=Math.log1p(p.relationWeights[e.relation]??.05);
  relation/=t.edges.length;
  const repeatShare=t.edges.filter(e=>e.relation==="repeat"||e.relation==="flow"||e.relation==="return").length/t.edges.length;
  const mirrorProxy=t.edges.filter(e=>e.relation==="oppose"||e.relation==="enclose"||e.relation==="orbit").length/t.edges.length;
  let ratioFit=0,n=0;
  for(const e of t.edges){
    const a=t.nodes.find(x=>x.id===e.from),b=t.nodes.find(x=>x.id===e.to);if(!a||!b)continue;
    const r=b.scale/Math.max(.001,a.scale);
    ratioFit+=Math.exp(-Math.abs(Math.log(Math.max(.001,r/p.preferredScaleRatio))));n++;
  }
  ratioFit=n?ratioFit/n:0;
  return relation*4+(1-Math.abs(repeatShare-p.repeatStrength))*3+(1-Math.abs(mirrorProxy-p.mirrorStrength))*2+ratioFit*3;
}

export function weightedRelation(seed:number,relations:string[],prior?:LearnedRelationPrior){
  if(!prior)return relations[seed%relations.length]!;
  const p=normalizeRelationPrior(prior);
  const ws=relations.map(r=>Math.max(.01,p.relationWeights[r]??.04));
  const total=ws.reduce((a,b)=>a+b,0);
  let x=((seed>>>0)/4294967296)*total;
  for(let i=0;i<relations.length;i++){x-=ws[i]!;if(x<=0)return relations[i]!}
  return relations[relations.length-1]!;
}
