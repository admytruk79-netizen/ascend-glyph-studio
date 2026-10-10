/** ASCEND's own semantics are composed separately from documented cultural evidence. */
import {worldPatternGraph} from "./world-pattern-graph";
import type {PatternGeneratorInput} from "./pattern-generator";
export type ElementId="earth"|"water"|"fire"|"air"|"spirit";
export const ASCEND_ELEMENTS:Record<ElementId,{meaning:string;geometry:string;concepts:string[]}>={
 earth:{meaning:"Grounding and ancestry",geometry:"stable square lattice and roots",concepts:["grounding","ancestry","continuity"]},
 water:{meaning:"Flow and renewal",geometry:"alternating wave and meander",concepts:["flow","renewal","adaptation"]},
 fire:{meaning:"Transformation and vitality",geometry:"radiant ascending diagonal",concepts:["transformation","vitality","ascent"]},
 air:{meaning:"Breath and relationship",geometry:"spaced repeating rhythm",concepts:["breath","connection","freedom"]},
 spirit:{meaning:"Integration and awareness",geometry:"central axis and balanced enclosure",concepts:["integration","awareness","harmony"]}
};
export const FUSION_ROLES={
 ukrainian:"central axis, floral-geometric balance and mirrored embroidery rhythm",
 arabic:"tessellation, proportional geometry and interlacing logic",
 indigenousNorthAmerican:"documented, permission-appropriate geometric textile rhythm; never a generic pan-Indigenous motif"
} as const;
export function resolveCultureEvidence(requested:string[]){
 const graph=worldPatternGraph();
 const available=new Set(graph.objects.flatMap(o=>o.cultureIds));
 return {resolved:requested.filter(x=>available.has(x)),unresolved:requested.filter(x=>!available.has(x)),
  evidenceCounts:Object.fromEntries(requested.map(id=>[id,graph.objects.filter(o=>o.cultureIds.includes(id)).length]))};
}
export function ascendFusionInput(seed:string,medium:"embroidery"|"print",element:ElementId,mode:"field"|"band"="field"):PatternGeneratorInput{
 const cultureCandidates=["ukraine","arabic","arab","native-american","indigenous-north-america"];
 const evidence=resolveCultureEvidence(cultureCandidates);
 if(!evidence.resolved.length)throw new Error("No matching cultural corpus identifiers: inspect worldPatternGraph before generating");
 return {
  seed:`${seed}:${medium}:${element}`,concepts:ASCEND_ELEMENTS[element].concepts,
  cultureIds:evidence.resolved,mode,medium,placement:"textile",
  width:mode==="field"?1200:1200,height:mode==="field"?1200:320,
  variations:4,complexity:.82,population:64,generations:5,
  physicalWidthMm:mode==="field"?300:300,physicalHeightMm:mode==="field"?300:80
 };
}
