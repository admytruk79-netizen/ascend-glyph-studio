import {searchDesignSpace} from "./search";
import {genomeFromTopology} from "./genome";
import {projectSemanticGeometry} from "./semantic-projector";
import {ASCEND_PALETTES,ASCEND_COLORS} from "./color-system";
import type {DesignNicheId} from "./niches";
import {deriveSignals} from "./pattern-knowledge-graph";
import {worldPatternGraph} from "./world-pattern-graph";
import {scoreTopologyComposition,qualityGate,type CompositionScore,type QualityGateResult} from "./aesthetic-critic";
import type {GarmentZone} from "./garment";
import type {MediumId} from "./medium-compiler";

export type PatternMode="band"|"field"|"emblem"|"sleeve"|"cuff"|"collar";
export type PatternGeneratorInput={
 seed:string;concepts:string[];paletteId?:string;mode?:PatternMode;
 width?:number;height?:number;variations?:number;complexity?:number;
 cultureIds?:string[];medium?:string;placement?:string;
};
export type GeneratedPattern={
 id:string;lineageId:string;score:number;novelty:number;svg:string;
 objectives:ReturnType<typeof searchDesignSpace>[number]["objectives"];
 aesthetic:CompositionScore;quality:QualityGateResult;generatorScore:number;
};

const nicheForMode=(mode:PatternMode):DesignNicheId|undefined=>({
 band:"hem-band",field:"back-field",emblem:"chest",sleeve:"sleeve",cuff:"cuff-wrap",collar:"collar"
}[mode] as DesignNicheId|undefined);

function mediumForMode(mode:PatternMode):MediumId{return mode==="field"?"print":"embroidery";}
function projectionZone(mode:PatternMode,width:number,height:number):GarmentZone{
 const wrap=mode==="band"||mode==="cuff"||mode==="collar"||mode==="sleeve";
 const kind=mode==="band"?"hem":mode==="field"?"back":mode==="emblem"?"chest":mode;
 return{id:`generator:${mode}`,kind,surface:mode==="sleeve"?"tapered-cylinder":wrap?"cylinder":"flat",widthMm:width,heightMm:height,editable:true,wrapAllowed:wrap};
}

function colorize(svg:string,paletteId:string){
 const p=ASCEND_PALETTES[paletteId]??ASCEND_PALETTES["underdog-heritage"]!;
 const ground=ASCEND_COLORS[p.colors.find(x=>x.role==="ground")?.colorId??"midnight-navy"]!.hex;
 const structure=ASCEND_COLORS[p.colors.find(x=>x.role==="structure")?.colorId??"bone-ivory"]!.hex;
 const accents=p.colors.filter(x=>x.role==="accent"||x.role==="highlight").map(x=>ASCEND_COLORS[x.colorId]!.hex);
 const bg=`<rect width="100%" height="100%" fill="${ground}"/>`;
 let out=svg.replace(/<svg([^>]*)>/,`<svg$1 data-palette="${p.id}">${bg}`);
 out=out.replace(/currentColor/g,structure);
 let pathIndex=0;
 out=out.replace(/<path ([^>]*?)>/g,(tag,attrs:string)=>{
  if(!accents.length)return tag;
  const limit=accents.length*2;
  if(pathIndex>=limit){pathIndex++;return tag;}
  const i=pathIndex++;
  const c=accents[i%accents.length]!;
  const selfClosing=/\/\s*$/.test(attrs);
  const cleanAttrs=attrs.replace(/\s*\/\s*$/,"");
  return `<path ${cleanAttrs} data-accent="${i}" stroke="${c}"${selfClosing?"/>":">"}`;
 });
 return out;
}

function culturalSignals(cultureIds:string[],objectTypes?:string[]){const signals=deriveSignals(worldPatternGraph(),{cultureIds,objectTypes,minSupport:.25});return{features:signals.filter(s=>s.kind!=="semantic").slice(0,24).map(s=>[s.value,s.support] as [string,number])};}

export function generatePatterns(input:PatternGeneratorInput):GeneratedPattern[]{
 const concepts=(input.concepts.length?input.concepts:["ancestry","freedom","protection"]).slice(0,8);
 const mode=input.mode??"band",niche=nicheForMode(mode),variations=Math.max(4,Math.min(input.variations??12,32));
 const width=input.width??960,height=input.height??260,medium=mediumForMode(mode),zone=projectionZone(mode,width,height);
 const complexity=Math.max(0,Math.min(1,input.complexity??.65));
 const cultureIds=input.cultureIds?.length?input.cultureIds:["ukraine","japan","britain","china","western-craft"];
 const placementTypes=input.placement?[input.placement,"garment","shirt","tunic","textile","textile-family","design-cloth","wrapper","sash","leather"]:undefined;
 const cultural=culturalSignals(cultureIds,placementTypes);
 const culturalConcepts=cultural.features.map(([id,w])=>({id:`structure:${id}`,weight:Math.min(1,.3+w/4)}));
 const candidates=searchDesignSpace({
  seed:input.seed,
  intent:{
   concepts:concepts.map((id,i)=>({id,weight:Math.max(.35,1-i*.09)})),
   traditions:[{id:"ascend-universal",weight:1},...cultureIds.map((id,i)=>({id:`evidence:${id}`,weight:Math.max(.35,.75-i*.05)}))],
   character:[{id:"ordered-organic",weight:.55+complexity*.35},{id:"minimal-complex",weight:complexity},...culturalConcepts,...(input.medium?[{id:`medium:${input.medium}`,weight:.9}]:[]),...(input.placement?[{id:`placement:${input.placement}`,weight:.95}]:[])]
  },
  principles:[],niches:niche?[niche]:undefined,medium,
  population:Math.round(32+complexity*64),generations:Math.round(3+complexity*5),keep:variations
 });
 const ranked=candidates.map(c=>{const aesthetic=scoreTopologyComposition(c.topology),quality=qualityGate(c.topology,aesthetic,mode);return{c,aesthetic,quality,generatorScore:c.score+aesthetic.total*18+quality.sourcePrimitiveRatio*8-quality.genericRisk*14}}).sort((a,b)=>b.generatorScore-a.generatorScore);
 const accepted=ranked.filter(x=>x.quality.accepted).slice(0,variations);
 return accepted.map(({c,aesthetic,quality,generatorScore},i)=>{
  const g=genomeFromTopology(`pattern:${input.seed}:${i}`,c.topology);
  const p=projectSemanticGeometry(g,width,height,zone);
  return {id:`pat-${input.seed}-${i+1}`,lineageId:c.lineageId,score:c.score,novelty:c.novelty,objectives:c.objectives,aesthetic,quality,generatorScore,svg:colorize(p.svg,input.paletteId??"underdog-heritage")};
 });
}
