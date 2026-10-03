import type {TesseractInstance,Vec4} from "./types";

export type SpatialRelation="anchor"|"nest"|"orbit"|"intersect"|"bridge"|"oppose"|"mirror"|"radiate"|"flow"|"enclose"|"repeat";

export interface RelationSpec { kind:SpatialRelation; distance?:number; wStep?:number; phase?:number; }

export function relate(parent:TesseractInstance, child:TesseractInstance, spec:RelationSpec):TesseractInstance {
 const d=spec.distance ?? 1, dw=spec.wStep ?? 1, phase=spec.phase ?? 0;
 if(!Number.isFinite(d)||d<0) throw new Error("distance must be finite and >= 0");
 if(!Number.isFinite(dw)||!Number.isFinite(phase)) throw new Error("relation values must be finite");
 const [x,y,z,w]=parent.position4;
 let p:Vec4;
 switch(spec.kind){
  case "anchor": p=[x,y,z,w+dw]; break;
  case "orbit": p=[x+d*Math.cos(phase),y+d*Math.sin(phase),z,w+dw]; break;
  case "oppose": p=[x-d*Math.cos(phase),y-d*Math.sin(phase),z,w+dw]; break;
  case "bridge": p=[(x+child.position4[0])/2,(y+child.position4[1])/2,(z+child.position4[2])/2,w+dw]; break;
  case "mirror": p=[2*x-child.position4[0],child.position4[1],child.position4[2],w+dw]; break;
  case "nest": p=[x,y,z,w+dw]; break;
  case "intersect": p=[x,y,z,w+dw]; break;
  case "radiate": p=[x+d*Math.cos(phase),y+d*Math.sin(phase),z,w+dw]; break;
  case "flow": p=[x+d*Math.cos(phase),y+d*Math.sin(phase),z+d*.25*Math.sin(phase),w+dw]; break;
  case "enclose": p=[x,y,z,w+dw]; break;
  case "repeat": p=[x+d*Math.cos(phase),y+d*Math.sin(phase),z,w+dw]; break;
 }
 return {...child,parentId:parent.id,relationship:spec.kind,position4:p};
}