import type {Topology} from "./topology";
import {primitiveForForm} from "./ascend-primitives";

/** A coherent ornament band, not a drawing of topology edges.
 * All decisions are deterministic for reproducibility and production review.
 * This is a composition foundation; canonical source paths and physical sampling
 * are still required before a design can be marked production-ready.
 */
export type BandGrammar="continuity"|"alternation"|"return"|"passage"|"development";
export type BandOptions={width?:number;height?:number;seed?:number;grammar?:BandGrammar;strokes?:number};
export type BandResult={svg:string;grammar:BandGrammar;motifCount:number;warnings:string[]};
type Motif={form:string;id:string;scale:number};
const number=(n:number)=>Number(n.toFixed(3));
const escapeXml=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]!));
function rand(seed:number){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function family(topology:Topology):Motif[]{
 const result:Motif[]=[];
 for(const node of topology.nodes){
  if(!primitiveForForm(node.form))continue;
  if(result.some(m=>m.form===node.form))continue;
  result.push({form:node.form,id:node.id,scale:Math.max(.5,Math.min(2,Number.isFinite(node.scale)?node.scale/2:1))});
 }
 return result;
}
function sequence(grammar:BandGrammar,count:number,types:number):number[]{
 const pick=(i:number)=>i%types;
 return Array.from({length:count},(_,i)=>{
  if(grammar==="alternation")return pick(i);
  if(grammar==="return")return pick(Math.min(i,count-1-i));
  if(grammar==="development")return pick(Math.floor(i/2));
  if(grammar==="passage")return i===Math.floor(count/2)?-1:pick(Math.abs(i-Math.floor(count/2))-1+types);
  return pick(Math.floor(i/3));
 });
}
export function renderCoherentBand(topology:Topology,options:BandOptions={}):BandResult{
 const width=options.width??1200,height=options.height??240,seed=options.seed??1;
 const grammar=options.grammar??"return",strokes=options.strokes??2.4;
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width>20000||height>20000)throw new Error("Invalid band dimensions");
 if(!Number.isFinite(strokes)||strokes<=0||strokes>30)throw new Error("Invalid stroke width");
 const motifs=family(topology),warnings:string[]=[];
 if(motifs.length<2)warnings.push("Insufficient distinct canonical motifs: composition requires at least two");
 if(motifs.length===0)throw new Error("No renderable ASCEND primitives in topology");
 const random=rand(seed);
 const n=Math.max(5,Math.min(15,Math.round(width/(height*.72))));
 const indices=sequence(grammar,n,motifs.length);
 const pitch=width/n;
 const y=height*.5;
 const rows=indices.map((idx,i)=>{
  if(idx<0)return `<g data-void="true" data-position="${i}"/>`;
  const motif=motifs[idx]!;
  const primitive=primitiveForForm(motif.form)!;
  const rhythm=grammar==="development"?.66+.65*i/Math.max(1,n-1):i===Math.floor(n/2)?1.14:.72+.20*random();
  const radius=Math.min(pitch*.40,height*.34)*motif.scale*rhythm;
  const s=number(radius*2/100);
  const x=number((i+.5)*pitch-radius);
  const yy=number(y-radius+(i%2?height*.055:-height*.055));
  const angle=grammar==="alternation"&&i%2?180:grammar==="return"&&i>n/2?180:0;
  const paths=primitive.paths.map(path=>`<path d="${escapeXml(path)}"/>`).join("");
  return `<g data-motif="${escapeXml(motif.form)}" data-source="${escapeXml(motif.id)}" data-position="${i}" transform="translate(${x} ${yy}) scale(${s}) rotate(${angle} 50 50)">${paths}</g>`;
 }).join("");
 const margin=number(height*.10),guideY=number(y);
 const spine=`<path data-role="continuous-spine" d="M ${margin} ${guideY} H ${number(width-margin)}" stroke-opacity=".25"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${number(width)} ${number(height)}" data-renderer="coherent-band-v1" data-grammar="${grammar}" data-seed="${seed}"><g fill="none" stroke="currentColor" stroke-width="${number(strokes)}" stroke-linecap="round" stroke-linejoin="round">${spine}${rows}</g></svg>`;
 return {svg,grammar,motifCount:indices.filter(i=>i>=0).length,warnings};
}
