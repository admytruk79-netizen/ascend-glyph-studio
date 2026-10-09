import type {StitchIrObject,StitchIrPoint} from "./production-stitch-ir";

/** Canonical preview of the EXACT transformed stitch-object geometry in millimetres.
 * Concept art may be generated independently, but the default production preview
 * must never introduce uncompiled repeat, reflection, or decoration.
 */
const safeColor=(s:string)=>/^#[0-9a-fA-F]{3,8}$/.test(s)?s:"#111111";
const path=(pts:StitchIrPoint[])=>pts.map((p,i)=>(i?"L":"M")+p.x.toFixed(3)+" "+p.y.toFixed(3)).join(" ");
export function stitchIrToSvg(objects:readonly StitchIrObject[],width:number,height:number):string{
 if(!Number.isFinite(width+height)||width<=0||height<=0)throw new Error("invalid canonical preview dimensions");
 const paths:string[]=[];
 for(const obj of objects){
  const points=obj.kind==="fill"?obj.polygon:obj.path;
  if(points.length<2||points.some(p=>!Number.isFinite(p.x+p.y)))throw new Error("invalid canonical stitch path: "+obj.id);
  const d=path(points),color=safeColor(obj.color);
  if(obj.kind==="fill")paths.push(`<path data-stitch-id="${obj.id}" d="${d} Z" fill="${color}" fill-opacity=".2" stroke="${color}" stroke-width=".35"/>`);
  else paths.push(`<path data-stitch-id="${obj.id}" d="${d}" fill="none" stroke="${color}" stroke-width="${obj.kind==="satin"?Math.max(.4,obj.width):.4}" stroke-linejoin="round" stroke-linecap="round"/>`);
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}mm" height="${height}mm" data-geometry-source="stitch-ir"><rect width="100%" height="100%" fill="#faf8f0"/>${paths.join("")}</svg>`;
}
