import type {ImageObservation} from "./image-corpus";
import type {MediumId} from "./medium-compiler";
import {assessVisual,type VisualAssessment} from "./visual-assessment";
import {analyzeSvgStructure,type SvgStructuralAnalysis} from "./svg-analysis";

export type FinalSvgCritique={
 score:number;survive:boolean;quality:number;originality:number;genericRisk:number;derivativeRisk:number;
 analysis:SvgStructuralAnalysis;visual?:VisualAssessment;flags:string[];
};

export function critiqueFinalSvg(svg:string,medium:MediumId,corpus:ImageObservation[]=[]):FinalSvgCritique{
 const analysis=analyzeSvgStructure(svg),v=analysis.vector,flags=[...analysis.flags];
 const visual=corpus.length?assessVisual(v,corpus):undefined;
 if(visual)flags.push(...visual.flags);
 const hierarchy=(v.focalDominance*.34+v.compositionalDepth*.34+v.densityVariation*.18+v.asymmetryBalance*.14);
 const breathing=(v.voidRatio>.18&&v.voidRatio<.76)?1:Math.max(0,1-Math.abs(v.voidRatio-.45)*1.8);
 const rhythm=Math.max(0,1-Math.max(0,v.periodicity-.62)*1.8);
 const mediumFit=medium==="embroidery"?Math.max(0,1-Math.max(0,v.embroideryComplexity-.88)*3):1;
 const quality=Math.max(0,Math.min(1,hierarchy*.55+breathing*.18+rhythm*.17+mediumFit*.10));
 const genericRisk=visual?.genericRisk??Math.max(0,Math.min(1,v.symmetry*.3+v.repetition*.3+(1-v.interruption)*.2+(1-v.voidRatio)*.2));
 const derivativeRisk=visual?.derivativeRisk??0;
 const originality=visual?.novelty??Math.max(0,1-genericRisk);
 if(genericRisk>.78)flags.push("final-generic-risk");
 if(derivativeRisk>.80)flags.push("final-derivative-risk");
 if(quality<.42)flags.push("final-quality-below-threshold");
 const severe=new Set(["sampler-strip-risk","excessive-path-repetition","final-derivative-risk"]);
 const survive=quality>=.42&&genericRisk<.82&&derivativeRisk<.86&&!flags.some(x=>severe.has(x));
 const score=quality*55+originality*25+(1-genericRisk)*12+(1-derivativeRisk)*8;
 return {score,survive,quality,originality,genericRisk,derivativeRisk,analysis,visual,flags:[...new Set(flags)]};
}
