import type {ImageObservation} from "./image-corpus";
import {fitCompositionPrior} from "./composition-prior-fit";
import type {LearnedRelationPrior} from "./learned-relation-prior";

/** Adapter for outputs of scripts/analyze-research-corpus.ts.
 * Metadata MUST come from independently reviewed rights/cultural gates.
 * Public URLs and 'open' cultural access alone do NOT prove image-training permission.
 */
export type AnalyzedResearchRow={
 id?:string;source?:string;objectURL?:string;accession?:string;institution?:string;
 stage?:string;culturalAccess?:string;image?:string;
 rights?:{compositionTrainingPermitted?:boolean;reviewed?:boolean;license?:string};
 features?:{mirrorX?:number;mirrorY?:number;repetitionX?:number;repetitionY?:number;voidRatio?:number;densityVariation?:number;scaleHierarchy?:number[];orientation?:number[]};
 deconstruction?:{kind?:string;bands?:{frieze?:{group?:string}}[]};
};
const unit=(x:unknown):number|undefined=>typeof x==="number"&&Number.isFinite(x)?Math.max(0,Math.min(1,x)):undefined;
export function researchRowToObservation(row:AnalyzedResearchRow):ImageObservation|undefined{
 if(row.stage!=="analyzed"||!row.id||!row.source||!row.objectURL)return undefined;
 if(row.culturalAccess!=="open"||row.rights?.reviewed!==true||row.rights.compositionTrainingPermitted!==true||!row.rights.license?.trim())return undefined;
 const f=row.features;if(!f)return undefined;
 const symmetry=unit(f.mirrorX);
 const otherMirror=unit(f.mirrorY);
 const repetitionX=unit(f.repetitionX),repetitionY=unit(f.repetitionY);
 const n=(f.scaleHierarchy??[]).filter(v=>Number.isFinite(v)&&v>0).length;
 const features:ImageObservation["features"]={
  symmetry:symmetry===undefined?otherMirror:otherMirror===undefined?symmetry:Math.max(symmetry,otherMirror),
  periodicity:repetitionX===undefined?repetitionY:repetitionY===undefined?repetitionX:Math.max(repetitionX,repetitionY),
  voidRatio:unit(f.voidRatio),densityVariation:unit(f.densityVariation),
  scaleLevels:Math.max(1,Math.min(5,n||1)),
  operations:row.deconstruction?.bands?.length?["repeat"]:[]
 };
 if(features.symmetry===undefined&&features.periodicity===undefined)return undefined;
 return {id:row.id,sourceRef:row.objectURL,class:"real-historical",evidenceTier:"B",
  verifiedReal:true,trainingUse:"composition",features,
  provenance:[row.institution??row.source,row.accession??row.id,row.objectURL,row.rights.license].join(" | "),
  notes:["Research image metadata with explicitly reviewed composition-training rights.","Automatically extracted structural evidence; no cultural interpretation inferred."]
 };
}
export function fitPriorFromAnalyzedRows(rows:AnalyzedResearchRow[],minimumEvidence=3):{prior:LearnedRelationPrior|undefined;accepted:number;rejected:number}{
 const observations=rows.map(researchRowToObservation).filter((x):x is ImageObservation=>x!==undefined);
 const prior=fitCompositionPrior(observations,minimumEvidence);
 return {prior,accepted:prior?.evidenceImages??0,rejected:rows.length-observations.length};
}
