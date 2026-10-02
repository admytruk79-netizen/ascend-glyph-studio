import type {Family,Relation,TesseractState} from "./types";
export const familyBias:Record<Family,readonly Relation[]>={
 earth:["anchor","enclose","repeat"],water:["flow","bridge","orbit"],fire:["radiate","oppose","repeat"],air:["bridge","orbit","flow"],spirit:["enclose","orbit","mirror"]
};
export function validateGraph(s:TesseractState):string[]{
 const errors:string[]=[]; const ids=new Set(s.nodes.map(n=>n.id));
 for(const e of s.edges){if(!ids.has(e.from)||!ids.has(e.to))errors.push("dangling-edge");if(e.from===e.to&&e.relation!=="repeat")errors.push("invalid-self-relation");}
 if(!s.nodes.some(n=>n.role==="primary"))errors.push("missing-primary");
 return [...new Set(errors)];
}
