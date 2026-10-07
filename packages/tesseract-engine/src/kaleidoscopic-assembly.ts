import type {MotifGrammar,MotifRelation} from "./motif-grammar";
export type MotifPort={instanceId:string;name:string;x01:number;y01:number;angleDeg:number;kind:"entry"|"exit"|"radial"|"edge"};
export type AssemblyConstraint={a:string;b:string;relation:MotifRelation;maxGap:number;angleToleranceDeg:number;scaleRatio?:[number,number]};
export type AssemblyResult={grammar:MotifGrammar;valid:boolean;score:number;violations:string[]};

const angleDelta=(a:number,b:number)=>Math.abs((((a-b)+540)%360)-180);
export function solveKaleidoscopicAssembly(g:MotifGrammar,ports:MotifPort[],constraints:AssemblyConstraint[]):AssemblyResult{
 const instanceScale=new Map(g.instances.map(i=>[i.id,i.scale]));
 const byPort=new Map(ports.map(p=>[p.instanceId+":"+p.name,p]));
 const violations:string[]=[];let penalty=0;
 for(const c of constraints){
  const a=byPort.get(c.a),b=byPort.get(c.b);
  if(!a||!b){violations.push("missing-port:"+(!a?c.a:c.b));penalty+=1;continue}
  const gap=Math.hypot(a.x01-b.x01,a.y01-b.y01);
  const expected=c.relation==="mirror"?180:0;
  const ad=angleDelta((a.angleDeg-b.angleDeg+360)%360,expected);
  if(gap>c.maxGap){violations.push("open-join:"+c.a+":"+c.b);penalty+=gap/c.maxGap}
  if(ad>c.angleToleranceDeg){violations.push("misaligned-join:"+c.a+":"+c.b);penalty+=ad/Math.max(1,c.angleToleranceDeg)}
  if(c.scaleRatio){
   const ai=c.a.split(":")[0]!,bi=c.b.split(":")[0]!,as=instanceScale.get(ai),bs=instanceScale.get(bi);
   if(as!==undefined&&bs!==undefined){
    const ratio=as/Math.max(.0001,bs),lo=Math.min(...c.scaleRatio),hi=Math.max(...c.scaleRatio);
    if(ratio<lo||ratio>hi){violations.push("scale-hierarchy:"+c.a+":"+c.b);penalty+=ratio<lo?lo-ratio:ratio-hi}
   }
  }
 }
 const score=1/(1+penalty);
 return {grammar:g,valid:violations.length===0,score,violations};
}


export type NestingBox={x01:number;y01:number;width01:number;height01:number};
export type NestingFit={scale:number;x01:number;y01:number;fits:boolean;reason?:string};

/** Proportionally shrinks a child motif to fit a parent cavity; never enlarges past its requested scale. */
export function fitMotifToCavity(child:{aspect:number;scale:number},cavity:NestingBox,minScale=.15,padding01=.02):NestingFit{
 const w=Math.max(0,cavity.width01-padding01*2),h=Math.max(0,cavity.height01-padding01*2);
 const aspect=Math.max(.0001,child.aspect);
 const requested=Math.max(.0001,child.scale);
 const fit=Math.min(w/aspect,h,requested);
 const scale=Math.max(0,fit);
 const fits=scale>=minScale&&w>0&&h>0;
 const childW=scale*aspect,childH=scale;
 return {scale,x01:cavity.x01+(cavity.width01-childW)/2,y01:cavity.y01+(cavity.height01-childH)/2,fits,reason:fits?undefined:"nested-motif-below-minimum-scale"};
}
