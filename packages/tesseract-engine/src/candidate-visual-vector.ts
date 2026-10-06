import type {Topology} from "./topology";
import type {VisualFeatureVector} from "./visual-features";
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function topologyVisualVector(t:Topology):VisualFeatureVector{
 const n=Math.max(1,t.nodes.length),e=Math.max(1,t.edges.length),rels=t.edges.map(x=>x.relation);
 const count=(xs:string[])=>rels.filter(r=>xs.includes(r)).length/e,scales=new Set(t.nodes.map(x=>x.scale)).size;
 const branching=count(["branch","radiate"]),repetition=count(["repeat"]),interruption=count(["terminate","oppose","intersect"]),closure=count(["return","enclose","orbit"]);
 const relationDiversity=new Set(rels).size/Math.max(1,rels.length),scaleRatio=Math.min(1,scales/6),edgeRatio=Math.min(1,e/(n*2.5));
 const symmetry=clamp(.55-interruption*.28+repetition*.2+closure*.08),voidRatio=clamp(.58-edgeRatio*.42),density=clamp((n+e)/(n*3));
 const densityVariation=clamp(relationDiversity*.65+scaleRatio*.35),directionalEntropy=clamp(relationDiversity*.7+branching*.3),axisStrength=clamp(count(["ascend","anchor","bridge"]));
 const periodicity=clamp(repetition*.75+closure*.15),focalDominance=clamp(scaleRatio*.6+(1-repetition)*.25+branching*.15),asymmetryBalance=clamp((1-symmetry)*.55+interruption*.3+relationDiversity*.15);
 const motifFieldRatio=clamp((branching+closure+count(["intersect","oppose"]))/3),compositionalDepth=clamp(scaleRatio*.4+relationDiversity*.3+branching*.2+interruption*.1);
 const embroideryComplexity=clamp(density*.25+branching*.2+closure*.15+scaleRatio*.2+relationDiversity*.2);
 return {symmetry,density,voidRatio,scaleLevels:scaleRatio,vertical:count(["ascend","anchor"]),horizontal:count(["bridge","oppose"]),radial:count(["radiate"]),field:count(["enclose","orbit"]),wrap:closure,
 branching,repetition,interruption,closure,densityVariation,directionalEntropy,axisStrength,rotation180:clamp(symmetry*.7+closure*.3),periodicity,focalDominance,asymmetryBalance,motifFieldRatio,compositionalDepth,embroideryComplexity};
}
