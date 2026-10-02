export type Envelope={minScale:number;maxScale:number;minFeatureMm:number;minGapMm:number;maxWidthMm:number;maxHeightMm:number;maxColors:number;};
export type Candidate={scale:number;minFeatureMm:number;minGapMm:number;widthMm:number;heightMm:number;colors:number;};
export type Validation={valid:boolean;errors:string[];repairs:{kind:string;value:number}[]};
export function validate(c:Candidate,e:Envelope):Validation{
 const errors:string[]=[]; const repairs:{kind:string;value:number}[]=[];
 if(c.scale<e.minScale){errors.push("scale-below-min");repairs.push({kind:"scale",value:e.minScale});}
 if(c.scale>e.maxScale)errors.push("scale-above-max");
 if(c.minFeatureMm<e.minFeatureMm)errors.push("feature-too-fine");
 if(c.minGapMm<e.minGapMm){errors.push("gap-too-small");repairs.push({kind:"increase-spacing-mm",value:e.minGapMm-c.minGapMm});}
 if(c.widthMm>e.maxWidthMm||c.heightMm>e.maxHeightMm)errors.push("outside-production-envelope");
 if(c.colors>e.maxColors)errors.push("too-many-thread-colors");
 return {valid:errors.length===0,errors,repairs};
}
