import type {Topology,TopologyNode,TopologyEdge} from "./topology";

export type EmergentArchetype="torus"|"axis"|"bifurcation"|"protected-void"|"radial-field"|"crossing";
export type EmergencePlan={
 archetype:EmergentArchetype;macroNodes:string[];microNodes:string[];
 anchors:Record<string,{u:number;v:number;weight:number}>;
 coherence:number;negativeSpace:{u:number;v:number;radius:number}[];
};

function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function pickArchetype(t:Topology,seed:string):EmergentArchetype{
 const rel=new Set(t.edges.map(e=>e.relation)),forms=new Set(t.nodes.map(n=>n.form));
 if(forms.has("void")||rel.has("enclose"))return "protected-void";
 if(rel.has("branch"))return "bifurcation";
 if(rel.has("return")||rel.has("orbit"))return "torus";
 if(rel.has("ascend")||forms.has("axis"))return "axis";
 if(rel.has("intersect"))return "crossing";
 return hash(seed)%2?"radial-field":"axis";
}
function target(a:EmergentArchetype,i:number,n:number){
 const q=n<2?0:i/(n-1),theta=q*Math.PI*2;
 switch(a){
  case "torus":return {u:.5+.38*Math.cos(theta),v:.5+.22*Math.sin(theta)};
  case "axis":return {u:.5+.055*Math.sin(theta*3),v:.1+.8*q};
  case "bifurcation":return q<.45?{u:.5,v:.1+q*.9}:{u:.5+(q-.45)*(i%2?-.7:.7),v:.5+(q-.45)*.72};
  case "protected-void":return {u:.5+.4*Math.cos(theta),v:.5+.34*Math.sin(theta)};
  case "crossing":return {u:.12+.76*q,v:i%2?.15+.7*q:.85-.7*q};
  default:return {u:.5+.4*q*Math.cos(theta*2.618),v:.5+.4*q*Math.sin(theta*2.618)};
 }
}
export function planEmergence(t:Topology,seed:string):EmergencePlan{
 const archetype=pickArchetype(t,seed),macro=t.nodes.filter(n=>!n.id.includes(".r")),micro=t.nodes.filter(n=>n.id.includes(".r"));
 const ordered=[...macro,...micro],anchors:EmergencePlan["anchors"]={};
 ordered.forEach((n,i)=>{const p=target(archetype,i,ordered.length);anchors[n.id]={...p,weight:n.id.includes(".r")?.55:1};});
 const negativeSpace=archetype==="protected-void"?[{u:.5,v:.5,radius:.16}]:archetype==="bifurcation"?[{u:.5,v:.66,radius:.08}]:[];
 return {archetype,macroNodes:macro.map(n=>n.id),microNodes:micro.map(n=>n.id),anchors,coherence:.82,negativeSpace};
}
export function emergencePenalty(plan:EmergencePlan,positions:Record<string,{x:number;y:number}>,w:number,h:number){
 let sum=0,count=0;for(const [id,a] of Object.entries(plan.anchors)){const p=positions[id];if(!p)continue;const dx=p.x/w-a.u,dy=p.y/h-a.v;sum+=Math.hypot(dx,dy)*a.weight;count+=a.weight;}
 for(const voidArea of plan.negativeSpace)for(const p of Object.values(positions)){const d=Math.hypot(p.x/w-voidArea.u,p.y/h-voidArea.v);if(d<voidArea.radius)sum+=(voidArea.radius-d)*3;}
 return count?sum/count:0;
}
