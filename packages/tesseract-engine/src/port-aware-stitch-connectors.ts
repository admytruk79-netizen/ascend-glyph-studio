import {primitiveForForm} from "./ascend-primitives";
import type {GarmentZone} from "./garment";
import {circumferenceAt} from "./garment-surface-math";
import type {ProductionGlyphObject} from "./production-object";
import type {StitchIrPoint,StitchIrObject} from "./production-stitch-ir";

export type PortConnectionLineage={
 fromObjectId:string;toObjectId:string;fromPortId:string;toPortId:string;
 fromGeometryRef:string;toGeometryRef:string;
 fromSourceStatus:string;toSourceStatus:string;
 validationState:"REFERENCE";
};
export type PortConnectorResult={
 objects:StitchIrObject[];
 allowedOverlapPairs:string[];
 lineage:PortConnectionLineage[];
};

/**
 * Join eligible EXISTING ASCEND primitive ports with run-stitch geometry.
 * Source glyph paths are never edited. Ports are source-derived/provisional;
 * connector routing, clearance and stitch-length limits are digital REFERENCE
 * heuristics, not a manufacturer's digitizing recipe or physical sew-out.
 *
 * Fail closed: no connector is emitted unless both endpoints face each other,
 * the sampled cubic clears third-party glyph footprints and the full path
 * remains inside the garment band and seam-avoid envelope.
 */
