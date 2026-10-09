import type {Topology} from "./topology";
import type {DesignNicheId} from "./niches";

export type MediumId="embroidery"|"leather-tooling"|"emboss"|"print";
export type ProductionLimits={
 medium:MediumId;minFeatureMm:number;minGapMm:number;maxDensity:number;
 maxScaleLevels:number;maxContinuousMm:number;supportsCrossing:boolean;supportsFill:boolean;
};
export const DEFAULT_LIMITS:Record<MediumId,ProductionLimits>={
 embroidery:{medium:"embroidery",minFeatureMm:.8,minGapMm:.8,maxDensity:.78,maxScaleLevels:5,maxContinuousMm:180,supportsCrossing:true,supportsFill:true},
 "leather-tooling":{medium:"leather-tooling",minFeatureMm:1.5,minGapMm:1.8,maxDensity:.62,maxScaleLevels:4,maxContinuousMm:240,supportsCrossing:false,supportsFill:false},
 emboss:{medium:"emboss",minFeatureMm:1.2,minGapMm:1.4,maxDensity:.58,maxScaleLevels:4,maxContinuousMm:200,supportsCrossing:false,supportsFill:true},
 print:{medium:"print",minFeatureMm:.35,minGapMm:.35,maxDensity:.9,maxScaleLevels:6,maxContinuousMm:600,supportsCrossing:true,supportsFill:true}
};
export type ProductionAdaptation={topology:Topology;medium:MediumId;niche?:DesignNicheId;changes:string[];warnings:string[]};
export function adaptForProduction(t:Topology,medium:MediumId,niche?:DesignNicheId,limits=DEFAULT_LIMITS[medium]):ProductionAdaptation{
 const changes:string[]=[],warnings:string[]=[];let nodes=t.nodes.map(n=>({...n})),edges=t.edges.map(e=>({...e}));
 const scaleLevels=[...new Set(nodes.map(n=>n.scale))].sort((a,b)=>a-b);
 if(scaleLevels.length>limits.maxScaleLevels){const allowed=scaleLevels.slice(-limits.maxScaleLevels);nodes=nodes.map(n=>allowed.includes(n.scale)?n:{...n,scale:allowed[0]!});changes.push("compressed-scale-hierarchy");}
 if(!limits.supportsCrossing){
  // Use an open branching form while preserving the node's semantic identity.
  // Removing intersect edges alone leaves crossing primitives uncompilable.
  if(nodes.some(n=>n.form==="crossing")){
   nodes=nodes.map(n=>n.form==="crossing"?{...n,form:"bifurcation"}:n);
   changes.push("replaced-unsupported-crossing-forms");
  }
  const before=edges.length;edges=edges.filter(e=>e.relation!=="intersect");if(edges.length<before)changes.push("removed-unsupported-crossings");
 }
 const density=(nodes.length+edges.length)/Math.max(1,nodes.length*3);
 if(density>limits.maxDensity){const target=Math.max(nodes.length-1,Math.floor(nodes.length*3*limits.maxDensity)-nodes.length);edges=edges.slice(0,target);changes.push("reduced-edge-density");}
 if(nodes.length>1&&edges.length===0){warnings.push("production-adaptation-disconnected-graph");}
 return {topology:{nodes,edges},medium,niche,changes,warnings};
}
