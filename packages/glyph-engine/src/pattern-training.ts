import { DiarySynthesisInput } from "./diary";
import { AtlasSourceSelection, selectAtlasSources } from "./atlas-source";

export type PatternArchetype=
 "lineage-axis"|"journey-band"|"nested-rhombic"|"alternating-register"|"mirrored-branch"|
 "stepped-ascent"|"guarded-field"|"interlock-lattice"|"continuous-meander"|"radial-center"|
 "quartered-field"|"interrupted-rhythm";

export interface PatternTrainingCase{
 id:string;seed:string;archetype:PatternArchetype;density:"restrained"|"balanced"|"complex";
 symmetry:"none"|"bilateral"|"radial";operators:string[];atlas:AtlasSourceSelection;
 objectives:{traceability:number;negativeSpace:number;rhythm:number;complexity:number;manufacturability:number};
}

const ARCHETYPES:Record<PatternArchetype,string[]>={
 "lineage-axis":["center","root-register","branch","crown","mirror"],
 "journey-band":["bound","repeat","alternate","threshold","terminate"],
 "nested-rhombic":["enclose","nest","repeat","offset"],
 "alternating-register":["band","alternate","interrupt","resume"],
 "mirrored-branch":["axis","branch","mirror","cadence"],
 "stepped-ascent":["step","rise","pause","rise","crown"],
 "guarded-field":["frame","inset","corner-guard","center"],
 "interlock-lattice":["cross","interlock","repeat","mirror"],
 "continuous-meander":["turn","continue","return","repeat"],
 "radial-center":["center","rotate","ring","counter-ring"],
 "quartered-field":["divide","quarter","alternate","center"],
 "interrupted-rhythm":["repeat","break","accent","resume"]
};
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const archetypes=Object.keys(ARCHETYPES) as PatternArchetype[];

export function buildPatternTrainingCorpus(base:DiarySynthesisInput,variantsPerArchetype=8):PatternTrainingCase[]{
 if(variantsPerArchetype<1||variantsPerArchetype>64)throw new Error("variantsPerArchetype must be 1-64");
 const out:PatternTrainingCase[]=[];
 for(const archetype of archetypes)for(let i=0;i<variantsPerArchetype;i++){
  const seed=`${base.seed}|${archetype}|${String(i+1).padStart(2,"0")}`,h=hash(seed);
  const density=(["restrained","balanced","complex"] as const)[h%3];
  const symmetry=(["none","bilateral","radial"] as const)[(h>>>3)%3];
  const input={...base,seed,density,symmetry:symmetry==="radial"?"bilateral":symmetry};
  const atlas=selectAtlasSources(input,2);
  const n=(shift:number,min=.55,span=.4)=>Number((min+((h>>>shift)%1000)/1000*span).toFixed(3));
  out.push({id:`pattern-${archetype}-${i+1}`,seed,archetype,density,symmetry,
   operators:ARCHETYPES[archetype],atlas,
   objectives:{traceability:1,negativeSpace:n(2),rhythm:n(5),complexity:n(8),manufacturability:n(11,.7,.29)}});
 }
 return out;
}

export function summarizePatternCorpus(cases:PatternTrainingCase[]){
 return{
  count:cases.length,
  archetypes:[...new Set(cases.map(x=>x.archetype))],
  sourceGlyphs:[...new Set(cases.flatMap(x=>x.atlas.glyphs.map(g=>g.glyphId)))],
  densities:[...new Set(cases.map(x=>x.density))],
  symmetries:[...new Set(cases.map(x=>x.symmetry))]
 };
}