export function buildPortAwareStitchConnectors(
 glyphs:readonly ProductionGlyphObject[],
 zone:GarmentZone,
 band:{minYmm:number;maxYmm:number},
 options:{maxConnections:number;minGapMm:number;maxSpanMm?:number;branchLeafClusterOnly?:boolean}
):PortConnectorResult{
 const empty=():PortConnectorResult=>({objects:[],allowedOverlapPairs:[],lineage:[]});
 const limit=Math.max(0,Math.min(12,Math.floor(options.maxConnections)));
 const gap=Math.max(0,options.minGapMm);
 const maxSpan=Math.max(gap*2,Math.min(40,options.maxSpanMm??28));
 if(!limit||!Number.isFinite(gap)||!Number.isFinite(maxSpan)||
    !Number.isFinite(band.minYmm+band.maxYmm)||band.maxYmm<=band.minYmm)return empty();
 const obstacles=glyphs.filter(g=>Number.isFinite(g.placement.xMm)&&
  Number.isFinite(g.placement.yMm)&&g.physical.widthMm>0&&g.physical.heightMm>0)
  .map(g=>{
   const r=(g.placement.rotationDeg??g.physical.rotationDeg)*Math.PI/180;
   const c=Math.abs(Math.cos(r)),si=Math.abs(Math.sin(r));
   return {id:g.id,x:g.placement.xMm!,y:g.placement.yMm!,
    ex:(c*g.physical.widthMm+si*g.physical.heightMm)/2,
    ey:(si*g.physical.widthMm+c*g.physical.heightMm)/2};
  });
 // Exact segment-vs-expanded-rectangle test: sparse point sampling alone can
 // miss a narrow glyph between two adjacent cubic samples.
 const hitsBox=(a:StitchIrPoint,b:StitchIrPoint,
  box:{x:number;y:number;ex:number;ey:number}):boolean=>{
  const xmin=box.x-box.ex-gap,xmax=box.x+box.ex+gap;
  const ymin=box.y-box.ey-gap,ymax=box.y+box.ey+gap;
  const dx=b.x-a.x,dy=b.y-a.y;
  let lo=0,hi=1;
  for(const [p,q] of [[-dx,a.x-xmin],[dx,xmax-a.x],[-dy,a.y-ymin],[dy,ymax-a.y]]){
   if(Math.abs(p)<1e-12){if(q<0)return false;continue;}
   const t=q/p;
   if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
   if(lo>hi)return false;
  }
  return true;
 };
 const entries=glyphs.flatMap(g=>{
  if(g.geometryRef!=="ascend:"+g.form||!Number.isFinite(g.placement.xMm)||
     !Number.isFinite(g.placement.yMm)||!(g.physical.widthMm>0)||!(g.physical.heightMm>0))return [];
  const primitive=primitiveForForm(g.form);
  if(!primitive||primitive.status==="corpus-canonical")return [];
  const vb=primitive.viewBox.trim().split(/[\s,]+/).map(Number);
  if(vb.length!==4||vb.some(n=>!Number.isFinite(n))||vb[2]!<=0||vb[3]!<=0)return [];
  const rotation=(g.placement.rotationDeg??g.physical.rotationDeg)*Math.PI/180;
  const c=Math.cos(rotation),s=Math.sin(rotation);
  const ports=primitive.ports.filter(p=>p.role!=="center").map(p=>{
   const dx=((p.x-vb[0]!)/vb[2]!-.5)*g.physical.widthMm;
   const dy=((p.y-vb[1]!)/vb[3]!-.5)*g.physical.heightMm;
   const a=(p.angleDeg*Math.PI/180)+rotation;
   return {id:p.id,point:{x:g.placement.xMm!+dx*c-dy*s,y:g.placement.yMm!+dx*s+dy*c},
    direction:{x:Math.cos(a),y:Math.sin(a)}};
  });
  const ex=(Math.abs(c)*g.physical.widthMm+Math.abs(s)*g.physical.heightMm)/2;
  const ey=(Math.abs(s)*g.physical.widthMm+Math.abs(c)*g.physical.heightMm)/2;
  return [{glyph:g,primitive,ports,box:{x:g.placement.xMm!,y:g.placement.yMm!,ex,ey}}];
 });
 const candidates:{i:number;j:number;from:number;to:number;distance:number}[]=[];
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i]!,b=entries[j]!;
  if(options.branchLeafClusterOnly&&(
   !a.glyph.branchLeaf||!b.glyph.branchLeaf||
   a.glyph.branchLeaf.clusterId!==b.glyph.branchLeaf.clusterId||
   a.glyph.branchLeaf.role===b.glyph.branchLeaf.role))continue;
  for(let p=0;p<a.ports.length;p++)for(let q=0;q<b.ports.length;q++){
   const ap=a.ports[p]!,bp=b.ports[q]!;
   const dx=bp.point.x-ap.point.x,dy=bp.point.y-ap.point.y,d=Math.hypot(dx,dy);
   if(!(d>=Math.max(.8,gap))||d>maxSpan)continue;
   if((ap.direction.x*dx+ap.direction.y*dy)/d<.35||
      (-bp.direction.x*dx-bp.direction.y*dy)/d<.35)continue;
   candidates.push({i,j,from:p,to:q,distance:d});
  }
 }
 candidates.sort((a,b)=>a.distance-b.distance||
  entries[a.i]!.glyph.id.localeCompare(entries[b.i]!.glyph.id)||
  entries[a.j]!.glyph.id.localeCompare(entries[b.j]!.glyph.id)||
  a.from-b.from||a.to-b.to);
 const used=new Map<number,number>(),usedPorts=new Set<string>();
 const objects:StitchIrObject[]=[],lineage:PortConnectionLineage[]=[];
 const allowedOverlapPairs:string[]=[];
 const pair=(a:string,b:string)=>a<b?a+"|"+b:b+"|"+a;
 const height=zone.heightMm??0;
 for(const candidate of candidates){
  if(objects.length>=limit)break;
  const {i,j,from,to,distance:d}=candidate;
  // Cap each source-port degree; experimental stems may join two leaves,
  // but a leaf and any individual port remain single-use.
  const cap=(index:number)=>options.branchLeafClusterOnly&&entries[index]!.glyph.branchLeaf?.role==="stem"?2:1;
  if((used.get(i)??0)>=cap(i)||(used.get(j)??0)>=cap(j))continue;
  const portKeyA=i+":"+from,portKeyB=j+":"+to;
  if(usedPorts.has(portKeyA)||usedPorts.has(portKeyB))continue;
  const a=entries[i]!,b=entries[j]!,ap=a.ports[from]!,bp=b.ports[to]!;
  // Never bridge different thread-color blocks with an implicit single-color run.
  if(a.glyph.threadColor!==b.glyph.threadColor)continue;
  // A connector cannot legitimize a source glyph that already straddles
  // the seam or construction band. Check both vertical edges on tapered zones.
  const anchorInside=(entry:typeof a)=>{
   const {x,y,ex,ey}=entry.box;
   const c=Math.min(circumferenceAt(zone,y-ey),circumferenceAt(zone,y+ey));
   return y-ey>=Math.max(0,band.minYmm)+gap&&
    y+ey<=Math.min(height,band.maxYmm)-gap&&x-ex>=gap&&x+ex<=c-gap;
  };
  if(!anchorInside(a)||!anchorInside(b))continue;
  const handle=Math.min(5,d*.22);
  const p0=ap.point,p3=bp.point;
  const p1={x:p0.x+ap.direction.x*handle,y:p0.y+ap.direction.y*handle};
  const p2={x:p3.x+bp.direction.x*handle,y:p3.y+bp.direction.y*handle};
  const path:StitchIrPoint[]=[];
  for(let k=0;k<=12;k++){
   const t=k/12,u=1-t;
   path.push({x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,
    y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y});
  }
  const valid=path.every(p=>{
   if(!Number.isFinite(p.x+p.y)||p.y<Math.max(0,band.minYmm)+gap||
      p.y>Math.min(height,band.maxYmm)-gap)return false;
   const C=circumferenceAt(zone,p.y);
   if(p.x<gap||p.x>C-gap)return false;
   return true;
  })&&path.slice(1).every((p,k)=>obstacles.every(box=>
   box.id===a.glyph.id||box.id===b.glyph.id||
   !hitsBox(path[k]!,p,box)));
  if(!valid)continue;
  // Reject a crossing with any previously accepted connector. Shared
  // source ports are already forbidden above, so no crossing is intentional.
  const orient=(a:StitchIrPoint,b:StitchIrPoint,c:StitchIrPoint)=>
   (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const intersects=(a:StitchIrPoint,b:StitchIrPoint,c:StitchIrPoint,d:StitchIrPoint)=>{
   const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
   return o1*o2<0&&o3*o4<0;
  };
  const crossing=objects.some(previous=>previous.kind==="run"&&
   path.slice(1).some((p,k)=>previous.path.slice(1).some((q,j)=>
    intersects(path[k]!,p,previous.path[j]!,q))));
  if(crossing)continue;
  const id="connector:"+objects.length;
  objects.push({kind:"run",id,color:a.glyph.threadColor,path,length:2.5});
  allowedOverlapPairs.push(pair(id,a.glyph.id),pair(id,b.glyph.id));
  lineage.push({fromObjectId:a.glyph.id,toObjectId:b.glyph.id,
   fromPortId:ap.id,toPortId:bp.id,
   fromGeometryRef:a.glyph.geometryRef,toGeometryRef:b.glyph.geometryRef,
   fromSourceStatus:a.primitive.status,toSourceStatus:b.primitive.status,
   validationState:"REFERENCE"});
  used.set(i,(used.get(i)??0)+1);used.set(j,(used.get(j)??0)+1);
  usedPorts.add(portKeyA);usedPorts.add(portKeyB);
 }
 return {objects,allowedOverlapPairs,lineage};
}
