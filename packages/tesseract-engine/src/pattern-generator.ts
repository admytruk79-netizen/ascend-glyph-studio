import {searchDesignSpace} from "./search";
import {genomeFromTopology} from "./genome";
import {projectSemanticGeometry} from "./semantic-projector";
import {ASCEND_PALETTES,ASCEND_COLORS} from "./color-system";
import type {DesignNicheId} from "./niches";

export type PatternMode="band"|"field"|"emblem"|"sleeve"|"cuff"|"collar";
export type PatternGeneratorInput={
 seed:string;concepts:string[];paletteId?:string;mode?:PatternMode;
 width?:number;height?:number;variations?:number;complexity?:number;
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

export function generatePatterns(input:PatternGeneratorInput):GeneratedPattern[]{
 const concepts=(input.concepts.length?input.concepts:["ancestry","freedom","protection"]).slice(0,8);
 const mode=input.mode??"band",niche=nicheForMode(mode),variations=Math.max(4,Math.min(input.variations??12,32));
 const complexity=Math.max(0,Math.min(1,input.complexity??.65));
 const candidates=searchDesignSpace({
  seed:input.seed,
  intent:{
   concepts:concepts.map((id,i)=>({id,weight:Math.max(.35,1-i*.09)})),
   traditions:[{id:"ascend-core",weight:1},{id:"ukrainian-ornament",weight:.72}],
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
