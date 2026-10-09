import type {StitchIrObject,StitchIrPoint} from "../packages/tesseract-engine/src/production-stitch-ir";
const safeColor=(s:string)=>/^#[0-9a-fA-F]{3,8}$/.test(s)?s:"#111111";
const path=(pts:StitchIrPoint[])=>pts.map((p,i)=>(i?"L":"M")+p.x.toFixed(3)+" "+p.y.toFixed(3)).join(" ");
export function stitchIrPreview(objects:StitchIrObject[],width:number,height:number):string {
 if(!(width>0&&height>0)||!Number.isFinite(width+height))throw new Error("invalid preview dimensions");
 let body="";
 for(const o of objects){
  const pts=o.kind==="fill"?o.polygon:o.path;
  if(pts.length<2||pts.some(p=>!Number.isFinite(p.x+p.y)))throw new Error("nonfinite stitch geometry: "+o.id);
  const d=path(pts),color=safeColor(o.color);
  if(o.kind==="fill")body+=`<path d="${d} Z" fill="${color}" fill-opacity=".25" stroke="${color}" stroke-width=".35"/>`;
  else body+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="${o.kind==="satin"?Math.max(.4,o.width):.4}" stroke-linejoin="round" stroke-linecap="round"/>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}mm" height="${height}mm"><rect width="100%" height="100%" fill="#faf8f0"/>${body}</svg>`;
}
