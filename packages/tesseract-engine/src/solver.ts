import {familyBias,validateGraph} from "./grammar";
import type {Edge,Family,Node,Relation,TesseractState} from "./types";

export type GlyphInput={glyphId:string;family:Family};
export type SolveInput={seed:string;glyphs:GlyphInput[];zoneId:string;materialId:string;manufacturerId?:string;parameters:TesseractState["parameters"];variations?:number};
export type SolvedState=TesseractState&{score:number;trace:string[]};

function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function relation(seed:string,a:GlyphInput,b:GlyphInput,i:number):Relation{
 const pool=[...familyBias[a.family],...familyBias[b.family]];
 return pool[hash(seed+a.glyphId+b.glyphId+i)%pool.length]!;
}
function role(i:number,n:number):Node["role"]{return i===0?"primary":i===n-1?"accent":i%2?"secondary":"connector"}
function scoreState(s:TesseractState){
 let score=100;const trace:string[]=[];const errors=validateGraph(s);
 score-=errors.length*50;if(errors.length)trace.push(...errors.map(x=>"-50 "+x));
 const unique=new Set(s.edges.map(e=>e.relation)).size;score+=unique*3;trace.push("+relationship-diversity "+unique);
 const spirit=s.nodes.some(n=>n.family==="spirit"),earth=s.nodes.some(n=>n.family==="earth");
 if(spirit&&earth){score+=8;trace.push("+8 anchor/integration balance")}
 const ceremony=s.parameters.quietCeremonial;
 if(ceremony>.65&&s.edges.some(e=>e.relation==="enclose"||e.relation==="radiate")){score+=6;trace.push("+6 ceremonial topology fit")}
 return {score,trace};
}
export function solve(input:SolveInput):SolvedState[]{
 if(input.glyphs.length<2||input.glyphs.length>5)throw new Error("glyph-count-must-be-2-to-5");
 const count=Math.max(1,Math.min(input.variations??8,24));const out:SolvedState[]=[];
 for(let v=0;v<count;v++){
  const ordered=[...input.glyphs].sort((a,b)=>(hash(input.seed+a.glyphId+v)-hash(input.seed+b.glyphId+v)));
  const nodes=ordered.map((g,i)=>({id:"n"+i,glyphId:g.glyphId,family:g.family,role:role(i,ordered.length)}));
  const edges:Edge[]=[];
  for(let i=1;i<nodes.length;i++)edges.push({from:nodes[0]!.id,to:nodes[i]!.id,relation:relation(input.seed,ordered[0]!,ordered[i]!,v+i),weight:1});
  if(nodes.length>2&&v%2===0)edges.push({from:nodes[1]!.id,to:nodes.at(-1)!.id,relation:relation(input.seed,ordered[1]!,ordered.at(-1)!,v+99),weight:.7});
  const base:TesseractState={version:1,seed:input.seed+":"+v,nodes,edges,zoneId:input.zoneId,materialId:input.materialId,manufacturerId:input.manufacturerId,parameters:input.parameters,productionStatus:"digitally-valid"};
  const q=scoreState(base);out.push({...base,...q});
 }
 return out.sort((a,b)=>b.score-a.score);
}
