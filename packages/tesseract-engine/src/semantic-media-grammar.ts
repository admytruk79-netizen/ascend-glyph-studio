export type Meaning="love"|"reciprocity"|"continuity"|"protection"|"growth"|"return"|"remembrance"|"freedom"|"lineage"|"transformation";
export type SemanticOperation="approach"|"bind"|"mirror"|"enclose"|"continue"|"branch"|"expand"|"converge"|"interrupt"|"resume"|"alternate"|"open"|"inherit"|"transform";
export type Medium="embroidery"|"weave"|"print"|"leather-tooling"|"engraving";
export type Placement="cuff"|"collar"|"sleeve"|"placket"|"chest"|"back"|"hem"|"full-field"|"diary-border"|"diary-cover";
export interface SemanticRule{meaning:Meaning;operations:SemanticOperation[];topology:"bilateral"|"radial"|"linear"|"branching"|"field"|"enclosure";closure:"open"|"closed"|"returning";rhythm:"steady"|"accelerating"|"alternating"|"broken-resumed"}
export const SEMANTIC_RULES:Record<Meaning,SemanticRule>={
love:{meaning:"love",operations:["approach","mirror","bind","continue"],topology:"bilateral",closure:"closed",rhythm:"steady"},
reciprocity:{meaning:"reciprocity",operations:["mirror","alternate","bind"],topology:"bilateral",closure:"returning",rhythm:"alternating"},
continuity:{meaning:"continuity",operations:["continue","resume"],topology:"linear",closure:"returning",rhythm:"steady"},
protection:{meaning:"protection",operations:["enclose","continue"],topology:"enclosure",closure:"closed",rhythm:"steady"},
growth:{meaning:"growth",operations:["branch","expand"],topology:"branching",closure:"open",rhythm:"accelerating"},
return:{meaning:"return",operations:["expand","converge","resume"],topology:"radial",closure:"returning",rhythm:"broken-resumed"},
remembrance:{meaning:"remembrance",operations:["inherit","interrupt","resume"],topology:"linear",closure:"returning",rhythm:"broken-resumed"},
freedom:{meaning:"freedom",operations:["open","branch","expand"],topology:"branching",closure:"open",rhythm:"accelerating"},
lineage:{meaning:"lineage",operations:["inherit","branch","continue"],topology:"branching",closure:"returning",rhythm:"steady"},
transformation:{meaning:"transformation",operations:["alternate","transform","expand"],topology:"field",closure:"open",rhythm:"alternating"}};
export interface MediumGrammar{medium:Medium;placements:Placement[];minFeature:number;maxLayers:number;preferred:["line"|"fill"|"relief"|"negative-space",...("line"|"fill"|"relief"|"negative-space")[]]}
export const MEDIA:Record<Medium,MediumGrammar>={
embroidery:{medium:"embroidery",placements:["cuff","collar","sleeve","placket","chest","hem","full-field","diary-cover"],minFeature:1,maxLayers:4,preferred:["line","fill","negative-space"]},
weave:{medium:"weave",placements:["sleeve","chest","hem","full-field","diary-cover"],minFeature:2,maxLayers:3,preferred:["fill","line","negative-space"]},
print:{medium:"print",placements:["cuff","collar","sleeve","placket","chest","back","hem","full-field","diary-border","diary-cover"],minFeature:.5,maxLayers:6,preferred:["fill","line","negative-space"]},
"leather-tooling":{medium:"leather-tooling",placements:["cuff","collar","diary-border","diary-cover"],minFeature:3,maxLayers:3,preferred:["relief","line","negative-space"]},
engraving:{medium:"engraving",placements:["cuff","collar","diary-border","diary-cover"],minFeature:1,maxLayers:4,preferred:["line","negative-space","relief"]}};
export function resolveSemanticComposition(meanings:Meaning[],medium:Medium,placement:Placement){const rules=meanings.map(m=>SEMANTIC_RULES[m]),m=MEDIA[medium];if(!m.placements.includes(placement))throw new Error(`${medium} is not validated for ${placement}`);return{rules,medium:m,placement,operations:[...new Set(rules.flatMap(r=>r.operations))],topologies:[...new Set(rules.map(r=>r.topology))],closures:[...new Set(rules.map(r=>r.closure))]}}
