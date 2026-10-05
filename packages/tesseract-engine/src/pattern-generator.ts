import {searchDesignSpace} from "./search";
import {genomeFromTopology} from "./genome";
import {projectSemanticGeometry} from "./semantic-projector";
import {ASCEND_PALETTES,ASCEND_COLORS} from "./color-system";
import type {DesignNicheId} from "./niches";
import worldLibrary from "../data/world-pattern-library.v1.json";

export type PatternMode="band"|"field"|"emblem"|"sleeve"|"cuff"|"collar";
export type PatternGeneratorInput={
 seed:string;concepts:string[];paletteId?:string;mode?:PatternMode;
 width?:number;height?:number;variations?:number;complexity?:number;
 cultureIds?:string[];medium?:string;placement?:string;
};
export type GeneratedPattern={
 id:string;lineageId:string;score:number;novelty:number;svg:string;
 objectives:ReturnType<typeof searchDesignSpace>[number]["objectives"];
};

const nicheForMode=(mode:PatternMode):DesignNicheId|undefined=>({
 band:"hem-band",field:"back-field",emblem:"chest",sleeve:"sleeve",cuff:"cuff-wrap",collar:"collar"
}[mode] as DesignNicheId|undefined);

function colorize(svg:string,paletteId:string){
 const p=ASCEND_PALETTES[paletteId]??ASCEND_PALETTES["underdog-heritage"]!;
 const ground=ASCEND_COLORS[p.colors.find(x=>x.role==="ground")?.colorId??"midnight-navy"]!.hex;
 const structure=ASCEND_COLORS[p.colors.find(x=>x.role==="structure")?.colorId??"bone-ivory"]!.hex;
 const accents=p.colors.filter(x=>x.role==="accent"||x.role==="highlight").map(x=>ASCEND_COLORS[x.colorId]!.hex);
 const bg=`<rect width="100%" height="100%" fill="${ground}"/>`;
 let out=svg.replace(/<svg([^>]*)>/,`<svg$1 data-palette="${p.id}">${bg}`);
 out=out.replace(/currentColor/g,structure);
 const paths=[...out.matchAll(/<path /g)];
 for(let i=0;i<Math.min(paths.length,accents.length*2);i++){
  const c=accents[i%Math.max(1,accents.length)];
  if(!c)break;
  out=out.replace(/<path ([^>]*?)>/,`<path $1 data-accent="${i}" stroke="${c}">`);
 }
 return out;
}

type LibraryRecord=(typeof worldLibrary.records)[number];
function culturalSignals(cultureIds:string[]){
 const selected=(worldLibrary.records as LibraryRecord[]).filter(r=>cultureIds.includes(r.cultureId)&&r.access!=="restricted"&&r.access!=="prohibited");
 const features=new Map<string,number>();
 for(const r of selected)for(const f of r.features)features.set(f.value,(features.get(f.value)??0)+f.weight*r.confidence);
 return {records:selected,features:[...features].sort((a,b)=>b[1]-a[1]).slice(0,12)};
}

export function generatePatterns(input:PatternGeneratorInput):GeneratedPattern[]{
 const concepts=(input.concepts.length?input.concepts:["ancestry","freedom","protection"]).slice(0,8);
 const mode=input.mode??"band",niche=nicheForMode(mode),variations=Math.max(4,Math.min(input.variations??12,32));
 const complexity=Math.max(0,Math.min(1,input.complexity??.65));
 const cultureIds=input.cultureIds?.length?input.cultureIds:["ukraine","japan","britain","china","western-craft"];
 const cultural=culturalSignals(cultureIds);
 const culturalConcepts=cultural.features.map(([id,w])=>({id:`structure:${id}`,weight:Math.min(1,.3+w/4)}));
 const candidates=searchDesignSpace({
  seed:input.seed,
  intent:{
   concepts:[...concepts.map((id,i)=>({id,weight:Math.max(.35,1-i*.09)})),...culturalConcepts],
   traditions:[{id:"ascend-universal",weight:1},...cultureIds.map((id,i)=>({id:`evidence:${id}`,weight:Math.max(.35,.75-i*.05)}))],
   character:[{id:"ordered-organic",weight:.55+complexity*.35},{id:"minimal-complex",weight:complexity}]
  },
  principles:[],niches:niche?[niche]:undefined,
  population:Math.round(32+complexity*64),generations:Math.round(3+complexity*5),keep:variations
 });
 return candidates.map((c,i)=>{
  const g=genomeFromTopology(`pattern:${input.seed}:${i}`,c.topology);
  const p=projectSemanticGeometry(g,input.width??960,input.height??260);
  return {id:`pat-${input.seed}-${i+1}`,lineageId:c.lineageId,score:c.score,novelty:c.novelty,objectives:c.objectives,svg:colorize(p.svg,input.paletteId??"underdog-heritage")};
 });
}
