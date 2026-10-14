export type UserReferenceStudy={schema:'ascend.user-reference-study.v1';scope:'local-experimental-descriptor-fit';authorizationEvidence:string;sourceGroup:string;
 sources:{id:string;imagePath:string;imageSha256:string;width:number;height:number}[];
 crops:{id:string;sourceId:string;box:{left:number;top:number;width:number;height:number};observedApproaches:string[];reviewStatus:'draft-visual-study';originalSourceAttribution:string}[];limitations:string[]};
export function assertUserReferenceStudy(s:UserReferenceStudy){
 const fail=():never=>{throw new Error('user-study:invalid-manifest');};
 if(s.schema!=='ascend.user-reference-study.v1'||s.scope!=='local-experimental-descriptor-fit'||!s.authorizationEvidence?.trim()||!s.sourceGroup?.trim()
  ||!s.sources?.length||!s.crops?.length||!s.limitations?.length)fail();
 const sources=new Map(s.sources.map(e=>[e.id,e]));if(sources.size!==s.sources.length)fail();
 for(const e of s.sources)if(!e.id||!e.imagePath||! /^[a-f0-9]{64}$/.test(e.imageSha256)||!Number.isInteger(e.width)||!Number.isInteger(e.height)||e.width<2||e.height<2)fail();
 const ids=new Set<string>();
 for(const c of s.crops){
  const e=sources.get(c.sourceId),b=c.box;
  if(!c.id||ids.has(c.id)||!e||c.reviewStatus!=='draft-visual-study'||!c.originalSourceAttribution?.trim()
   ||!c.observedApproaches?.length||c.observedApproaches.some(t=>!t.trim())||![b.left,b.top,b.width,b.height].every(Number.isInteger)
   ||b.left<0||b.top<0||b.width<2||b.height<2||b.left+b.width>e!.width||b.top+b.height>e!.height)fail();
  ids.add(c.id);
 }
}
