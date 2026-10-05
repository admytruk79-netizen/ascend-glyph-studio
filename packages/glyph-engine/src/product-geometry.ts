export type SurfaceKind="flat"|"folded"|"cylinder"|"tapered-cylinder"|"sewn-piece"|"freeform";
export interface PointMm{x:number;y:number}
export interface GeometryZone{
 id:string;surface:SurfaceKind;outline:PointMm[];safeInsetMm:number;
 noGoZones?:{id:string;outline:PointMm[];clearanceMm:number;reason:string}[];
 wrapGroupId?:string;
}
export interface ProductGeometry{productKind:string;zones:GeometryZone[];sourceId:string;revision:string}
export interface ProductGeometryAdapter<T>{
 kind:string;
 geometry(input:T):ProductGeometry;
}
export function validateProductGeometry(g:ProductGeometry):string[]{
 const errors:string[]=[];
 if(!g.productKind.trim())errors.push("missing-product-kind");
 if(!g.sourceId.trim()||!g.revision.trim())errors.push("missing-geometry-provenance");
 const ids=new Set<string>();
 for(const z of g.zones){
  if(ids.has(z.id))errors.push(`duplicate-zone:${z.id}`);ids.add(z.id);
  if(z.outline.length<3)errors.push(`invalid-outline:${z.id}`);
  if(z.safeInsetMm<0||!Number.isFinite(z.safeInsetMm))errors.push(`invalid-safe-inset:${z.id}`);
  if(z.outline.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))errors.push(`non-finite-outline:${z.id}`);
 }
 return errors;
}
