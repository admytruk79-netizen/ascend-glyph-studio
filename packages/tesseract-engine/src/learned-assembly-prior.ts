import type {Topology} from "./topology";

export type LearnedAssemblyPrior={
  hierarchyStrength:number;
  adjacencyDensity:number;
  axialBias:number;
  diagonalBias:number;
  repeatRegularity:number;
  repeatGap:number;
  scaleRatioMedian:number;
  scaleRatioSpread:number;
  evidencePairs:number;
  evidenceBricks:number;
  sourceModel:string;
};

const clamp=(n:number)=>Math.max(0,Math.min(1,n));

export function normalizeAssemblyPrior(p:LearnedAssemblyPrior):LearnedAssemblyPrior{
 return {
  ...p,
  hierarchyStrength:clamp(p.hierarchyStrength),
  adjacencyDensity:clamp(p.adjacencyDensity),
  axialBias:clamp(p.axialBias),
  diagonalBias:clamp(p.diagonalBias),
  repeatRegularity:clamp(p.repeatRegularity),
  repeatGap:Math.max(.01,Math.min(2,p.repeatGap||.15)),
  scaleRatioMedian:Math.max(.2,Math.min(5,p.scaleRatioMedian||1)),
  scaleRatioSpread:Math.max(.01,Math.min(3,p.scaleRatioSpread||.35)),
  evidencePairs:Math.max(0,p.evidencePairs||0),
  evidenceBricks:Math.max(0,p.evidenceBricks||0)
 };
}

/**
 * Scores only abstract construction behavior learned from the corpus.
 * It never imports historical motif geometry or semantic claims.
 */
export function learnedAssemblyScore(t:Topology,prior?:LearnedAssemblyPrior):number{
 if(!prior||!t.nodes.length)return 0;
 const p=normalizeAssemblyPrior(prior);
 const scales=t.nodes.map(n=>Math.max(.2,n.scale));
 const max=Math.max(...scales),min=Math.min(...scales);
 const hierarchy=clamp((max/min-1)/3);
 const edgeDensity=clamp(t.edges.length/Math.max(1,t.nodes.length*1.8));
 const axial=t.edges.filter(e=>["flow","ascend","anchor","return"].includes(e.relation)).length/Math.max(1,t.edges.length);
 const diagonal=t.edges.filter(e=>["branch","transform","oppose","intersect"].includes(e.relation)).length/Math.max(1,t.edges.length);
 const repeat=t.edges.filter(e=>["repeat","flow","return"].includes(e.relation)).length/Math.max(1,t.edges.length);
 let ratioFit=0,n=0;
 for(const e of t.edges){
  const a=t.nodes.find(x=>x.id===e.from),b=t.nodes.find(x=>x.id===e.to);if(!a||!b)continue;
  const r=Math.max(.01,b.scale/Math.max(.01,a.scale));
  const z=Math.abs(Math.log(r/p.scaleRatioMedian))/Math.max(.05,p.scaleRatioSpread);
  ratioFit+=Math.exp(-z);n++;
 }
 ratioFit=n?ratioFit/n:0;
 return (1-Math.abs(hierarchy-p.hierarchyStrength))*3
  +(1-Math.abs(edgeDensity-p.adjacencyDensity))*2
  +(1-Math.abs(axial-p.axialBias))*2
  +(1-Math.abs(diagonal-p.diagonalBias))*1.5
  +(1-Math.abs(repeat-p.repeatRegularity))*1.5
  +ratioFit*3;
}
