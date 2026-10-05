import {ablateResearchPrinciples} from "./ablation";import {EngineIntent} from "./core";import {EvidenceObservation,PrincipleSignal} from "./grammar";
const intent:EngineIntent={seed:"ablation-test",meanings:["journey"],principleIds:["p1","p2"],product:{kind:"diary",zones:[{id:"cover",widthMm:148,heightMm:210,safeInsetMm:12,role:"hero"}]},density:"balanced",symmetry:"bilateral"};
const principles:PrincipleSignal[]=[{id:"p1",kind:"axis",label:"axis journey",confidence:.9,culturalAccess:"open"},{id:"p2",kind:"rhythm",label:"rhythm repeat band",confidence:.9,culturalAccess:"open"}];
const observations:EvidenceObservation[]=principles.flatMap((p,i)=>[{principleId:p.id,sourceId:`s${i}a`,confidence:.9,stance:"supports",culturalAccess:"open"},{principleId:p.id,sourceId:`s${i}b`,confidence:.9,stance:"supports",culturalAccess:"open"}]);
const results=ablateResearchPrinciples(intent,principles,observations);
if(results.length!==2)throw new Error("expected one ablation per principle");
if(results.some((x)=>x.principleId.length===0))throw new Error("missing principle id");
if(results.some((x)=>!Number.isFinite(x.scoreDelta)))throw new Error("invalid score delta");
