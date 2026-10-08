import type {MotifGrammar,MotifInstance} from "./motif-grammar";

/** Renders actual motif silhouettes; links remain structural and never become graph strokes. */
export function renderMotifGrammar(g:MotifGrammar,width=960,height=260):string{
 const parts=new Map(g.parts.map(p=>[p.id,p]));
 const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
 const draw=(i:MotifInstance)=>{
  const part=parts.get(i.partId);if(!part)return "";
  const aspect=Math.max(.001,part.geometry.aspect),w=i.scale*aspect*width,h=i.scale*height;
  const x=i.x01*width,y=i.y01*height;
  const paths=[part.geometry.silhouette,...(part.geometry.holes??[])];
  const d=paths.map(p=>'<path d="'+esc(p)+'"/>').join("");
  return '<g data-instance="'+esc(i.id)+'" data-family="'+esc(part.familyId)+'" transform="translate('+x+' '+y+') rotate('+i.rotationDeg+') scale('+(i.mirrorX?-w:w)+' '+h+')" fill-rule="evenodd">'+d+'</g>';
 };
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" data-renderer="motif-lego" fill="currentColor">'+[...g.instances].sort((a,b)=>a.layer-b.layer).map(draw).join("")+'</svg>';
}
