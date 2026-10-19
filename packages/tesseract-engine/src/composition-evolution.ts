/** Composition-level diversity search. These are design intents, not cultural
 * attributions, canonical glyph replacements, or manufacturing approvals.
 * A profile changes search objectives; it must never mutate ASCEND geometry.
 */
export type CompositionArchetype=
 "monumental-focal"|"interlocking-field"|"rhythmic-border"|"asymmetric-counterpoint"|"continuous-wrap";
export type CompositionObjective={
 archetype:CompositionArchetype;
 focalHierarchy:number;
 rhythmicComplexity:number;
 negativeSpace:number;
 asymmetry:number;
 continuity:number;
};
const ARCHETYPES:readonly CompositionObjective[]=[
 {archetype:"monumental-focal",focalHierarchy:1,rhythmicComplexity:.45,negativeSpace:.8,asymmetry:.25,continuity:.25},
 {archetype:"interlocking-field",focalHierarchy:.65,rhythmicComplexity:.9,negativeSpace:.5,asymmetry:.35,continuity:.7},
 {archetype:"rhythmic-border",focalHierarchy:.55,rhythmicComplexity:1,negativeSpace:.65,asymmetry:.2,continuity:.9},
 {archetype:"asymmetric-counterpoint",focalHierarchy:.85,rhythmicComplexity:.7,negativeSpace:.75,asymmetry:1,continuity:.4},
 {archetype:"continuous-wrap",focalHierarchy:.65,rhythmicComplexity:.8,negativeSpace:.6,asymmetry:.45,continuity:1}
];
/** Deterministic, balanced exploration; never collapse the entire population
 * into small mutations of one high-scoring composition.
 */
export function compositionObjectives(population:number):CompositionObjective[]{
 if(!Number.isSafeInteger(population)||population<1||population>100000)throw new Error("invalid composition population");
 return Array.from({length:population},(_,i)=>({...ARCHETYPES[i%ARCHETYPES.length]!}));
}
export type CreativeCandidate={id:string;artistic:number;originality:number;manufacturability:number;provenanceApproved:boolean;canonicalGeometryValid:boolean};
export function selectCreativeParetoFront<T extends CreativeCandidate>(candidates:readonly T[]):T[]{
 const eligible=candidates.filter(c=>c.provenanceApproved&&c.canonicalGeometryValid&&
  [c.artistic,c.originality,c.manufacturability].every(x=>Number.isFinite(x)&&x>=0&&x<=1));
 return eligible.filter(a=>!eligible.some(b=>b!==a&&
  b.artistic>=a.artistic&&b.originality>=a.originality&&b.manufacturability>=a.manufacturability&&
  (b.artistic>a.artistic||b.originality>a.originality||b.manufacturability>a.manufacturability)));
}
