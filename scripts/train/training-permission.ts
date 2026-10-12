export type TrainingPermissionEntry={id:string;source:string;sourceGroup:string;imageSha256:string;
 imagePath?:string;annotationPath?:string;
 permission:{status:'approved';scope:'local-reference-model-experiment';basis:'CC0'|'public-domain-us'|'owned-authorized';evidence:string}};
export type TrainingPermissionManifest={schema:'ascend.training-permission-manifest.v1';entries:TrainingPermissionEntry[]};
export function trainingPermissions(value:TrainingPermissionManifest){
 if(value.schema!=='ascend.training-permission-manifest.v1'||!Array.isArray(value.entries)||!value.entries.length)throw new Error('training:permission-manifest');
 const out=new Map<string,TrainingPermissionEntry>();
 for(const e of value.entries){
  if(!e.id?.trim()||out.has(e.id)||!e.source?.trim()||!e.sourceGroup?.trim()||! /^[a-f0-9]{64}$/.test(e.imageSha256)
   ||e.permission?.status!=='approved'||e.permission.scope!=='local-reference-model-experiment'
   ||!['CC0','public-domain-us','owned-authorized'].includes(e.permission.basis)||!e.permission.evidence?.trim())throw new Error('training:permission-entry');
  out.set(e.id,structuredClone(e));
 }
 return out;
}
export function requireTrainingSource(permissions:Map<string,TrainingPermissionEntry>,id:string,imageSha256?:string){
 const entry=permissions.get(id);if(!entry)throw new Error('training:source-not-approved:'+id);
 if(imageSha256!==undefined&&imageSha256!==entry.imageSha256)throw new Error('training:source-hash-mismatch:'+id);
 return entry;
}
export function trainingRecordEligible(row:{id?:string;source?:string;culturalAccess?:string;split?:string},permissions:Map<string,TrainingPermissionEntry>){
 return !!row.id&&permissions.has(row.id)&&typeof row.source==='string'&&!!row.source.trim()
  &&row.culturalAccess==='open'&&row.split==='train';
}
