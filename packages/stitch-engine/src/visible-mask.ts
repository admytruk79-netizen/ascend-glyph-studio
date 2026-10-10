import {runStitch,tieAt,type Stitch} from './stitches.js';
import {type Command,writeDst,readDst} from './dst.js';
import {dist} from './geometry.js';
/** Digitise the resolved visible colour mask, so hidden design layers are never filled.
 * Grid sampling is explicit; this is a prototype tatami plan, not automatic fabric calibration.
 */
export function digitizeVisibleMask(mask:Int16Array,cols:number,rows:number,pixelMm:number,palette:string[],options:{rowSpacing?:number;stitchLength?:number;detailRuns?:{color:string;path:Stitch[]}[]}={}){
 if(mask.length!==cols*rows||cols<1||rows<1||pixelMm<=0||!Number.isFinite(pixelMm))throw Error('Invalid mask');
 if([...mask].some(v=>v< -1||v>=palette.length))throw Error('Invalid palette index');
 const spacing=options.rowSpacing??.43,length=options.stitchLength??2.5;
 if(spacing<pixelMm||length<=0||!Number.isFinite(spacing)||!Number.isFinite(length))throw Error('Invalid stitch sampling');
 const commands:Command[]=[],blocks:{color:string;runs:Stitch[][]}[]=[],colors:string[]=[];let pos={x:0,y:0};
 for(let ci=0;ci<palette.length;ci++){
  const runs:Stitch[][]=[];let prior:{a:number;b:number;run:Stitch[]}[]=[];
  for(let y=spacing/2;y<rows*pixelMm;y+=spacing){
   const row=Math.min(rows-1,Math.floor(y/pixelMm)),segs:{a:number;b:number;run:Stitch[]}[]=[];
   for(let x=0;x<cols;){if(mask[row*cols+x]!==ci){x++;continue;}const start=x;while(x<cols&&mask[row*cols+x]===ci)x++;
    const a=(start+.5)*pixelMm,b=(x-.5)*pixelMm;if(b-a<pixelMm*.9)continue;
    const left={x:a,y},right={x:b,y};let previous=prior.find(s=>s.b>=a&&s.a<=b&&!segs.some(t=>t.run===s.run));
    const candidates=previous?[left,right].sort((p,q)=>dist(previous!.run.at(-1)!,p)-dist(previous!.run.at(-1)!,q)):[left,right];
    let bridge:Stitch[]=[];
    if(previous){const last=previous.run.at(-1)!,next=candidates[0]!,cross=Math.max(a,previous.a)+(Math.min(b,previous.b)-Math.max(a,previous.a))/2;
     const way=[last,{x:cross,y:last.y},{x:cross,y},next];let valid=true;
     for(let q=1;q<way.length;q++){const from=way[q-1]!,to=way[q]!,n=Math.max(1,Math.ceil(dist(from,to)/(pixelMm/2)));for(let k=0;k<=n;k++){const px=from.x+(to.x-from.x)*k/n,py=from.y+(to.y-from.y)*k/n;if(mask[Math.min(rows-1,Math.floor(py/pixelMm))*cols+Math.min(cols-1,Math.max(0,Math.floor(px/pixelMm)))]!==ci){valid=false;break;}}if(!valid)break;}
     if(valid)for(let q=1;q<way.length;q++)bridge.push(...runStitch([way[q-1]!,way[q]!],length).slice(1).map(p=>({...p,turn:true})));else previous=undefined;
    }
    const path=runStitch(candidates,length);const run=previous?.run??[];
    if(previous){run.push(...bridge);path.shift();}
    run.push(...path);if(!previous)runs.push(run);segs.push({a,b,run});
   }prior=segs;
  }
  for(const detail of options.detailRuns??[])if(detail.color===palette[ci]&&detail.path.length>=2)runs.push(detail.path);
  if(!runs.length)continue;
  if(colors.length)commands.push({cmd:'trim',...pos},{cmd:'color',...pos});colors.push(palette[ci]!);blocks.push({color:palette[ci]!,runs});
  const buckets=new Map<string,Stitch[][]>();for(const run of runs){const start=run[0]!;const key=Math.floor(start.y/20)+','+Math.floor(start.x/20);const bucket=buckets.get(key)??[];bucket.push(run);buckets.set(key,bucket);}
  const ordered:Stitch[][]=[];let cursor={...pos};
  for(const [,bucket] of [...buckets].sort(([a],[b])=>{const [ay,ax]=a.split(',').map(Number),[by,bx]=b.split(',').map(Number);return ay!-by!+(ay===by?(ay!%2?bx!-ax!:ax!-bx!)*.001:0);})){while(bucket.length){let index=0,best=Infinity;for(let i=0;i<bucket.length;i++){const d=dist(cursor,bucket[i]![0]!);if(d<best){best=d;index=i;}}const run=bucket.splice(index,1)[0]!;ordered.push(run);cursor=run.at(-1)!;}}
  for(const run of ordered){if(run.length<2)continue;if(commands.length&&dist(pos,run[0]!)>7)commands.push({cmd:'trim',...pos});commands.push({cmd:'jump',...run[0]!});
   for(const p of tieAt(run[0]!,run[1]!,Math.min(.7,dist(run[0]!,run[1]!))))commands.push({cmd:'stitch',...p});
   for(const p of run.slice(1))commands.push({cmd:'stitch',...p});pos=run.at(-1)!;
   for(const p of tieAt(pos,run.at(-2)!,Math.min(.7,dist(pos,run.at(-2)!))).slice(1))commands.push({cmd:'stitch',...p});
  }
 }
 if(!colors.length)throw Error('No stitchable regions');commands.push({cmd:'trim',...pos},{cmd:'end',...pos});
 const panelCenter={x:cols*pixelMm/2,y:rows*pixelMm/2};for(const c of commands){c.x-=panelCenter.x;c.y-=panelCenter.y;}
 const dst=writeDst(commands,{label:'ASCEND-VISIBLE'}),decoded=readDst(dst).commands;
 const sewn=decoded.filter(c=>c.cmd==='stitch'),xs=sewn.map(p=>p.x),ys=sewn.map(p=>p.y);
 const minX=xs.reduce((a,b)=>Math.min(a,b),Infinity),maxX=xs.reduce((a,b)=>Math.max(a,b),-Infinity),minY=ys.reduce((a,b)=>Math.min(a,b),Infinity),maxY=ys.reduce((a,b)=>Math.max(a,b),-Infinity);
 return {commands,colors,blocks,dst,report:{stitchedBoundsMm:{minX,maxX,minY,maxY,width:maxX-minX,height:maxY-minY},origin:'panel-centre',stitchCount:decoded.filter(c=>c.cmd==='stitch').length,jumpRecords:decoded.filter(c=>c.cmd==='jump').length,trimRequests:commands.filter(c=>c.cmd==='trim').length,colorChanges:decoded.filter(c=>c.cmd==='color').length,threadColors:colors.length,rowSpacingMm:spacing,maxRowStitchMm:length,samplingMm:pixelMm,underlay:'none',pullCompensationMm:0,status:'sew-out-prototype',trimEncoding:'DST three-jump convention; controller-dependent'}};
}
