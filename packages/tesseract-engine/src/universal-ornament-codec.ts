export type SemanticAtom={id:number;concept:string};
export type UniversalMessage={v:1;subject:number;predicate:number;object:number;qualifiers?:number[]};
export type OrnamentCarrier={family:"rosette"|"branch"|"diamond"|"meander"|"seed"|"ring"|"petal"|"hook";rotation:0|90|180|270;scale:0|1|2;mirror:boolean};
const FAMILIES:OrnamentCarrier["family"][]=["rosette","branch","diamond","meander","seed","ring","petal","hook"];
export function packMessage(m:UniversalMessage){const bytes=[m.v,m.subject>>8,m.subject&255,m.predicate>>8,m.predicate&255,m.object>>8,m.object&255,...(m.qualifiers??[]).flatMap(x=>[x>>8,x&255])];let parity=0;for(const b of bytes)parity^=b;return Uint8Array.from([...bytes,parity])}
export function unpackMessage(b:Uint8Array):UniversalMessage|null{if(b.length<8)return null;let p=0;for(let i=0;i<b.length-1;i++)p^=b[i]!;if(p!==b[b.length-1])return null;const q:number[]=[];for(let i=7;i<b.length-1;i+=2)q.push((b[i]!<<8)|(b[i+1]??0));return{v:1,subject:(b[1]!<<8)|b[2]!,predicate:(b[3]!<<8)|b[4]!,object:(b[5]!<<8)|b[6]!,qualifiers:q.length?q:undefined}}
export function bytesToCarriers(bytes:Uint8Array){const out:OrnamentCarrier[]=[];for(const byte of bytes){out.push({family:FAMILIES[(byte>>5)&7]!,rotation:([0,90,180,270]as const)[(byte>>3)&3]!,scale:(byte>>1&3)%3 as 0|1|2,mirror:Boolean(byte&1)})}return out}
export const CORE_ATOMS:SemanticAtom[]=[{id:1,concept:"speaker"},{id:2,concept:"recipient"},{id:100,concept:"love"},{id:101,concept:"friendship"},{id:102,concept:"gratitude"},{id:103,concept:"protection"},{id:104,concept:"remembrance"},{id:105,concept:"welcome"}];
export const I_LOVE_YOU:UniversalMessage={v:1,subject:1,predicate:100,object:2};
