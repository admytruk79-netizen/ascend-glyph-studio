import{buildMeaningGraph,TesseractMeaningGraph}from"./tesseract-meta-grammar";
export type SleeveSide="left"|"right";
export type SleeveZone="cap"|"upper"|"forearm"|"cuff";
export interface SleevePoint{nodeId:string;zone:SleeveZone;x:number;y:number;scale:number;rotation:number}
export interface SleeveProjection{schema:"ascend.sleeve-projection.v1";seed:string;side:SleeveSide;mode:"mirror"|"complement"|"split-macro";points:SleevePoint[]}
const zone=(t:number):SleeveZone=>t<.18?"cap":t<.5?"upper":t<.84?"forearm":"cuff";
export function projectSleeve(g:TesseractMeaningGraph,side:SleeveSide,mode:SleeveProjection["mode"]="complement"):SleeveProjection{
 const sign=side==="left"?-1:1,n=g.nodes.length;
 const points=g.nodes.map((node,i)=>{const t=i/Math.max(1,n-1),z=zone(t),width=38-20*t,wave=Math.sin(t*Math.PI*4+node.phase*Math.PI/180);
  let x=50+sign*wave*width*.32;if(mode==="mirror"&&side==="left")x=100-x;
  if(mode==="split-macro")x=50+sign*(8+width*.22*Math.sin(t*Math.PI*2));
  const y=5+90*t,scale=z==="cap"?.85:z==="upper"?.72:z==="forearm"?.58:.48;
  return{nodeId:node.id,zone:z,x:Number(x.toFixed(3)),y:Number(y.toFixed(3)),scale:Number((scale*node.weight).toFixed(3)),rotation:mode==="complement"?(node.phase+sign*i*11)%360:sign*node.phase};
 });
 return{schema:"ascend.sleeve-projection.v1",seed:g.seed,side,mode,points};
}
export function generateSleevePair(seed:string,mode:SleeveProjection["mode"]="complement"){const g=buildMeaningGraph(seed);return{graph:g,left:projectSleeve(g,"left",mode),right:projectSleeve(g,"right",mode)}}
