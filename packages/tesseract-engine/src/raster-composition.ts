import type {ImageObservation} from "./image-corpus";

/** Platform-neutral pixel extractor. Input must already be decoded, resized and
 * rights-cleared by the ingestion worker. No image fetch or permissions are implied.
 * Indicators are observational proxies, not detected cultural motifs.
 */
export type RasterInput={width:number;height:number;rgba:Uint8Array|Uint8ClampedArray};
export type PixelIndicators={density:number;voidRatio:number;symmetry:number;periodicity:number;densityVariation:number;directionalEntropy:number;scaleLevels:number};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export function analyzeRaster(input:RasterInput):PixelIndicators{
 const {width:w,height:h,rgba}=input;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<8||h<8||w*h>4_000_000||rgba.length!==w*h*4)throw new Error("invalid-raster");
 const gray=new Float64Array(w*h);let min=255,max=0;
 for(let i=0;i<w*h;i++){const a=rgba[i*4+3]!/255;const v=(.2126*rgba[i*4]!+.7152*rgba[i*4+1]!+.0722*rgba[i*4+2]!)*a+255*(1-a);gray[i]=v;min=Math.min(min,v);max=Math.max(max,v);}
 if(max-min<12)return {density:0,voidRatio:1,symmetry:1,periodicity:0,densityVariation:0,directionalEntropy:0,scaleLevels:1};
 const threshold=(min+max)/2;
 const mask=Uint8Array.from(gray,v=>v<threshold?1:0);
 const count=mask.reduce((a,b)=>a+b,0),density=count/mask.length;
 let equality=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)equality+=mask[y*w+x]===mask[y*w+w-x-1]?1:0;
 const symmetry=equality/(w*h);
 const regions:number[]=[];for(let by=0;by<4;by++)for(let bx=0;bx<4;bx++){
  let n=0,filled=0;
  for(let y=Math.floor(by*h/4);y<Math.floor((by+1)*h/4);y++)for(let x=Math.floor(bx*w/4);x<Math.floor((bx+1)*w/4);x++){n++;filled+=mask[y*w+x]!;}
  regions.push(filled/Math.max(1,n));
 }
 const avg=regions.reduce((a,b)=>a+b,0)/regions.length;
 const densityVariation=clamp(Math.sqrt(regions.reduce((a,b)=>a+(b-avg)**2,0)/regions.length)*2);
 let horizontal=0,vertical=0,diagonal=0;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const gx=gray[y*w+x+1]!-gray[y*w+x-1]!,gy=gray[(y+1)*w+x]!-gray[(y-1)*w+x]!;
  const ax=Math.abs(gx),ay=Math.abs(gy);if(ax+ay<18)continue;
  if(ax>ay*1.8)vertical++;else if(ay>ax*1.8)horizontal++;else diagonal++;
 }
 const total=horizontal+vertical+diagonal;
 const entropy=total?[horizontal,vertical,diagonal].reduce((s,n)=>{const p=n/total;return p?s-p*Math.log(p):s;},0)/Math.log(3):0;
 // Nontrivial horizontal autocorrelation, excluding immediate neighboring pixels.
 let periodicity=0;
 for(let lag=Math.max(2,Math.floor(w/16));lag<=Math.floor(w/2);lag++){
  let agrees=0,samples=0;
  for(let y=0;y<h;y+=2)for(let x=0;x<w-lag;x+=2){agrees+=mask[y*w+x]===mask[y*w+x+lag]?1:0;samples++;}
  const raw=agrees/Math.max(1,samples);
  const chance=density*density+(1-density)*(1-density);
  periodicity=Math.max(periodicity,clamp((raw-chance)/Math.max(.001,1-chance)));
 }
 // Binary occupancy across multiple 2^k grids indicates visible hierarchy.
 let active=0;for(const grid of [1,2,4,8]){let mixed=false;for(let by=0;by<grid;by++)for(let bx=0;bx<grid;bx++){
  let ink=0,n=0;for(let y=Math.floor(by*h/grid);y<Math.floor((by+1)*h/grid);y++)for(let x=Math.floor(bx*w/grid);x<Math.floor((bx+1)*w/grid);x++){ink+=mask[y*w+x]!;n++;}
  if(n&&ink/n>.08&&ink/n<.92)mixed=true;
 }if(mixed)active++;}
 return {density:clamp(density),voidRatio:clamp(1-density),symmetry:clamp(symmetry),periodicity:clamp(periodicity),densityVariation,directionalEntropy:clamp(entropy),scaleLevels:Math.max(1,active)};
}
export function observationFromRaster(raster:RasterInput,metadata:Omit<ImageObservation,"features">):ImageObservation{
 const metrics=analyzeRaster(raster);
 return {...metadata,features:{...metrics},notes:[...metadata.notes,"Pixel-derived structural metrics; motifs and cultural meaning not inferred."]};
}
