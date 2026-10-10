import type {LearnedRelationPrior} from "./learned-relation-prior";

export type SashEvidenceGrammar={
 id:string;
 source:{authors:string[];title:string;year:number;doi:string};
 /** Numeric weights below are implementation heuristics, not paper measurements. */
 parameterStatus?:"implementation-heuristics";
 evidencePages?:number[];
 partitions:number[];
 centralShare:number;
 flankShare:number;
 symmetry:number;
 diagonalDynamics:number;
 croppedMotifAllowance:number;
 alternation:number;
 lattice:number;
 edgeFraming:number;
 scaleHierarchy:number;
 positiveNegativeReversal:number;
};

export const WESTERN_UKRAINIAN_SASH_GRAMMAR:SashEvidenceGrammar={
 id:"nykorak-herus-kutsyr-2022-western-ukraine",
 source:{
  authors:["Olena Nykorak","Lyudmyla Herus","Tetiana Kutsyr"],
  title:"Patterned Woven Sashes of Western Ukraine and Lithuania: Techniques, Ornamentation, Functions",
  year:2022,
  doi:"10.15407/nz2022.05.1147"
 },
 parameterStatus:"implementation-heuristics",
 evidencePages:[1153,1154,1155,1156,1157,1158],
 partitions:[3,5,7],
 centralShare:.48,
 flankShare:.26,
 symmetry:.86,
 diagonalDynamics:.18,
 croppedMotifAllowance:.08,
 alternation:.72,
 lattice:.58,
 edgeFraming:.9,
 scaleHierarchy:.92,
 positiveNegativeReversal:.72
};

export const LITHUANIAN_SASH_GRAMMAR:SashEvidenceGrammar={
 ...WESTERN_UKRAINIAN_SASH_GRAMMAR,
 id:"nykorak-herus-kutsyr-2022-lithuania",
 partitions:[3,5],
 centralShare:.52,
 flankShare:.24,
 symmetry:.68,
 diagonalDynamics:.62,
 croppedMotifAllowance:.48,
 alternation:.78,
 lattice:.62,
 edgeFraming:.78,
 scaleHierarchy:.82,
 positiveNegativeReversal:.52
};

export function sashGrammarFor(cultureIds:string[]=[]):SashEvidenceGrammar|undefined{
 const ids=cultureIds.map(x=>x.toLowerCase());
 if(ids.some(x=>x.includes("lithuan")))return LITHUANIAN_SASH_GRAMMAR;
 if(ids.some(x=>x.includes("ukrain")))return WESTERN_UKRAINIAN_SASH_GRAMMAR;
 return undefined;
}

const clamp=(n:number)=>Math.max(0,Math.min(1,n));

/**
 * Merge scholarly composition evidence into the statistical corpus prior.
 * This changes relationship probabilities only; it never imports historic motif geometry.
 */
export function mergeSashEvidencePrior(base:LearnedRelationPrior|undefined,g:SashEvidenceGrammar|undefined):LearnedRelationPrior|undefined{
 if(!g)return base;
 const b=base??{relationWeights:{},preferredScaleRatio:.65,mirrorStrength:.5,repeatStrength:.5,exploration:.25,evidenceImages:0,sourceModel:"none"};
 const w={...b.relationWeights};
 const add=(id:string,n:number)=>w[id]=Math.max(.01,(w[id]??.05)+n);
 add("flow",g.alternation*.55);
 add("repeat",g.alternation*.72);
 add("return",g.alternation*.28);
 add("oppose",g.symmetry*.48);
 add("enclose",g.edgeFraming*.6);
 add("nest",g.scaleHierarchy*.58);
 add("bridge",g.lattice*.34);
 add("intersect",g.lattice*.28);
 add("transform",g.diagonalDynamics*.32);
 add("radiate",g.diagonalDynamics*.18);
 return {
  ...b,
  relationWeights:w,
  preferredScaleRatio:Math.min(b.preferredScaleRatio,.72),
  mirrorStrength:clamp(b.mirrorStrength*.58+g.symmetry*.42),
  repeatStrength:clamp(b.repeatStrength*.58+g.alternation*.42),
  exploration:clamp(b.exploration*.75+g.croppedMotifAllowance*.25),
  sourceModel:b.sourceModel+"+"+g.id
 };
}
