import type {MediumId} from "./medium-compiler";
import type {SashEvidenceGrammar} from "./sash-evidence-grammar";
import type {StructuralFeedback} from "./structural-feedback";

export type CompositionLine={id:string;x1:number;y1:number;x2:number;y2:number;opacity:number};
export type MasterCompositionPlan={
 id:string;
 primary:{scaleX:number;scaleY:number;offsetX:number;offsetY:number};
 auxiliaryLines:CompositionLine[];
};

export function buildMasterCompositionPlan(input:{
 mode:"band"|"field"|"emblem"|"sleeve"|"cuff"|"collar";
 medium:MediumId;
 complexity:number;
 sashGrammar?:SashEvidenceGrammar;
 structuralFeedback?:StructuralFeedback;
}):MasterCompositionPlan{
 const {mode,medium,sashGrammar:g,structuralFeedback:fb}=input;
 const sash=!!g&&(mode==="band"||mode==="sleeve"||mode==="cuff"||mode==="collar");
 if(sash){
  const centerShare=Math.max(.44,Math.min(.68,g.centralShare+(fb?.centralHierarchyBoost??0)*.14));
  const centerY=(1-centerShare)/2,railGap=.028,edge=.018;
  const framing=[
    {id:"rail-top",x1:edge,y1:Math.max(.01,centerY-railGap),x2:1-edge,y2:Math.max(.01,centerY-railGap),opacity:.78},
    {id:"rail-bottom",x1:edge,y1:Math.min(.99,centerY+centerShare+railGap),x2:1-edge,y2:Math.min(.99,centerY+centerShare+railGap),opacity:.78}
   ];
  const decorativeEdges=[
    {id:"edge-left-a",x1:edge,y1:.18,x2:edge,y2:.36,opacity:.58},
    {id:"edge-left-b",x1:edge,y1:.64,x2:edge,y2:.82,opacity:.58},
    {id:"edge-right-a",x1:1-edge,y1:.18,x2:1-edge,y2:.36,opacity:.58},
    {id:"edge-right-b",x1:1-edge,y1:.64,x2:1-edge,y2:.82,opacity:.58}
   ];
  const productionMedium=medium==="embroidery"||medium==="leather-tooling";
  return {
   id:productionMedium?"scholarly-sash-v4-production-safe":"scholarly-sash-v4-shared-plan",
   primary:{scaleX:1,scaleY:centerShare,offsetX:0,offsetY:centerY},
   auxiliaryLines:productionMedium?framing:[...framing,...decorativeEdges]
  };
 }
 // Non-sash embroidery/leather master composition is intentionally single-source.
 if(medium==="embroidery"||medium==="leather-tooling")
  return {id:"single-production-plan",primary:{scaleX:1,scaleY:1,offsetX:0,offsetY:0},auxiliaryLines:[]};
 return {id:"preview-only-plan",primary:{scaleX:1,scaleY:1,offsetX:0,offsetY:0},auxiliaryLines:[]};
}
