export type ObjectiveVector={
 meaning:number;novelty:number;culturalIntegrity:number;manufacturability:number;
 visualIdentity:number;physicalConfidence:number;genericResistance:number;
};
export type ParetoCandidate<T>={item:T;objectives:ObjectiveVector;front?:number;crowding?:number};
const keys=(): (keyof ObjectiveVector)[]=>["meaning","novelty","culturalIntegrity","manufacturability","visualIdentity","physicalConfidence","genericResistance"];
export function dominates(a:ObjectiveVector,b:ObjectiveVector){
 let better=false;for(const k of keys()){if(a[k]<b[k])return false;if(a[k]>b[k])better=true}return better;
}
export function paretoFronts<T>(xs:ParetoCandidate<T>[]){
 const left=[...xs],fronts:ParetoCandidate<T>[][]=[];let rank=0;
 while(left.length){const front=left.filter(a=>!left.some(b=>a!==b&&dominates(b.objectives,a.objectives)));for(const x of front)x.front=rank;fronts.push(front);const set=new Set(front);for(let i=left.length-1;i>=0;i--)if(set.has(left[i]!))left.splice(i,1);rank++;}
 return fronts;
}
export function crowdingDistance<T>(front:ParetoCandidate<T>[]){
 for(const x of front)x.crowding=0;if(front.length<3){for(const x of front)x.crowding=Infinity;return front}
 for(const k of keys()){const s=[...front].sort((a,b)=>a.objectives[k]-b.objectives[k]),lo=s[0]!.objectives[k],hi=s.at(-1)!.objectives[k];s[0]!.crowding=Infinity;s.at(-1)!.crowding=Infinity;if(hi===lo)continue;for(let i=1;i<s.length-1;i++)if(Number.isFinite(s[i]!.crowding!))s[i]!.crowding!+=(s[i+1]!.objectives[k]-s[i-1]!.objectives[k])/(hi-lo)}
 return front;
}
export function paretoSelect<T>(xs:ParetoCandidate<T>[],keep:number){
 const out:ParetoCandidate<T>[]=[];for(const f of paretoFronts(xs)){crowdingDistance(f);f.sort((a,b)=>(b.crowding??0)-(a.crowding??0));for(const x of f){if(out.length>=keep)return out;out.push(x)}}return out;
}
