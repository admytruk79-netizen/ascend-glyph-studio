import type {ImageObservation} from "./image-corpus";

/**
 * Initial indexed ASCEND imagery already available in the project/library.
 * IMPORTANT: concept-board garment/textile renders are generated references,
 * not historical or manufactured evidence. They train composition/negative
 * recognition only at low weight.
 */
export const INITIAL_VISUAL_CORPUS:ImageObservation[]=[
 {id:"ascend-board-visual-language-6",sourceRef:"library:ASCEND A Living Visual Language(6)",class:"reference-board",evidenceTier:"C",verifiedReal:false,trainingUse:"composition",features:{scaleLevels:5,dominantDirection:["vertical","radial","field","wrap"],operations:["rotate","branch","layer","repeat","interrupt","radiate"],zones:["collar","placket","sleeve","cuff","back"],materials:["linen","leather"]},notes:["Contains user source-symbol panel plus generated translations and garment applications.","Do not treat rendered embroidery as ethnographic evidence."]},
 {id:"ascend-board-seven-genes",sourceRef:"library:Ascend Seven Genes One Language",class:"ascend-generated",evidenceTier:"D",verifiedReal:false,trainingUse:"negative-example",features:{dominantDirection:["vertical","radial"],operations:["branch","mirror","radiate"]},notes:["Useful for detecting over-symmetry and tree-of-life reflex; not canonical geometry."]},
 {id:"ascend-board-geometric-language",sourceRef:"library:ASCEND A Living Geometric Language",class:"ascend-generated",evidenceTier:"D",verifiedReal:false,trainingUse:"composition",features:{scaleLevels:4,dominantDirection:["vertical","field"],zones:["sleeve","chest","back"],materials:["linen","leather","ceramic"]},notes:["Application exploration only; low training weight."]},
 {id:"ascend-board-kharakternyk",sourceRef:"library:ASCEND Kharakternyk Heritage Collection",class:"reference-board",evidenceTier:"C",verifiedReal:false,trainingUse:"geometry",features:{dominantDirection:["vertical","horizontal"],operations:["repeat","branch","mirror"]},notes:["Contains a panel labelled actual glyphs; geometry must still be checked against canonical atlas before promotion."]}
];
