import type {Topology} from "./topology";
import {classifySpecies,type SpeciesId} from "./speciation";
import {assignNiche} from "./niche-selection";
import type {DesignNicheId} from "./niches";

export type LineageId=string;
export type DesignLineage={
 id:LineageId;species:SpeciesId;niche:DesignNicheId;signature:string;
 generation:number;parentIds:LineageId[];memberCount:number;
 forms:string[];relations:string[];character:string[];
};
const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
export function lineageSignature(t:Topology,niches?:DesignNicheId[]){
 const species=classifySpecies(t),niche=assignNiche(t,niches).primary;
 const forms=[...new Set(t.nodes.map(n=>n.form))].sort(),relations=[...new Set(t.edges.map(e=>e.relation))].sort();
 return {species,niche,forms,relations,signature:[species,niche,forms.join("."),relations.join(".")].join("|")};
}
export function nameLineage(t:Topology,generation:number,niches?:DesignNicheId[],parentIds:LineageId[]=[]):DesignLineage{
 const x=lineageSignature(t,niches),character:string[]=[];
 if(x.forms.includes("enclosure")||x.relations.includes("orbit"))character.push("cyclic");
 if(x.forms.includes("bifurcation")||x.relations.includes("branch"))character.push("branching");
 if(x.relations.includes("radiate"))character.push("emissive");
 if(x.relations.includes("oppose"))character.push("tensional");
 if(x.relations.includes("flow"))character.push("flowing");
 return {id:`lin-${hash(x.signature)}`,species:x.species,niche:x.niche,signature:x.signature,generation,parentIds:[...new Set(parentIds)],memberCount:1,forms:x.forms,relations:x.relations,character};
}
export function consolidateLineages(xs:DesignLineage[]){
 const m=new Map<string,DesignLineage>();for(const x of xs){const p=m.get(x.id);if(p){p.memberCount+=x.memberCount;p.generation=Math.max(p.generation,x.generation);p.parentIds=[...new Set([...p.parentIds,...x.parentIds])]}else m.set(x.id,{...x,parentIds:[...x.parentIds]})}return [...m.values()];
}
