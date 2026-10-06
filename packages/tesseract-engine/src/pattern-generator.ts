import {searchDesignSpace} from "./search";
import {genomeFromTopology} from "./genome";
import {projectSemanticGeometry} from "./semantic-projector";
import {ASCEND_PALETTES,ASCEND_COLORS} from "./color-system";
import type {DesignNicheId} from "./niches";
import {deriveSignals} from "./pattern-knowledge-graph";
import {worldPatternGraph} from "./world-pattern-graph";
import type {GarmentZone} from "./garment";
import {adaptForProduction,type MediumId} from "./medium-compiler";
import type {ImageObservation} from "./image-corpus";

export type PatternMode="band"|"field"|"emblem"|"sleeve"|"cuff"|"collar";
export type PatternGeneratorInput={
 seed:string;concepts:string[];paletteId?:string;mode?:PatternMode;
 width?:number;height?:number;variations?:number;complexity?:number;
 cultureIds?:string[];medium?:string;placement?:string;
 corpusSignals?:{id:string;weight:number;sourceIds?:string[]}[];
 population?:number;generations?:number;visualCorpus?:ImageObservation[];
};
export type GeneratedPattern={
 id:string;lineageId:string;score:number;novelty:number;svg:string;
 objectives:ReturnType<typeof searchDesignSpace>[number]["objectives"];
};

const nicheForMode=(mode:PatternMode):DesignNicheId|undefined=>({
 band:"hem-band",field:"back-field",emblem:"chest",sleeve:"sleeve",cuff:"cuff-wrap",collar:"collar"
}[mode] as DesignNicheId|undefined);

function mediumForMode(mode:PatternMode,requested?:string):MediumId{
 if(requested==="print"||requested==="embroidery"||requested==="emboss"||requested==="leather-tooling")return requested;
 return mode==="field"?"print":"embroidery";
}

function richOrnament(svg:string,mode:PatternMode,complexity:number,medium:MediumId,width:number,height:number){
 const open=svg.indexOf(">"),close=svg.lastIndexOf("</svg>");
 const body=open>=0&&close>open?svg.slice(open+1,close):svg;
 let withoutMeta=body;
 const ms=withoutMeta.indexOf("<metadata"),me=withoutMeta.indexOf("</metadata>");
 if(ms>=0&&me>=ms)withoutMeta=withoutMeta.slice(0,ms)+withoutMeta.slice(me+"</metadata>".length);
 const levels=complexity>.78?4:complexity>.52?3:2;
 const repeat=mode==="band"||mode==="cuff"||mode==="collar"||mode==="sleeve";
 const transforms:string[]=[];
 transforms.push(`<g data-rich-layer="primary">${withoutMeta}</g>`);
 if(repeat){
  const count=levels+1,step=width/count;
  for(let i=1;i<count;i++){
   const mirror=i%2?-1:1;
   const tx=i*step+(mirror<0?step:0);
   transforms.push(`<g data-rich-layer="rhythm-${i}" transform="translate(${tx.toFixed(2)} 0) scale(${mirror} 1) translate(${(-i*step).toFixed(2)} 0)" opacity="${(0.82-i*.07).toFixed(2)}">${withoutMeta}</g>`);
  }
 }else{
  for(let i=1;i<levels;i++){
   const s=1-i*.14,dx=width*(1-s)/2,dy=height*(1-s)/2;
   transforms.push(`<g data-rich-layer="nested-${i}" transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${s.toFixed(3)})" opacity="${(0.72-i*.1).toFixed(2)}">${withoutMeta}</g>`);
  }
 }
 if(complexity>.7){
  transforms.push(`<g data-rich-layer="interruption" transform="translate(${(width*.035).toFixed(2)} ${(height*.055).toFixed(2)}) scale(.93)" opacity=".42">${withoutMeta}</g>`);
 }
 const stroke=medium==="print"?1.8:medium==="embroidery"?2.8:medium==="emboss"?3.2:3.5;
 const filter=medium==="emboss"||medium==="leather-tooling"?` filter="url(#rich-relief)"`:"";
 const defs=(medium==="emboss"||medium==="leather-tooling")?`<defs><filter id="rich-relief"><feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b"/><feSpecularLighting in="b" surfaceScale="3" specularConstant=".55" specularExponent="18" lighting-color="white" result="s"><feDistantLight azimuth="225" elevation="45"/></feSpecularLighting><feComposite in="s" in2="SourceAlpha" operator="in" result="si"/><feMerge><feMergeNode in="si"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`:"";
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-rich-composition="true" data-medium="${medium}" data-levels="${levels}">${defs}<g fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"${filter}>${transforms.join("")}</g></svg>`;
}

