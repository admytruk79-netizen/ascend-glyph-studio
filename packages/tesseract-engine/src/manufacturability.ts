import type {Topology} from "./topology";
import type {MediumId,ProductionLimits} from "./medium-compiler";
import {DEFAULT_LIMITS} from "./medium-compiler";
export type ManufacturabilityReport={medium:MediumId;score:number;hard:string[];soft:string[];metrics:{density:number;scaleLevels:number;crossings:number}};
export function assessManufacturability(t:Topology,medium:MediumId,limits:ProductionLimits=DEFAULT_LIMITS[medium]):ManufacturabilityReport{
 const hard:string[]=[],soft:string[]=[];const n=Math.max(1,t.nodes.length),density=(t.nodes.length+t.edges.length)/(n*3),scaleLevels=new Set(t.nodes.map(x=>x.scale)).size,crossings=t.edges.filter(x=>x.relation==="intersect").length;
 if(density>limits.maxDensity)hard.push("density-exceeds-medium-limit");
 if(scaleLevels>limits.maxScaleLevels)soft.push("too-many-scale-levels");
 if(crossings&&!limits.supportsCrossing)hard.push("crossing-unsupported");
 if(density>limits.maxDensity*.88)soft.push("density-near-limit");
 const score=Math.max(0,1-hard.length*.45-soft.length*.12);
 return {medium,score,hard,soft,metrics:{density,scaleLevels,crossings}};
}
