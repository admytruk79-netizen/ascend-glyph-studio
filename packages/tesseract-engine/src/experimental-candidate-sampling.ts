/**
 * Diagnostic sampling ONLY: reserve a small number of structurally valid,
 * real branch/leaf compositions in an opt-in evaluation batch. This changes
 * neither their score nor their raster/manufacturing acceptance criteria.
 * Production selection must not use this experimental override.
 */
export function reserveBranchLeafDiagnosticCandidates<
 T extends {id:string;score:number;productionObjects?:readonly {branchLeaf?:unknown}[]}
>(selected:readonly T[],validCandidates:readonly T[],maxCount:number,reserve=2):T[]{
 const hasCluster=(x:T)=>x.productionObjects?.some(o=>o.branchLeaf!==undefined)===true;
 const max=Math.max(0,Math.floor(maxCount));
 if(max===0)return [];
 const kept=[...selected.slice(0,max)];
 const needed=Math.max(0,Math.min(reserve,max)-kept.filter(hasCluster).length);
 if(!needed)return kept;
 const chosenIds=new Set(kept.map(x=>x.id));
 const extras=validCandidates.filter(x=>hasCluster(x)&&!chosenIds.has(x.id))
  .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
  .slice(0,needed);
 if(!extras.length)return kept;
 const free=Math.max(0,max-kept.length);
 const replace=Math.max(0,extras.length-free);
 const removable=kept.filter(x=>!hasCluster(x))
  .sort((a,b)=>a.score-b.score||b.id.localeCompare(a.id));
 const removed=new Set(removable.slice(0,replace).map(x=>x.id));
 const result=kept.filter(x=>!removed.has(x.id));
 for(const x of extras){
  if(result.length>=max)break;
  result.push(x);
 }
 return result;
}
