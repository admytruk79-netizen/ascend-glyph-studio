import type {MotifGrammar,MotifRelation} from "./motif-grammar";
export type MotifPort={instanceId:string;name:string;x01:number;y01:number;angleDeg:number;kind:"entry"|"exit"|"radial"|"edge"};
export type AssemblyConstraint={a:string;b:string;relation:MotifRelation;maxGap:number;angleToleranceDeg:number};
export type AssemblyResult={grammar:MotifGrammar;valid:boolean;score:number;violations:string[]};

const angleDelta=(a:number,b:number)=>Math.abs((((a-b)+540)%360)-180);
export function solveKaleidoscopicAssembly(g:MotifGrammar,ports:MotifPort[],constraints:AssemblyConstraint[]):AssemblyResult{
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
 }
 const score=1/(1+penalty);
 return {grammar:g,valid:violations.length===0,score,violations};
}
