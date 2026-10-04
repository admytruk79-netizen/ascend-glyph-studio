import{TesseractMeaningGraph}from"./tesseract-meta-grammar";import{GlyphPhrase,PhraseMeaning,buildGlyphPhrase}from"./compound-language";
export interface SemanticPhraseBinding{nodeId:string;nodeKind:string;meaning:PhraseMeaning;phrase:GlyphPhrase}
const MAP:Record<string,PhraseMeaning>={root:"root",axis:"lineage",path:"path",guardian:"protection",transform:"transformation",flower:"flowering",flight:"flight",ascent:"ascent",crown:"integration",return:"return"};
export function bindPhrasesToGraph(g:TesseractMeaningGraph):SemanticPhraseBinding[]{return g.nodes.map((n,i)=>{const meaning=MAP[n.kind]??"path";return{nodeId:n.id,nodeKind:n.kind,meaning,phrase:buildGlyphPhrase(`${g.seed}|node|${n.id}`,meaning,3+(i%5))}})}
export function phraseManifest(g:TesseractMeaningGraph){const bindings=bindPhrasesToGraph(g);return{schema:"ascend.semantic-phrase-manifest.v1",seed:g.seed,bindings,provenance:{kind:"original-synthesis",legacyAtlasRequired:false,copiedHistoricalMotif:false}}}
