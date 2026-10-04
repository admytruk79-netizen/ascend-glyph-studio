export type MetaNodeKind="root"|"axis"|"path"|"guardian"|"transform"|"flower"|"flight"|"ascent"|"crown"|"return";
export type ProjectionKind="linear-band"|"vertical-journey"|"radial-field"|"macro-emblem"|"layered-field";
export interface MetaNode{id:string;kind:MetaNodeKind;weight:number;phase:number}
export interface MetaEdge{from:string;to:string;relation:"grounds"|"opens"|"guards"|"transforms"|"branches"|"orbits"|"returns"}
export interface TesseractMeaningGraph{schema:"ascend.tesseract-meaning-graph.v1";seed:string;nodes:MetaNode[];edges:MetaEdge[]}
export interface ProjectionPoint{nodeId:string;x:number;y:number;scale:number;rotation:number}
export interface TesseractProjection{kind:ProjectionKind;points:ProjectionPoint[];graphSeed:string;semanticChecksum:string}
const kinds:MetaNodeKind[]=["root","axis","path","guardian","transform","flower","flight","ascent","crown","return"];
const rel:MetaEdge["relation"][]=["grounds","opens","guards","transforms","branches","orbits","returns"];
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
export function buildMeaningGraph(seed:string):TesseractMeaningGraph{
 const nodes=kinds.map((kind,i)=>({id:`n${String(i+1).padStart(2,"0")}`,kind,weight:Number((.55+(hash(seed+kind)%450)/1000).toFixed(3)),phase:(hash(kind+seed)%360)}));
 const edges=nodes.slice(0,-1).map((n,i)=>({from:n.id,to:nodes[i+1].id,relation:rel[i%rel.length]}));
 edges.push({from:nodes[nodes.length-1].id,to:nodes[1].id,relation:"returns"});
 return{schema:"ascend.tesseract-meaning-graph.v1",seed,nodes,edges};
}
const checksum=(g:TesseractMeaningGraph)=>hash(JSON.stringify(g)).toString(16).padStart(8,"0");
export function projectMeaningGraph(g:TesseractMeaningGraph,kind:ProjectionKind):TesseractProjection{
 const n=g.nodes.length,points=g.nodes.map((node,i)=>{const t=n===1?0:i/(n-1),a=2*Math.PI*i/n+node.phase*Math.PI/180;
  if(kind==="linear-band")return{nodeId:node.id,x:8+84*t,y:50+10*Math.sin(a*2),scale:.55+node.weight*.45,rotation:(i%2?180:0)};
  if(kind==="vertical-journey")return{nodeId:node.id,x:50+9*Math.sin(a),y:92-84*t,scale:.55+node.weight*.5,rotation:0};
  if(kind==="radial-field")return{nodeId:node.id,x:50+34*Math.cos(a),y:50+34*Math.sin(a),scale:.5+node.weight*.42,rotation:a*180/Math.PI+90};
  if(kind==="macro-emblem"){const r=12+24*(i%3)/2;return{nodeId:node.id,x:50+r*Math.cos(a),y:50+r*Math.sin(a),scale:.6+node.weight*.48,rotation:(i*36)%360}}
  const ring=i%2?30:17;return{nodeId:node.id,x:50+ring*Math.cos(a),y:50+ring*Math.sin(a),scale:.5+node.weight*.38,rotation:(node.phase+i*18)%360};
 });
 return{kind,points,graphSeed:g.seed,semanticChecksum:checksum(g)};
}
export function allProjections(g:TesseractMeaningGraph){return(["linear-band","vertical-journey","radial-field","macro-emblem","layered-field"] as ProjectionKind[]).map(k=>projectMeaningGraph(g,k))}
