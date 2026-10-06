import type {Point,PatternPieceKind} from "./pattern";

export type PatternSourceState="pattern-specified"|"sample-measured"|"manufacturer-validated"|"production-validated";

export type PilotBlockPieceSpec={
 kind:PatternPieceKind;
 outline:Point[];
 grainline:{from:Point;to:Point};
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

export function validatePilotBlockSpec(spec:PilotBlockSpec):string[]{
 const errors:string[]=[];
 if(!spec.id.trim())errors.push("missing-block-id");
 if(!spec.revision.trim())errors.push("missing-block-revision");
 if(!spec.sourceId.trim())errors.push("missing-block-source");
 for(const kind of requiredKinds){
  const piece=spec.pieces[kind];
  if(!piece){errors.push(`missing-block-piece:${kind}`);continue}
  if(piece.kind!==kind)errors.push(`block-piece-kind-mismatch:${kind}`);
  if(piece.outline.length<3||piece.outline.some(p=>!validPoint(p)))errors.push(`invalid-block-outline:${kind}`);
  if(!validPoint(piece.grainline.from)||!validPoint(piece.grainline.to))errors.push(`invalid-block-grainline:${kind}`);
 }
 return errors;
}
