import type {StitchIrObject,StitchIrPoint} from "./production-stitch-ir";
/** Geometry-preserving stitch travel optimizer. The original object
 * geometry is not translated or rescaled. Only independent run paths may
 * be reversed. Color blocks preserve their first-occurrence sequence.
 */
const dist=(a:StitchIrPoint,b:StitchIrPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
function ends(o:StitchIrObject):[StitchIrPoint,StitchIrPoint]{
 const p=o.kind==="fill"?o.polygon:o.path;
 if(p.length<2||p.some(q=>!Number.isFinite(q.x+q.y)))throw new Error("routing-invalid-geometry:"+o.id);
 return [p[0]!,p[p.length-1]!];
}
export function routingMetrics(objects:readonly StitchIrObject[]){
 let travelMm=0,colorChanges=0;
 for(let i=1;i<objects.length;i++){
  travelMm+=dist(ends(objects[i-1]!)[1],ends(objects[i]!)[0]);
  if(objects[i-1]!.color!==objects[i]!.color)colorChanges++;
 }
 return {travelMm,colorChanges};
}
export function optimizeStitchTravel(objects:readonly StitchIrObject[]){
 const before=routingMetrics(objects),groups=new Map<string,StitchIrObject[]>();
 for(const o of objects)groups.set(o.color,[...(groups.get(o.color)??[]),o]);
 const out:StitchIrObject[]=[];
 let cursor:StitchIrPoint={x:0,y:0};
 for(const values of groups.values()){
  const remaining=[...values];
  while(remaining.length){
   let best=0,reverse=false,cost=Infinity;
   remaining.forEach((o,i)=>{
    const [a,b]=ends(o),forward=dist(cursor,a),back=o.kind==="run"?dist(cursor,b):Infinity;
    const d=Math.min(forward,back);
    if(d<cost){cost=d;best=i;reverse=back<forward;}
   });
   let selected=remaining.splice(best,1)[0]!;
   if(reverse&&selected.kind==="run")selected={...selected,path:[...selected.path].reverse()};
   out.push(selected);cursor=ends(selected)[1];
  }
 }
 const after=routingMetrics(out);
 // Reject a "clever" route that increases either measured cost.
 return after.travelMm<=before.travelMm+1e-8&&after.colorChanges<=before.colorChanges?{objects:out,before,after}:{objects:[...objects],before,after:before};
}
