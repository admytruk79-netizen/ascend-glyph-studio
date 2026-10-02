import type {SolvedState} from "../../tesseract-engine/src/solver";
import type {GlyphPlacement,SavedDesign} from "./design-manifest";

export type ProjectionMode=SavedDesign["mode"];
export type Zone={id:string;width:number;height:number;padding:number};

const angle=(i:number,n:number)=>n<2?0:(360/n)*i;
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n))}
export function project(state:SolvedState,zone:Zone,mode:ProjectionMode):SavedDesign{
 const cx=zone.width/2,cy=zone.height/2,w=Math.max(1,zone.width-zone.padding*2),h=Math.max(1,zone.height-zone.padding*2),n=state.nodes.length;
 const ceremony=state.parameters.quietCeremonial, organic=state.parameters.orderedOrganic;
 const placements:GlyphPlacement[]=state.nodes.map((node,i)=>{
  let x=cx,y=cy,rotation=0,scale=clamp(.55+(ceremony*.35)-(i*.035),.35,1.15);
  if(mode==="border"){x=zone.padding+(n===1?0:w/Math.max(1,n-1)*i);y=cy;rotation=i%2?180:0;scale*=.62}
  else if(mode==="path"){x=zone.padding+(w/Math.max(1,n-1))*i;y=cy+Math.sin((i/(Math.max(1,n-1)))*Math.PI*2)*h*.18*organic;rotation=(i/(Math.max(1,n-1)))*18-9;scale*=.7}
  else if(mode==="field"){const cols=Math.ceil(Math.sqrt(n));x=zone.padding+(i%cols+.5)*(w/cols);y=zone.padding+(Math.floor(i/cols)+.5)*(h/Math.ceil(n/cols));rotation=(i%2?1:-1)*organic*12;scale*=.58}
  else {const a=angle(i,n)-90,r=Math.min(w,h)*(.10+.20*organic)*(i===0?0:1);x=cx+Math.cos(a*Math.PI/180)*r;y=cy+Math.sin(a*Math.PI/180)*r;rotation=mode==="composition"?a+90:0;scale*=i===0?1:.72}
  return {glyphId:node.glyphId,x:+x.toFixed(3),y:+y.toFixed(3),scale:+scale.toFixed(4),rotation:+rotation.toFixed(3),mirrorX:state.edges.some(e=>e.to===node.id&&e.relation==="mirror"),mirrorY:false,z:i};
 });
 return {id:`tesseract-${state.seed.replace(/[^a-z0-9_-]/gi,"-")}`,version:1,garmentId:"ascend-linen-shirt-01",zoneId:state.zoneId,mode,placements};
}
