import type {MotifGrammar,MotifRole,MotifRelation} from "./motif-grammar";
export type DetectedMotif={id:string;familyId:string;role:MotifRole;silhouette:string;aspect:number;x01:number;y01:number;scale:number;rotationDeg:number;mirrorX:boolean;layer:number;confidence:number};
export type DetectedRelation={from:string;to:string;relation:MotifRelation;weight:number};
export type ImageDecomposition={imageId:string;sourceRef:string;motifs:DetectedMotif[];relations:DetectedRelation[];confidence:number};
export function detectedMotifsToGrammar(d:ImageDecomposition):MotifGrammar{
 const best=new Map<string,DetectedMotif>();
 for(const m of d.motifs)if(!best.has(m.familyId)||(best.get(m.familyId)!.confidence<m.confidence))best.set(m.familyId,m);
 return {id:"image:"+d.imageId,sourceIds:[d.imageId,d.sourceRef],confidence:d.confidence,
  parts:[...best.values()].map(m=>({id:"part:"+m.familyId,familyId:m.familyId,role:m.role,geometry:{silhouette:m.silhouette,aspect:m.aspect},sourceIds:[d.imageId],confidence:m.confidence,invariants:{preserveSilhouette:true,preserveHoles:true,allowedTransforms:["translate","scale","rotate","mirror"]},tags:[]})),
  instances:d.motifs.map(m=>({id:m.id,partId:"part:"+m.familyId,x01:m.x01,y01:m.y01,scale:m.scale,rotationDeg:m.rotationDeg,mirrorX:m.mirrorX,layer:m.layer})),
  links:d.relations.map(r=>({...r})),repeatCells:[]};
}