function projectionZone(mode:PatternMode,width:number,height:number):GarmentZone{
 const wrap=mode==="band"||mode==="cuff"||mode==="collar"||mode==="sleeve";
 const kind=mode==="band"?"hem":mode==="field"?"back":mode==="emblem"?"chest":mode;
 return {
  id:`generator:${mode}`,
  kind,
  surface:mode==="sleeve"?"tapered-cylinder":wrap?"cylinder":"flat",
  widthMm:width,
  heightMm:height,
  editable:true,
  wrapAllowed:wrap
 };
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
  return `<path ${attrs} data-accent="${i}" stroke="${c}">`;
 });
 return out;
}

function culturalSignals(cultureIds:string[],objectTypes?:string[]){const signals=deriveSignals(worldPatternGraph(),{cultureIds,objectTypes,minSupport:.25});return{features:signals.filter(s=>s.kind!=="semantic").slice(0,24).map(s=>[s.value,s.support] as [string,number])};}

export function generatePatterns(input:PatternGeneratorInput):GeneratedPattern[]{
 const concepts=(input.concepts.length?input.concepts:["ancestry","freedom","protection"]).slice(0,8);
 const mode=input.mode??"band",niche=nicheForMode(mode),variations=Math.max(4,Math.min(input.variations??12,32));
 const width=input.width??960,height=input.height??260,medium=mediumForMode(mode,input.medium),zone=projectionZone(mode,width,height);
 const complexity=Math.max(0,Math.min(1,input.complexity??.65));
 const cultureIds=input.cultureIds?.length?input.cultureIds:["ukraine","japan","britain","china","western-craft"];
 const placementTypes=input.placement?[input.placement,"garment","shirt","tunic","textile","textile-family","design-cloth","wrapper","sash","leather"]:undefined;
 const cultural=culturalSignals(cultureIds,placementTypes);
 const culturalConcepts=cultural.features.map(([id,w])=>({id:`structure:${id}`,weight:Math.min(1,.3+w/4)}));
 const corpusConcepts=(input.corpusSignals??[]).slice(0,96).map(s=>({id:`corpus:${s.id}`,weight:Math.max(.15,Math.min(1,s.weight))}));
 const candidates=searchDesignSpace({
  seed:input.seed,
  intent:{
   concepts:[...concepts.map((id,i)=>({id,weight:Math.max(.35,1-i*.09)})),...culturalConcepts,...corpusConcepts],
   traditions:[{id:"ascend-universal",weight:1},...cultureIds.map((id,i)=>({id:`evidence:${id}`,weight:Math.max(.35,.75-i*.05)}))],
   character:[{id:"ordered-organic",weight:.55+complexity*.35},{id:"minimal-complex",weight:complexity},...(input.medium?[{id:`medium:${input.medium}`,weight:.9}]:[]),...(input.placement?[{id:`placement:${input.placement}`,weight:.95}]:[])]
  },
  principles:[],niches:niche?[niche]:undefined,medium,visualCorpus:input.visualCorpus,
  population:input.population??Math.round(32+complexity*64),generations:input.generations??Math.round(3+complexity*5),keep:variations
 });
 return candidates.map((c,i)=>{
  const adapted=adaptForProduction(c.topology,medium,niche);
  const g=genomeFromTopology(`pattern:${input.seed}:${i}`,adapted.topology);
  const p=projectSemanticGeometry(g,width,height,zone);
  const rich=richOrnament(p.svg,mode,complexity,medium,width,height);
  return {id:`pat-${input.seed}-${i+1}`,lineageId:c.lineageId,score:c.score,novelty:c.novelty,objectives:c.objectives,svg:colorize(rich,input.paletteId??"underdog-heritage")};
 });
}
