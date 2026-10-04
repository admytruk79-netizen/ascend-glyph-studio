import { ScoredCandidate } from "./candidates";
export interface CompositionMetrics{negativeSpace:number;hierarchy:number;balance:number;rhythm:number;complexity:number;score:number}
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function analyzeComposition(c:ScoredCandidate):CompositionMetrics{
 const fs=c.zones.flatMap(z=>z.features),n=Math.max(1,fs.length),counts=new Map<string,number>();for(const f of fs)counts.set(f.primitive,(counts.get(f.primitive)??0)+1);
 const kinds=counts.size,dominant=Math.max(...counts.values(),0)/n;
 const complexity=clamp((kinds/7)*.55+(n/28)*.45);
 const negativeSpace=clamp(1-c.metrics.coverage);
 const hierarchy=clamp(.55+Math.abs(dominant-.45)*-.7+(counts.has("axis")?.2:0));
 const balance=clamp(.45+(counts.has("axis")?.2:0)+(counts.has("enclosure")?.15:0)+(counts.has("branch")?.1:0));
 const rhythmic=(counts.get("pulse")??0)+(counts.get("band")??0)+(counts.get("step")??0)+(counts.get("meander")??0);
 const rhythm=clamp(.35+Math.min(.65,rhythmic/n));
 const targetComplexity=.52,complexityFit=1-Math.abs(complexity-targetComplexity);
 const score=clamp(negativeSpace*.24+hierarchy*.22+balance*.2+rhythm*.18+complexityFit*.16);
 return{negativeSpace:Number(negativeSpace.toFixed(4)),hierarchy:Number(hierarchy.toFixed(4)),balance:Number(balance.toFixed(4)),rhythm:Number(rhythm.toFixed(4)),complexity:Number(complexity.toFixed(4)),score:Number(score.toFixed(4))}
}
