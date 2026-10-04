import{TesseractMeaningGraph}from"./tesseract-meta-grammar";
export type MicroKind="bud"|"petal"|"seed"|"leaf"|"berry"|"ring"|"broken-ring"|"tiny-rosette";
export type MesoKind="vine"|"floral-chain"|"rosette-band"|"branch-register"|"orbital-chain"|"woven-field";
export interface MicroMark{id:string;kind:MicroKind;x:number;y:number;scale:number;rotation:number}
export interface MesoPattern{id:string;kind:MesoKind;marks:MicroMark[];macroNodeId:string}
export interface MultiscaleField{schema:"ascend.multiscale-field.v1";seed:string;microCount:number;meso:MesoPattern[];macroPath:{nodeId:string;x:number;y:number}[]}
const MICRO:MicroKind[]=["bud","petal","seed","leaf","berry","ring","broken-ring","tiny-rosette"];
const MESO:MesoKind[]=["vine","floral-chain","rosette-band","branch-register","orbital-chain","woven-field"];
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
export function buildMultiscaleField(g:TesseractMeaningGraph,microPerNode=24):MultiscaleField{
 if(microPerNode<8||microPerNode>256)throw new Error("microPerNode must be 8-256");
 const meso=g.nodes.map((node,i)=>{const h=hash(g.seed+"|micro|"+node.id),kind=MESO[(h+i)%MESO.length],marks:MicroMark[]=[];
  for(let j=0;j<microPerNode;j++){const t=j/Math.max(1,microPerNode-1),wave=Math.sin(t*Math.PI*2*(2+(h%4))+i),baseX=10+80*t,baseY=12+76*i/Math.max(1,g.nodes.length-1);
   const radial=kind==="rosette-band"||kind==="orbital-chain",a=t*Math.PI*2;
   marks.push({id:`${node.id}-m${j+1}`,kind:MICRO[(h+j*5+i)%MICRO.length],
    x:Number((radial?50+(14+i%3*4)*Math.cos(a):baseX).toFixed(3)),
    y:Number((radial?baseY+(7+i%2*3)*Math.sin(a):baseY+wave*(2+(h%4))).toFixed(3)),
    scale:Number((.12+((h>>>j%16)%13)/100).toFixed(3)),rotation:(h+j*37)%360});
  }return{id:`meso-${node.id}`,kind,marks,macroNodeId:node.id};
 });
 const macroPath=g.nodes.map((node,i)=>({nodeId:node.id,x:Number((50+8*Math.sin(i*.9+node.phase*Math.PI/180)).toFixed(3)),y:Number((94-88*i/Math.max(1,g.nodes.length-1)).toFixed(3))}));
 return{schema:"ascend.multiscale-field.v1",seed:g.seed,microCount:meso.reduce((n,x)=>n+x.marks.length,0),meso,macroPath};
}
export function renderMultiscaleSvg(field:MultiscaleField):string{
 const micro=(m:MicroMark)=>{const s=2.2*m.scale,x=m.x,y=m.y,r=m.rotation;
  const d=m.kind==="ring"||m.kind==="broken-ring"?`<circle cx="${x}" cy="${y}" r="${s}" fill="none" stroke="currentColor" stroke-width=".45"${m.kind==="broken-ring"?' stroke-dasharray="3 2"':""}/>`:
   m.kind==="leaf"?`<path d="M${x-s} ${y}Q${x} ${y-s*1.5} ${x+s} ${y}Q${x} ${y+s*1.5} ${x-s} ${y}Z" fill="none" stroke="currentColor" stroke-width=".4"/>`:
   m.kind==="tiny-rosette"?`<path d="M${x} ${y-s*1.6}L${x+s*.6} ${y-s*.5}L${x+s*1.5} ${y}L${x+s*.6} ${y+s*.5}L${x} ${y+s*1.6}L${x-s*.6} ${y+s*.5}L${x-s*1.5} ${y}L${x-s*.6} ${y-s*.5}Z" fill="none" stroke="currentColor" stroke-width=".4"/>`:
   `<ellipse cx="${x}" cy="${y}" rx="${s*.65}" ry="${s*1.2}" fill="none" stroke="currentColor" stroke-width=".4"/>`;
  return `<g transform="rotate(${r} ${x} ${y})">${d}</g>`};
 const path=field.macroPath.map((p,i)=>`${i?"L":"M"}${p.x} ${p.y}`).join(" ");
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><metadata>${JSON.stringify({schema:field.schema,seed:field.seed,microCount:field.microCount})}</metadata><path d="${path}" fill="none" stroke="currentColor" stroke-opacity=".16" stroke-width=".35"/><g>${field.meso.flatMap(x=>x.marks).map(micro).join("")}</g></svg>`;
}
