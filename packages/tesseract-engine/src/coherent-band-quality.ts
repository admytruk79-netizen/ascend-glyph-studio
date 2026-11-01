import type {Topology} from "./topology";
import {primitiveForForm} from "./ascend-primitives";
import {renderCoherentBand,type BandGrammar,type BandOptions,type BandResult} from "./coherent-band";

export type CompositionAssessment={
 score:number;
 accepted:boolean;
 reasons:string[];
 metrics:{distinctMotifs:number;motifCount:number;sourceVerifiedFraction:number;grammarIntegrity:boolean;density:number};
};
/** Structural gate only. It is NOT a learned aesthetic judge or manufacturing approval. */
export function assessCoherentBand(topology:Topology,output:BandResult,grammar:BandGrammar,width=1200,height=240):CompositionAssessment{
 const forms=new Set(topology.nodes.filter(n=>primitiveForForm(n.form)).map(n=>n.form));
 const primitives=[...forms].map(f=>primitiveForForm(f)!);
 const sourceVerifiedFraction=primitives.length?primitives.filter(p=>p.status==="canonical-verified").length/primitives.length:0;
 const grammarIntegrity=output.grammar===grammar &&
  (grammar!=="passage" || (output.svg.includes('data-role="interrupted-spine"')&&output.svg.includes('data-void="true"')));
 const density=output.motifCount/Math.max(1,width/height);
 const reasons:string[]=[];
 if(forms.size<2)reasons.push("motif-diversity-low");
 if(output.motifCount<4)reasons.push("insufficient-motifs");
 if(!grammarIntegrity)reasons.push("grammar-integrity-failed");
 if(sourceVerifiedFraction<1)reasons.push("source-geometry-not-verified");
 if(density>6)reasons.push("potential-overcrowding");
 const score=Math.max(0,Math.min(100,Math.round(100-(forms.size<2?25:0)-(output.motifCount<4?20:0)-(!grammarIntegrity?35:0)-(sourceVerifiedFraction<1?15:0)-(density>6?15:0))));
 // A structurally acceptable concept must not be described as a manufacturable design.
 return {score,accepted:reasons.every(x=>x==="source-geometry-not-verified"),reasons,metrics:{distinctMotifs:forms.size,motifCount:output.motifCount,sourceVerifiedFraction,grammarIntegrity,density}};
}
export function generateAndAssessCoherentBand(topology:Topology,options:BandOptions={}){
 const result=renderCoherentBand(topology,options);
 const assessment=assessCoherentBand(topology,result,options.grammar??"return",options.width??1200,options.height??240);
 return {...result,assessment};
}
