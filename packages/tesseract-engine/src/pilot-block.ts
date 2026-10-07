import type {NoGoZone,Point,PatternPieceKind,SeamKind} from "./pattern";
import type {GarmentZoneKind} from "./garment";

export type PatternSourceState="pattern-specified"|"sample-measured"|"manufacturer-validated"|"production-validated";

export type PilotBlockSeamSpec={
 id:string;kind:SeamKind;edge:string;edgePath:Point[];
 joins?:{pieceKind:PatternPieceKind;seamId:string};
 allowanceMm:number;crossDesignAllowed:boolean;registrationToleranceMm?:number;
 registrationAnchors?:Point[];
};

export type PilotBlockPieceSpec={
 kind:PatternPieceKind;
 outline:Point[];
 grainline:{from:Point;to:Point};
 designZones:{kind:GarmentZoneKind;polygon:Point[];wrapGroupId?:string}[];
 seams:PilotBlockSeamSpec[];
 noGoZones:NoGoZone[];
};

export type PilotBlockSpec={
 id:string;
 revision:string;
 sourceId:string;
 sourceState:PatternSourceState;
 pieces:Partial<Record<PatternPieceKind,PilotBlockPieceSpec>>;
};

const requiredKinds:PatternPieceKind[]=["front-left","front-right","back","yoke","sleeve-left","sleeve-right","cuff-left","cuff-right","collar"];
const validPoint=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const validPolygon=(p:Point[])=>p.length>=3&&p.every(validPoint);

export function validatePilotBlockSpec(spec:PilotBlockSpec):string[]{
 const errors:string[]=[];
 if(!spec.id.trim())errors.push("missing-block-id");
 if(!spec.revision.trim())errors.push("missing-block-revision");
 if(!spec.sourceId.trim())errors.push("missing-block-source");
 for(const kind of requiredKinds){
  const piece=spec.pieces[kind];
  if(!piece){errors.push(`missing-block-piece:${kind}`);continue}
  if(piece.kind!==kind)errors.push(`block-piece-kind-mismatch:${kind}`);
  if(!validPolygon(piece.outline))errors.push(`invalid-block-outline:${kind}`);
  if(!validPoint(piece.grainline.from)||!validPoint(piece.grainline.to))errors.push(`invalid-block-grainline:${kind}`);
  if(!piece.designZones.length||piece.designZones.some(z=>!validPolygon(z.polygon)))errors.push(`invalid-block-design-zones:${kind}`);
  if(piece.noGoZones.some(z=>!validPolygon(z.polygon)||z.clearanceMm<0))errors.push(`invalid-block-no-go-zones:${kind}`);
  const seamIds=new Set<string>();
  for(const seam of piece.seams){
   if(!seam.id.trim()||seamIds.has(seam.id))errors.push(`invalid-or-duplicate-block-seam:${kind}:${seam.id}`);else seamIds.add(seam.id);
   if(!seam.edge.trim()||seam.edgePath.length<2||seam.edgePath.some(p=>!validPoint(p)))errors.push(`invalid-block-seam-edge:${kind}:${seam.id}`);
   if(seam.allowanceMm<0||!Number.isFinite(seam.allowanceMm))errors.push(`invalid-block-seam-allowance:${kind}:${seam.id}`);
   if(seam.registrationToleranceMm!==undefined&&(seam.registrationToleranceMm<0||!Number.isFinite(seam.registrationToleranceMm)))errors.push(`invalid-block-registration-tolerance:${kind}:${seam.id}`);
   if(seam.registrationAnchors?.some(p=>!validPoint(p)))errors.push(`invalid-block-registration-anchor:${kind}:${seam.id}`);
  }
 }
 for(const kind of requiredKinds){
  const piece=spec.pieces[kind];if(!piece)continue;
  for(const seam of piece.seams){
   if(!seam.joins)continue;
   const target=spec.pieces[seam.joins.pieceKind];
   const reciprocal=target?.seams.find(s=>s.id===seam.joins!.seamId);
   if(!target||!reciprocal)errors.push(`missing-block-seam-join:${kind}:${seam.id}`);
   else if(reciprocal.joins?.pieceKind!==kind||reciprocal.joins?.seamId!==seam.id)errors.push(`nonreciprocal-block-seam-join:${kind}:${seam.id}`);
  }
 }
 return errors;
}
