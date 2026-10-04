import { DiarySynthesisInput } from "./diary";
import { NewGlyphCandidate, generateNewGlyphVocabulary } from "./new-glyph-system";

export type PatternArchetype=
 "lineage-axis"|"journey-band"|"nested-rhombic"|"alternating-register"|"mirrored-branch"|
 "stepped-ascent"|"guarded-field"|"interlock-lattice"|"continuous-meander"|"radial-center"|
 "quartered-field"|"interrupted-rhythm";

export interface OriginalGlyphSelection{
 vocabularySeed:string;glyphs:NewGlyphCandidate[];
 provenance:{kind:"original-synthesis";legacyAtlasRequired:false;copiedHistoricalMotif:false};
}
export interface PatternTrainingCase{
 id:string;seed:string;archetype:PatternArchetype;density:"restrained"|"balanced"|"complex";
 symmetry:"none"|"bilateral"|"radial";operators:string[];source:OriginalGlyphSelection;
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
const selectOriginal=(seed:string,count=4):OriginalGlyphSelection=>{
 const vocabulary=generateNewGlyphVocabulary(seed+"|vocabulary",108),h=hash(seed+"|selection"),glyphs:NewGlyphCandidate[]=[];
 for(let i=0;i<count;i++)glyphs.push(vocabulary[(h+i*29)%vocabulary.length]);
 return{vocabularySeed:seed+"|vocabulary",glyphs,provenance:{kind:"original-synthesis",legacyAtlasRequired:false,copiedHistoricalMotif:false}};
};
export function buildPatternTrainingCorpus(base:DiarySynthesisInput,variantsPerArchetype=8):PatternTrainingCase[]{
 if(variantsPerArchetype<1||variantsPerArchetype>64)throw new Error("variantsPerArchetype must be 1-64");
 const out:PatternTrainingCase[]=[];
 for(const archetype of archetypes)for(let i=0;i<variantsPerArchetype;i++){
  const seed=`${base.seed}|${archetype}|${String(i+1).padStart(2,"0")}`,h=hash(seed);
  const density=(["restrained","balanced","complex"] as const)[h%3],symmetry=(["none","bilateral","radial"] as const)[(h>>>3)%3];
  const source=selectOriginal(seed,4),n=(shift:number,min=.55,span=.4)=>Number((min+((h>>>shift)%1000)/1000*span).toFixed(3));
  out.push({id:`pattern-${archetype}-${i+1}`,seed,archetype,density,symmetry,operators:ARCHETYPES[archetype],source,
   objectives:{traceability:1,negativeSpace:n(2),rhythm:n(5),complexity:n(8),manufacturability:n(11,.7,.29)}});
 }return out;
}
export function summarizePatternCorpus(cases:PatternTrainingCase[]){return{count:cases.length,archetypes:[...new Set(cases.map(x=>x.archetype))],sourceGlyphs:[...new Set(cases.flatMap(x=>x.source.glyphs.map(g=>g.id)))],densities:[...new Set(cases.map(x=>x.density))],symmetries:[...new Set(cases.map(x=>x.symmetry))],legacyAtlasRequired:cases.some(x=>x.source.provenance.legacyAtlasRequired)}}
export type ComplexRegister="root"|"threshold"|"path"|"guardian"|"crown"|"edge"|"corner"|"field";
export interface ComplexPatternCase extends PatternTrainingCase{generation:number;registers:ComplexRegister[];transitions:string[];mutation:string[];complexitySignature:string}
const REGISTERS:ComplexRegister[]=["root","threshold","path","guardian","crown","edge","corner","field"];
const TRANSITIONS=["step-shift","mirror-flip","density-rise","density-fall","alternating-gap","nested-return","quarter-turn","axis-break","cadence-double","cadence-half"];
const MUTATIONS=["scale-alternate","mirror-alternate","rotate-quarter","offset-phase","nested-inset","interlock","interrupt-resume","edge-reflect","corner-fold","center-accent","sparse-breath","dense-knot"];
export function buildComplexPatternCorpus(base:DiarySynthesisInput,opts:{variantsPerArchetype?:number;generations?:number}={}):ComplexPatternCase[]{
 const variants=opts.variantsPerArchetype??32,generations=opts.generations??4;if(variants<1||variants>128)throw new Error("variantsPerArchetype must be 1-128");if(generations<1||generations>12)throw new Error("generations must be 1-12");
 const out:ComplexPatternCase[]=[];for(let generation=1;generation<=generations;generation++){const generationBase=buildPatternTrainingCorpus({...base,seed:`${base.seed}|g${generation}`},variants);
  for(const item of generationBase){const h=hash(item.seed+"|complex|"+generation),registerCount=3+(h%6),registers=Array.from({length:registerCount},(_,i)=>REGISTERS[(h+i*5+generation)%REGISTERS.length]),transitionCount=2+((h>>>4)%5),transitions=Array.from({length:transitionCount},(_,i)=>TRANSITIONS[(h+i*7)%TRANSITIONS.length]),mutationCount=2+((h>>>8)%7),mutation=Array.from({length:mutationCount},(_,i)=>MUTATIONS[(h+i*11+generation)%MUTATIONS.length]),complexitySignature=[item.archetype,item.density,item.symmetry,...item.source.glyphs.map(g=>g.id),...registers,...transitions,...mutation].join("|");out.push({...item,id:`${item.id}-g${generation}`,generation,registers,transitions,mutation,complexitySignature});}}
 return out;
}
export function uniqueComplexPatterns(cases:ComplexPatternCase[]):ComplexPatternCase[]{const seen=new Set<string>();return cases.filter(x=>{if(seen.has(x.complexitySignature))return false;seen.add(x.complexitySignature);return true})}
