/** One compound Stitch IR source compiled to SVG and a bounded textile colour chart.
 * Chart is a design grid, not a loom-ready weave draft or embroidery machine file.
 */
import type {StitchIrObject,StitchIrPoint} from "./production-stitch-ir";
const safe=(v:number)=>Number(v.toFixed(3));
const poly=(p:StitchIrPoint[])=>p.map(x=>safe(x.x)+","+safe(x.y)).join(" ");
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
export function compoundIrSvg(objects:StitchIrObject[],widthMm:number,heightMm:number){
 const nodes=objects.map(o=>{
  const id=esc(o.id),color=esc(o.color);
  if(o.kind==="fill")return `<polygon data-object="${id}" points="${poly(o.polygon)}" fill="${color}"/>`;
  const stroke=o.kind==="satin"?Math.max(.3,o.width):.65;
  return `<polyline data-object="${id}" points="${poly(o.path)}" fill="none" stroke="${color}" stroke-width="${safe(stroke)}" stroke-linecap="round" stroke-linejoin="round"/>`;
 });
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${widthMm} ${heightMm}" width="${widthMm}mm" height="${heightMm}mm"><rect width="100%" height="100%" fill="#f6f0df"/>${nodes.join("")}</svg>`;
}
function inside(x:number,y:number,p:StitchIrPoint[]){
 let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){
  const a=p[i]!,b=p[j]!;
  if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;
 }return hit;
}
function segmentDistance(x:number,y:number,a:StitchIrPoint,b:StitchIrPoint){
 const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
 const t=den?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/den)):0;
 return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
}
export function compoundColourChart(objects:StitchIrObject[],widthMm:number,heightMm:number,cols=120,rows=120){
 if(cols<1||rows<1||cols*rows>250000)throw new Error("Invalid textile chart size");
 const palette=["#f6f0df",...new Set(objects.map(o=>o.color))];
 if(palette.length>16)throw new Error("Chart exceeds 16-colour limit");
 const grid:number[][]=[];
 for(let row=0;row<rows;row++){
  const line:number[]=[];
  for(let col=0;col<cols;col++){
   const x=(col+.5)*widthMm/cols,y=(row+.5)*heightMm/rows;
   let ink=0;
   for(const o of objects){
    const hit=o.kind==="fill"?inside(x,y,o.polygon):o.path.slice(1).some((b,i)=>segmentDistance(x,y,o.path[i]!,b)<=(o.kind==="satin"?o.width/2:Math.max(.35,widthMm/cols*.48)));
    if(hit)ink=palette.indexOf(o.color);
   }
   line.push(ink);
  }
  grid.push(line);
 }
 return {type:"textile-colour-chart-v1",widthMm,heightMm,cols,rows,palette,grid,
  caveat:"Not a loom draft: warp/weft structure, floats, sett, yarn and machine limits are not specified."};
}
