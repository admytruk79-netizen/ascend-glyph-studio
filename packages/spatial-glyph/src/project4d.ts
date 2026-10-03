import type {Vec3,Vec4,Projection4Dto3D} from "./types";

export function project4Dto3D(p:Vec4, projection:Projection4Dto3D):Vec3 {
 const [x,y,z,w]=p;
 if(projection.kind==="orthographic-w") return [x,y,z];
 const d=projection.wDistance ?? 4;
 if(!Number.isFinite(d)||d<=0) throw new Error("wDistance must be > 0");
 const denom=d-w;
 if(Math.abs(denom)<1e-9) throw new Error("4D point lies on projection singularity");
 const k=d/denom;
 return [x*k,y*k,z*k];
}
