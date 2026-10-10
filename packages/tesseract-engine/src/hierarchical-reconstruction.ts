export type ReconstructionPrimitive="axis"|"grid"|"circle"|"branch"|"medallion"|"border"|"field";
export type TransformRule="repeat"|"mirror"|"rotate"|"alternate"|"nest"|"interlock"|"branch"|"interrupt"|"scale";
export type ReconstructionNode={id:string;kind:ReconstructionPrimitive;level:"macro"|"meso"|"micro";parentId?:string;weight:number;transform?:{x:number;y:number;scale:number;rotation:number;mirror?:boolean}};
export type ReconstructionRelation={from:string;to:string;rule:TransformRule;period?:number;ratio?:number};
export type HierarchicalReconstruction={nodes:ReconstructionNode[];relations:ReconstructionRelation[];symmetry:"none"|"bilateral"|"radial"|"frieze"|"tessellated";negativeSpace:number;materialConstraint?:string;sourceIds:string[]};
export function validateReconstruction(r:HierarchicalReconstruction){
 if(!r.nodes.some(n=>n.level==="macro"))throw new Error("Reconstruction requires macro structure");
 if(!r.nodes.some(n=>n.level==="meso"))throw new Error("Reconstruction requires compound meso motifs");
 if(r.negativeSpace<0||r.negativeSpace>1)throw new Error("negativeSpace must be 0..1");
 const ids=new Set(r.nodes.map(n=>n.id));if(ids.size!==r.nodes.length)throw new Error("Duplicate reconstruction node");
 for(const e of r.relations)if(!ids.has(e.from)||!ids.has(e.to))throw new Error("Relation references unknown node");
 return r;
}
export function reconstructionConditioning(r:HierarchicalReconstruction){
 validateReconstruction(r);
 const levels={macro:r.nodes.filter(n=>n.level==="macro"),meso:r.nodes.filter(n=>n.level==="meso"),micro:r.nodes.filter(n=>n.level==="micro")};
 return {symmetry:r.symmetry,negativeSpace:r.negativeSpace,hierarchy:levels,operations:[...new Set(r.relations.map(x=>x.rule))],sourceIds:[...r.sourceIds],materialConstraint:r.materialConstraint};
}
