import type {LoomPlan} from "./loom-program";
/** Exact decomposition of binary loom lifts into a traditional shaft draft.
 * Threads with identical lift histories can share a shaft; unique pick states
 * are encoded as treadles. No industrial loom compatibility is implied.
 */
export type ShaftDraft={shafts:number;ends:number;picks:number;threading:number[];tieUp:string[];treadling:number[];drawdown:string[];exact:boolean;errors:string[]};
export function liftPlanToShaftDraft(plan:Pick<LoomPlan,"ends"|"picks"|"liftRows">,maxShafts=16,maxTreadles=32):ShaftDraft{
 if(!Number.isInteger(plan.ends)||plan.ends<2||!Number.isInteger(plan.picks)||plan.picks<2||plan.liftRows.length!==plan.picks||plan.liftRows.some(row=>row.length!==plan.ends||!/^[01]+$/.test(row)))throw new Error("invalid-loom-lift-plan");
 const signatures=new Map<string,number>(),threading:number[]=[];
 for(let x=0;x<plan.ends;x++){const sig=plan.liftRows.map(row=>row[x]).join("");if(!signatures.has(sig))signatures.set(sig,signatures.size);threading.push(signatures.get(sig)!);}
 const shafts=signatures.size,tieUp:string[]=[],treadling:number[]=[],treadles=new Map<string,number>();
 for(const row of plan.liftRows){
  const state=Array.from({length:shafts},(_,s)=>row[threading.indexOf(s)]!).join("");
  if(!treadles.has(state)){treadles.set(state,tieUp.length);tieUp.push(state);}
  treadling.push(treadles.get(state)!);
 }
 const drawdown=treadling.map(t=>threading.map(s=>tieUp[t]![s]).join(""));
 const errors:string[]=[];
 if(shafts>maxShafts)errors.push("shaft-limit-exceeded");
 if(tieUp.length>maxTreadles)errors.push("treadle-limit-exceeded");
 if(drawdown.some((row,i)=>row!==plan.liftRows[i]))errors.push("draft-roundtrip-mismatch");
 return {shafts,ends:plan.ends,picks:plan.picks,threading,tieUp,treadling,drawdown,exact:errors.length===0,errors};
}
