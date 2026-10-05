import{describe,it,expect}from"vitest";
import{appendLedgerEvent,createProvenancePassport,verifyLedger}from"../src/event-ledger";

describe("tamper-evident event ledger",()=>{
 it("chains operational events and verifies provenance",()=>{
  const a=appendLedgerEvent([],{streamId:"order:1",eventType:"design-locked",at:"2026-10-05T00:00:00Z",actorId:"customer:1",payload:{design:"d1"}});
  const b=appendLedgerEvent([a],{streamId:"order:1",eventType:"manufacturer-accepted",at:"2026-10-06T00:00:00Z",actorId:"manufacturer:1",payload:{job:"wo1"}});
  expect(verifyLedger([a,b])).toEqual({valid:true});
  const p=createProvenancePassport([a,b]);
  expect(p.valid).toBe(true);expect(p.eventCount).toBe(2);expect(p.headHash).toMatch(/^[a-f0-9]{64}$/);
 });
 it("detects payload tampering",()=>{
  const a=appendLedgerEvent([],{streamId:"order:1",eventType:"qc-passed",at:"2026-10-05",actorId:"qc:1",payload:{result:"pass"}});
  const bad={...a,payload:{result:"fail"}};
  expect(verifyLedger([bad])).toEqual({valid:false,index:0,reason:"hash-mismatch"});
 });
 it("rejects mixed streams",()=>{
  const a=appendLedgerEvent([],{streamId:"order:1",eventType:"created",at:"x",actorId:"a",payload:{}});
  expect(()=>appendLedgerEvent([a],{streamId:"order:2",eventType:"created",at:"x",actorId:"a",payload:{}})).toThrow("ledger stream mismatch");
 });
});
