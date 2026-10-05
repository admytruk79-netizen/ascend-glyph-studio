import{buildPatternInstance,type PatternFragment,type PatternInstanceRecord}from"./pattern-fragment-graph";
export interface PixelImage{width:number;height:number;data:Uint8ClampedArray}
export interface VisionOptions{threshold?:number;sampleStep?:number;sourceId:string;sourceUrl:string;instanceId:string;objectId?:string;tradition?:string;rights?:string}
export interface VisionAnalysis{record:PatternInstanceRecord;edgeDensity:number;horizontalSymmetry:number;verticalSymmetry:number;darkCentroid:{x:number;y:number};sampledPoints:number}
const lum=(d:Uint8ClampedArray,i:number)=>.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function analyzePatternImage(img:PixelImage,o:VisionOptions):VisionAnalysis{
 const step=Math.max(1,o.sampleStep??4),thr=o.threshold??38,w=img.width,h=img.height,pts:{x:number;y:number;g:number}[]=[];let sx=0,sy=0,sw=0,edge=0,hs=0,vs=0,cmp=0;
 for(let y=step;y<h-step;y+=step)for(let x=step;x<w-step;x+=step){const i=(y*w+x)*4,l=lum(img.data,i),gx=Math.abs(l-lum(img.data,(y*w+x+step)*4)),gy=Math.abs(l-lum(img.data,((y+step)*w+x)*4)),g=gx+gy;if(g>thr){edge++;pts.push({x:x/w,y:y/h,g});}const darkness=255-l;sx+=x/w*darkness;sy+=y/h*darkness;sw+=darkness;
 const mx=(y*w+(w-1-x))*4,my=((h-1-y)*w+x)*4;hs+=1-Math.abs(l-lum(img.data,mx))/255;vs+=1-Math.abs(l-lum(img.data,my))/255;cmp++}
 const fragments:PatternFragment[]=pts.slice(0,5000).map((p,i)=>({id:`${o.instanceId}:v${i}`,kind:"node",points:[{x:+p.x.toFixed(4),y:+p.y.toFixed(4)}],parentIds:[o.instanceId],relation:"visual-edge",weight:+clamp(p.g/255).toFixed(4)}));
 const record=buildPatternInstance({instanceId:o.instanceId,sourceId:o.sourceId,objectId:o.objectId,tradition:o.tradition,sourceUrl:o.sourceUrl,rights:o.rights,fragments,reconstruction:fragments.map(f=>f.id)});
 return{record,edgeDensity:pts.length/Math.max(1,cmp),horizontalSymmetry:hs/Math.max(1,cmp),verticalSymmetry:vs/Math.max(1,cmp),darkCentroid:{x:sw?sx/sw:.5,y:sw?sy/sw:.5},sampledPoints:cmp}}
export async function imageElementToPixels(image:HTMLImageElement):Promise<PixelImage>{const c=document.createElement("canvas");c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext("2d");if(!ctx)throw new Error("Canvas 2D unavailable");ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,c.width,c.height);return{width:d.width,height:d.height,data:d.data}}
