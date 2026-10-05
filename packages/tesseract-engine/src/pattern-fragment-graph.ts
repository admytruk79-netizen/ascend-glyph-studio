export type FragmentKind="node"|"edge"|"junction"|"repeat"|"void"|"boundary";
export interface PatternPoint{x:number;y:number}
export interface PatternFragment{id:string;kind:FragmentKind;points:PatternPoint[];parentIds:string[];relation?:string;weight:number}
export interface PatternInstanceRecord{instanceId:string;sourceId:string;objectId?:string;tradition?:string;sourceUrl:string;rights?:string;fragments:PatternFragment[];reconstruction:string[];featureHash:string}
const q=(n:number)=>Math.round(n*10000)/10000;
const h=(s:string)=>{let x=2166136261;for(let i=0;i<s.length;i++)x=Math.imul(x^s.charCodeAt(i),16777619);return(x>>>0).toString(16).padStart(8,"0")};
/** Decomposes normalized vector paths into topology-preserving fragments. This stores analysis, not copied source artwork. */
export function decomposePolyline(id:string,points:PatternPoint[]):PatternFragment[]{if(points.length<2)return[];const out:PatternFragment[]=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];out.push({id:`${id}:e${i}`,kind:"edge",points:[{x:q(a.x),y:q(a.y)},{x:q(b.x),y:q(b.y)}],parentIds:[id],weight:1})}return out}
export function buildPatternInstance(input:Omit<PatternInstanceRecord,"featureHash">):PatternInstanceRecord{const canonical=JSON.stringify(input.fragments.map(f=>[f.kind,f.points,f.parentIds,f.relation,f.weight]));return{...input,featureHash:h(canonical)}}
export function reconstructFragments(record:PatternInstanceRecord):PatternFragment[]{const byId=new Map(record.fragments.map(f=>[f.id,f]));return record.reconstruction.map(id=>byId.get(id)).filter((x):x is PatternFragment=>!!x)}
export function mutateFragment(f:PatternFragment,seed:number,amount=.08):PatternFragment{const wobble=(n:number,i:number)=>q(n+((((seed+i*1103515245)>>>8)%2001)/1000-1)*amount);return{...f,id:`${f.id}:m${seed}`,points:f.points.map((p,i)=>({x:wobble(p.x,i*2),y:wobble(p.y,i*2+1)}))}}
