import {createHash} from "node:crypto";

export interface LedgerEvent<T=unknown>{
 index:number;
 streamId:string;
 eventType:string;
 at:string;
 actorId:string;
 payload:T;
 previousHash:string;
 hash:string;
}

const GENESIS="0".repeat(64);

function canonical(value:unknown):string{
 if(value===null||typeof value!=="object")return JSON.stringify(value);
 if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
 const obj=value as Record<string,unknown>;
 return "{"+Object.keys(obj).sort().map(k=>JSON.stringify(k)+":"+canonical(obj[k])).join(",")+"}";
}
function sha256(s:string){return createHash("sha256").update(s,"utf8").digest("hex");}
function eventDigest(e:Omit<LedgerEvent,"hash">){
 return sha256(canonical(e));
}

export function appendLedgerEvent<T>(ledger:readonly LedgerEvent[],input:{
 streamId:string;eventType:string;at:string;actorId:string;payload:T;
}):LedgerEvent<T>{
 const previous=ledger.at(-1);
 if(previous&&previous.streamId!==input.streamId)throw new Error("ledger stream mismatch");
 const unsigned={
  index:ledger.length,
  streamId:input.streamId,
  eventType:input.eventType,
  at:input.at,
  actorId:input.actorId,
  payload:input.payload,
  previousHash:previous?.hash??GENESIS
 };
 return Object.freeze({...unsigned,hash:eventDigest(unsigned)});
}

export function verifyLedger(ledger:readonly LedgerEvent[]):{valid:true}|{valid:false;index:number;reason:string}{
 for(let i=0;i<ledger.length;i++){
  const e=ledger[i]!;
  if(e.index!==i)return{valid:false,index:i,reason:"index-mismatch"};
  const expectedPrev=i===0?GENESIS:ledger[i-1]!.hash;
  if(e.previousHash!==expectedPrev)return{valid:false,index:i,reason:"previous-hash-mismatch"};
  const {hash,...unsigned}=e;
  if(hash!==eventDigest(unsigned))return{valid:false,index:i,reason:"hash-mismatch"};
 }
 return{valid:true};
}

export function ledgerHead(ledger:readonly LedgerEvent[]){return ledger.at(-1)?.hash??GENESIS;}

export interface ProvenancePassport{
 streamId:string;
 eventCount:number;
 headHash:string;
 firstEventAt?:string;
 lastEventAt?:string;
 valid:boolean;
 timeline:ReadonlyArray<{index:number;eventType:string;at:string;actorId:string;hash:string}>;
}
export function createProvenancePassport(ledger:readonly LedgerEvent[]):ProvenancePassport{
 const verification=verifyLedger(ledger);
 return Object.freeze({
  streamId:ledger[0]?.streamId??"",
  eventCount:ledger.length,
  headHash:ledgerHead(ledger),
  firstEventAt:ledger[0]?.at,
  lastEventAt:ledger.at(-1)?.at,
  valid:verification.valid,
  timeline:Object.freeze(ledger.map(e=>Object.freeze({index:e.index,eventType:e.eventType,at:e.at,actorId:e.actorId,hash:e.hash})))
 });
}
