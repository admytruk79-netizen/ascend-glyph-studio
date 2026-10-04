import type {Topology} from "./topology";
import {DESIGN_NICHES,nicheFitness,type DesignNicheId} from "./niches";
export type NicheAssignment={primary:DesignNicheId;fitness:number;alternates:{id:DesignNicheId;fitness:number}[]};
export function assignNiche(t:Topology,allowed?:DesignNicheId[]):NicheAssignment{
 const ids=allowed?.length?allowed:Object.keys(DESIGN_NICHES) as DesignNicheId[];
 const scored=ids.map(id=>({id,fitness:nicheFitness(t,DESIGN_NICHES[id])})).sort((a,b)=>b.fitness-a.fitness);
 return {primary:scored[0]!.id,fitness:scored[0]!.fitness,alternates:scored.slice(1,4)};
}
export function nicheDiversity<T extends {t:Topology;score:number}>(xs:T[],keep:number){
 const buckets=new Map<DesignNicheId,T[]>();for(const x of xs){const n=assignNiche(x.t).primary,a=buckets.get(n)??[];a.push(x);buckets.set(n,a)}
 for(const a of buckets.values())a.sort((x,y)=>y.score-x.score);
 const out:T[]=[];let i=0;while(out.length<keep&&[...buckets.values()].some(a=>a.length>i)){for(const a of buckets.values()){if(a[i])out.push(a[i]!);if(out.length>=keep)break}i++}return out;
}
