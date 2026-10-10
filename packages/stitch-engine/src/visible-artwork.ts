import type {DesignObject} from './plan.js';import {runStitch,type Stitch} from './stitches.js';import {digitizeVisibleMask} from './visible-mask.js';
const fine=(id:string)=>id.startsWith('penrose:edge:')||id.includes(':vein:')||id.endsWith(':vein')||id.endsWith(':spine');
/** Shared triangle edges are drawn repeatedly in the artwork, but sewn once.
 * Join unique edges into walks before clipping visibility, reducing repeated locks and travel.
 */
export function tracePenroseEdges(objects:DesignObject[]):DesignObject[]{
 const vertices=new Map<string,{x:number;y:number}>(),edges:{a:string;b:string;color:string}[]=[],seen=new Set<string>(),adj=new Map<string,number[]>();
 const key=(p:{x:number;y:number})=>p.x.toFixed(6)+','+p.y.toFixed(6);
 for(const o of objects){if(o.kind==='fill'||!o.id.startsWith('penrose:edge:'))continue;for(let i=1;i<o.path.length;i++){const a=key(o.path[i-1]!),b=key(o.path[i]!),k=o.color+':'+[a,b].sort().join('|');if(a===b||seen.has(k))continue;seen.add(k);vertices.set(a,o.path[i-1]!);vertices.set(b,o.path[i]!);const index=edges.length;edges.push({a,b,color:o.color});for(const v of [a,b]){const list=adj.get(v)??[];list.push(index);adj.set(v,list);}}}
 const used=new Set<number>(),out:DesignObject[]=[];
 while(used.size<edges.length){const active=[...adj].filter(([,ids])=>ids.some(i=>!used.has(i)));let start=(active.find(([,ids])=>ids.filter(i=>!used.has(i)).length%2===1)??active[0])![0];let v=start;const path=[vertices.get(v)!];let color='';
  for(;;){const index=adj.get(v)!.find(i=>!used.has(i)&&(!color||edges[i]!.color===color));if(index===undefined)break;used.add(index);const e=edges[index]!;color=e.color;v=e.a===v?e.b:e.a;path.push(vertices.get(v)!);}
  out.push({kind:'run',id:'penrose:edge:trail:'+out.length,color,path,length:1.5});
 }
 return out;
}
export function prepareEmbroideryArtwork(svg:string,objects:DesignObject[]){
 const artwork=svg.replace(/<polygon data-object="penrose:tile:[^"]*"[^>]*\/>/g,'').replace(/<rect[^>]*\/>/,'');
 const kindArtwork=artwork.replace(/<(polygon|polyline)[^>]*\/>/g,tag=>{const id=/data-object="([^"]+)"/.exec(tag)?.[1]??'';return tag.replace(/(fill|stroke)="#[0-9a-fA-F]{6}"/g,(_,attr)=>attr+'="'+(fine(id)?'#000000':'#ffffff')+'"');});
 return {artwork,kindArtwork,colors:[...new Set(objects.filter(o=>!o.id.startsWith('penrose:tile:')).map(o=>o.color))]};
}
export function digitizeArtworkPixels(data:Uint8Array|Uint8ClampedArray,kindData:Uint8Array|Uint8ClampedArray,cols:number,rows:number,mm:number,colors:string[],objects:DesignObject[]){
 if(data.length!==cols*rows*4||kindData.length!==data.length)throw Error('Invalid RGBA dimensions');
 const rgb=colors.map(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]);const mask=new Int16Array(cols*rows).fill(-1);
 for(let i=0;i<mask.length;i++){if(data[i*4+3]!<128)continue;let best=Infinity,index=-1;for(let j=0;j<rgb.length;j++){const d=rgb[j]!.reduce((n,v,k)=>n+(v-data[i*4+k]!)**2,0);if(d<best){best=d;index=j;}}mask[i]=index;}
 const fillMask=mask.slice();for(let i=0;i<mask.length;i++)if(kindData[i*4]!<128)fillMask[i]=-1;
 const detailRuns:{color:string;path:Stitch[]}[]=[];
 const visible=(p:{x:number;y:number},color:string)=>{const x=Math.floor(p.x/mm),y=Math.floor(p.y/mm);return x>=0&&x<cols&&y>=0&&y<rows&&mask[y*cols+x]===colors.indexOf(color);};
 const uniqueMesh=tracePenroseEdges(objects);
 const strokes=[...objects.filter(o=>!o.id.startsWith('penrose:edge:')),...uniqueMesh];
 for(const o of strokes){if(o.kind==='fill'||!fine(o.id))continue;const path=runStitch(o.path,1.5);let run:Stitch[]=[];
  const flush=()=>{if(run.length>=2)detailRuns.push({color:o.color,path:run});run=[];};
  for(const p of path){let clear=visible(p,o.color);const last=run.at(-1);if(clear&&last){const steps=Math.max(1,Math.ceil(Math.hypot(p.x-last.x,p.y-last.y)/mm));for(let k=1;k<steps;k++)if(!visible({x:last.x+(p.x-last.x)*k/steps,y:last.y+(p.y-last.y)*k/steps},o.color)){clear=false;break;}}
   if(!clear)flush();if(visible(p,o.color))run.push(p);
  }flush();
 }
 const result=digitizeVisibleMask(fillMask,cols,rows,mm,colors,{detailRuns});return {...result,report:{...result.report,fineLines:'running stitch',wideColumns:'visible-mask tatami',detailRuns:detailRuns.length,penroseEdgeWalks:uniqueMesh.length,sharedPenroseEdgesSewnOnce:true,backgroundTilesSewn:false}};
}
