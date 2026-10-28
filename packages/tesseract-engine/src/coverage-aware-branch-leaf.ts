import {primitiveForForm} from "./ascend-primitives";
import type {GarmentZone} from "./garment";
import {circumferenceAt,juxtaposition,type SurfaceFootprint} from "./garment-surface-math";
import type {ProductionGlyphObject} from "./production-object";

/**
 * Experimental branch/leaf placement grammar. It CLONES only existing,
 * source-derived ASCEND branch/bifurcation and seed production glyphs. No
 * historical image paths, new cultural attributions, or SVG-only ornaments
 * enter the production pipeline.
 *
 * The "coverage" objective is balanced NOMINAL motif footprints across
 * garment thirds, with a deliberate empty-space ceiling. Actual raster mark
 * coverage is measured later from final stitch IR. Ports are provisionally
 * aligned for a separate, fail-closed stitch router; placement itself is not
 * a sewn junction, underlay or manufacturer approval.
 */
export function buildCoverageAwareBranchLeafAssembly(
 originals:readonly ProductionGlyphObject[],
 zone:GarmentZone,
 band:{minYmm:number;maxYmm:number},
 options:{maxExtra:number;minGapMm:number;minFeatureMm:number;
  maxNominalFraction?:number}
):ProductionGlyphObject[]{
 const limit=Math.max(0,Math.min(18,Math.floor(options.maxExtra)));
 const gap=options.minGapMm,minFeature=options.minFeatureMm;
 const H=zone.heightMm??0;
 if(limit<2||!Number.isFinite(gap+minFeature+H+band.minYmm+band.maxYmm)||
    gap<0||minFeature<=0||H<=0||band.minYmm<0||
    band.maxYmm>H||band.maxYmm<=band.minYmm)return [];
 const validSource=(o:ProductionGlyphObject)=>{
  const primitive=primitiveForForm(o.form);
  return !o.assembly&&!o.branchLeaf&&!o.id.includes(":rhythm:")&&
   o.geometryRef==="ascend:"+o.form&&!!primitive&&
   primitive.status!=="corpus-canonical"&&o.sourceBasis.length>0&&
   Number.isFinite(o.placement.xMm)&&Number.isFinite(o.placement.yMm)&&
   Number.isFinite(o.physical.widthMm+o.physical.heightMm)&&
   o.physical.widthMm>0&&o.physical.heightMm>0;
 };
 const branch=originals.find(o=>(o.form==="branch"||o.form==="bifurcation")&&validSource(o));
 const seed=originals.find(o=>o.form==="seed"&&validSource(o));
 if(!branch||!seed)return [];
 const occupied:SurfaceFootprint[]=originals.filter(o=>
  Number.isFinite(o.placement.xMm)&&Number.isFinite(o.placement.yMm)&&
  o.physical.widthMm>0&&o.physical.heightMm>0).map(o=>({
   id:o.id,u:o.placement.xMm!,v:o.placement.yMm!,
   widthMm:o.physical.widthMm,heightMm:o.physical.heightMm,
   rotationDeg:o.placement.rotationDeg??o.physical.rotationDeg,
   clearanceMm:Math.max(gap,o.physical.clearanceMm)
  }));
 const bandHeight=band.maxYmm-band.minYmm;
 const bandArea=(circumferenceAt(zone,band.minYmm)+
  circumferenceAt(zone,band.maxYmm))/2*bandHeight;
 if(!(bandArea>0))return [];
 const maxFraction=Math.max(.05,Math.min(.45,options.maxNominalFraction??.28));
 const out:ProductionGlyphObject[]=[];
 const extent=(f:SurfaceFootprint)=>{
  const a=(f.rotationDeg??0)*Math.PI/180;
  return {x:(Math.abs(Math.cos(a))*f.widthMm+Math.abs(Math.sin(a))*f.heightMm)/2,
   y:(Math.abs(Math.sin(a))*f.widthMm+Math.abs(Math.cos(a))*f.heightMm)/2};
 };
 const fits=(f:SurfaceFootprint,existing:readonly SurfaceFootprint[])=>{
  const e=extent(f);
  if(f.v-e.y<band.minYmm+gap||f.v+e.y>band.maxYmm-gap)return false;
  // Check both edges of a tapered sleeve, never just the center.
  const C=Math.min(circumferenceAt(zone,f.v-e.y),circumferenceAt(zone,f.v+e.y));
  return f.u-e.x>=gap&&f.u+e.x<=C-gap&&
   existing.every(p=>juxtaposition(zone,f,p).valid);
 };
 const clone=(source:ProductionGlyphObject,id:string,x:number,y:number,
  factor:number,role:"stem"|"leaf",anchorId:string,clusterId:string
 ):ProductionGlyphObject|undefined=>{
  const w=source.physical.widthMm*factor,h=source.physical.heightMm*factor;
  const satin=source.embroidery.satinWidthMm;
  const scaledSatin=satin===undefined?undefined:satin*factor;
  const status=primitiveForForm(source.form)?.status;
  if(!status||status==="corpus-canonical"||w<minFeature*4||h<minFeature*4||
     (scaledSatin!==undefined&&(scaledSatin<.7||scaledSatin>8)))return undefined;
  return {...source,id,
   physical:{...source.physical,widthMm:w,heightMm:h},
   placement:{...source.placement,xMm:x,yMm:y},
   embroidery:{...source.embroidery,
    ...(scaledSatin===undefined?{}:{satinWidthMm:scaledSatin})},
   assembly:{tier:role==="stem"?"macro":"micro",anchorId,scaleFactor:factor},
   branchLeaf:{clusterId,role,sourcePrimitiveStatus:status,validationState:"REFERENCE"}
  };
 };
 const footprint=(o:ProductionGlyphObject):SurfaceFootprint=>({
  id:o.id,u:o.placement.xMm!,v:o.placement.yMm!,
  widthMm:o.physical.widthMm,heightMm:o.physical.heightMm,
  rotationDeg:o.placement.rotationDeg??o.physical.rotationDeg,
  clearanceMm:Math.max(gap,o.physical.clearanceMm)
 });
 const thirdFor=(f:SurfaceFootprint)=>Math.min(2,Math.max(0,
  Math.floor(3*f.u/circumferenceAt(zone,f.v))));
 const density=()=>{
  const a=[0,0,0];
  for(const f of occupied){
   if(f.v>=band.minYmm&&f.v<=band.maxYmm)
    a[thirdFor(f)]!+=f.widthMm*f.heightMm;
  }
  return a;
 };
 const total=()=>occupied.reduce((n,f)=>
  n+(f.v>=band.minYmm&&f.v<=band.maxYmm?f.widthMm*f.heightMm:0),0);
 // Three passes allow a low/high cadence while keeping unfilled gaps.
 for(let pass=0;pass<3&&out.length+2<=limit;pass++){
  const thirdOrder=[1,0,2].sort((a,b)=>{
   const d=density();
   return d[a]!-d[b]!||[1,0,2].indexOf(a)-[1,0,2].indexOf(b);
  });
  for(const third of thirdOrder){
   if(out.length+2>limit)break;
   let accepted=false;
   for(const xf of [.5,.32,.68]){
    if(accepted)break;
    const y=band.minYmm+bandHeight*[.5,.34,.66][pass]!;
    const x=circumferenceAt(zone,y)*(third+xf)/3;
    const clusterId="branch-leaf:"+pass+":"+third;
    const stem=clone(branch,branch.id+":"+clusterId+":stem",x,y,.85,
     "stem",branch.id,clusterId);
    if(!stem||!fits(footprint(stem),occupied))continue;
    const leaves:ProductionGlyphObject[]=[];
    // Aim each seed's existing growth port back at the corresponding
    // existing branch port. Spatial proximity alone previously left the
    // growth port pointing upward, so the stitch router rejected every
    // horizontal branch-to-seed junction.
    const stemPrimitive=primitiveForForm(stem.form);
    const leafPrimitive=primitiveForForm(seed.form);
    const stemBox=stemPrimitive?.viewBox.trim().split(/[\s,]+/).map(Number);
    const leafBox=leafPrimitive?.viewBox.trim().split(/[\s,]+/).map(Number);
    const growth=leafPrimitive?.ports.find(p=>p.id==="growth");
    const validBox=(v:number[]|undefined)=>!!v&&v.length===4&&
     v.every(Number.isFinite)&&v[2]!>0&&v[3]!>0;
    if(!validBox(stemBox)||!validBox(leafBox)||!growth)continue;
    const stemRotation=(stem.placement.rotationDeg??stem.physical.rotationDeg)*Math.PI/180;
    const stemC=Math.cos(stemRotation),stemS=Math.sin(stemRotation);
    for(const sign of [-1,1]){
     if(out.length+1+leaves.length>=limit)break;
     const port=stemPrimitive!.ports.find(p=>p.id===(sign<0?"left":"right"));
     if(!port)continue;
     const dx=((port.x-stemBox![0]!)/stemBox![2]!-.5)*stem.physical.widthMm;
     const dy=((port.y-stemBox![1]!)/stemBox![3]!-.5)*stem.physical.heightMm;
     const anchorX=stem.placement.xMm!+dx*stemC-dy*stemS;
     const anchorY=stem.placement.yMm!+dx*stemS+dy*stemC;
     const angle=port.angleDeg*Math.PI/180+stemRotation;
     const rotationDeg=port.angleDeg+(stem.placement.rotationDeg??stem.physical.rotationDeg)+180-growth.angleDeg;
     const leafRotation=rotationDeg*Math.PI/180;
     const leafW=seed.physical.widthMm*.65,leafH=seed.physical.heightMm*.65;
     const leafDx=((growth.x-leafBox![0]!)/leafBox![2]!-.5)*leafW;
     const leafDy=((growth.y-leafBox![1]!)/leafBox![3]!-.5)*leafH;
     const rotatedDx=leafDx*Math.cos(leafRotation)-leafDy*Math.sin(leafRotation);
     const rotatedDy=leafDx*Math.sin(leafRotation)+leafDy*Math.cos(leafRotation);
     for(const span of [Math.max(10,gap*3+5),Math.max(14,gap*3+9),Math.max(18,gap*3+13)]){
      if(span>28)continue; // router's conservative provisional maximum
      const x=anchorX+Math.cos(angle)*span-rotatedDx;
      const y=anchorY+Math.sin(angle)*span-rotatedDy;
      const candidate=clone(seed,seed.id+":"+clusterId+":leaf:"+sign,
       x,y,.65,"leaf",stem.id,clusterId);
      if(!candidate)continue;
      const leaf={...candidate,placement:{...candidate.placement,rotationDeg}};
      if(fits(footprint(leaf),[...occupied,footprint(stem),
       ...leaves.map(footprint)])){leaves.push(leaf);break;}
     }
    }
    // Never emit an isolated stem; this is an atomic cluster.
    if(!leaves.length)continue;
    const proposed=[stem,...leaves],added=proposed.reduce((n,o)=>
     n+o.physical.widthMm*o.physical.heightMm,0);
    const current=density(),byThird=[...current];
    for(const o of proposed){
     const f=footprint(o);
     byThird[thirdFor(f)]!+=f.widthMm*f.heightMm;
    }
    if(total()+added>bandArea*maxFraction||
       byThird.some(v=>v>bandArea/3*.46))continue;
    out.push(...proposed);
    occupied.push(...proposed.map(footprint));
    accepted=true;
   }
  }
 }
 return out;
}
