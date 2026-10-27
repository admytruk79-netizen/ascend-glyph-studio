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
 * coverage is measured later from final stitch IR. Proximity is not a sewn
 * junction: no connector, underlay or manufacturer approval is implied.
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
    const sx=stem.placement.xMm!,sy=stem.placement.yMm!;
    const leafW=seed.physical.widthMm*.65;
    const offset=stem.physical.widthMm/2+leafW/2+gap*1.5;
    for(const sign of [-1,1]){
     if(out.length+1+leaves.length>=limit)break;
     const leaf=clone(seed,seed.id+":"+clusterId+":leaf:"+sign,
      sx+sign*offset,sy-stem.physical.heightMm*.18,.65,
      "leaf",stem.id,clusterId);
     if(leaf&&fits(footprint(leaf),[...occupied,footprint(stem),
      ...leaves.map(footprint)]))leaves.push(leaf);
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
