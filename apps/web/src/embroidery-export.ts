import {prepareEmbroideryArtwork,digitizeArtworkPixels} from '../../../packages/stitch-engine/src/visible-artwork';
import {previewSvg} from '../../../packages/stitch-engine/src/preview';
import type {DesignObject} from '../../../packages/stitch-engine/src/plan';
export async function compileEmbroidery(svg:string,objects:DesignObject[],widthMm:number,heightMm:number){
 const prepared=prepareEmbroideryArtwork(svg,objects),mm=.2,cols=Math.round(widthMm/mm),rows=Math.round(heightMm/mm);
 async function raster(text:string){const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=cols;canvas.height=rows;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.drawImage(img,0,0,cols,rows);return ctx.getImageData(0,0,cols,rows).data;}finally{URL.revokeObjectURL(url);}}
 const [data,kind]=await Promise.all([raster(prepared.artwork),raster(prepared.kindArtwork)]);const p=digitizeArtworkPixels(data,kind,cols,rows,mm,prepared.colors,objects);
 return {dst:p.dst,preview:previewSvg(p.commands,p.colors),report:{...p.report,threadSequence:p.colors,physicalSizeMm:{width:widthMm,height:heightMm},productionRelease:false}};
}
