import type {AssemblyRole,Topology} from "./topology";
import type {LearnedAssemblyPrior} from "./learned-assembly-prior";

const ROLES:AssemblyRole[]=["hero","companion","filler","frame","connector"];

function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function weight(prior:LearnedAssemblyPrior|undefined,a:AssemblyRole,b?:AssemblyRole){
 if(b)return Math.max(.0001,prior?.adjacency?.[a]?.[b]??prior?.adjacency?.[b]?.[a]??.1);
 return Math.max(.0001,prior?.roleWeights?.[a]??1);
}
function entropy(states:Set<AssemblyRole>,prior?:LearnedAssemblyPrior){
 let sum=0,swlog=0;
 for(const r of states){const w=weight(prior,r);sum+=w;swlog+=w*Math.log(w)}
 return sum<=0?Infinity:Math.log(sum)-swlog/sum;
}
function allowedNeighbors(role:AssemblyRole,prior?:LearnedAssemblyPrior){
 const out=new Set<AssemblyRole>();
 for(const b of ROLES)if(weight(prior,role,b)>.0001)out.add(b);
 return out;
}
function cloneWave(w:Set<AssemblyRole>[]){return w.map(s=>new Set(s))}

function propagate(wave:Set<AssemblyRole>[],prior?:LearnedAssemblyPrior){
 const q:number[]=[...wave.keys()];
 while(q.length){
  const i=q.shift()!;
  for(const j of [i-1,i+1]){
   if(j<0||j>=wave.length)continue;
   const allowed=new Set<AssemblyRole>();
   for(const a of wave[i]!)for(const b of allowedNeighbors(a,prior))allowed.add(b);
   let changed=false;
   for(const b of [...wave[j]!])if(!allowed.has(b)){wave[j]!.delete(b);changed=true}
   if(!wave[j]!.size)return false;
   if(changed)q.push(j);
  }
 }
 return true;
}

function weightedOrder(states:Set<AssemblyRole>,seed:string,prior?:LearnedAssemblyPrior){
 return [...states].map(r=>({r,k:(hash(seed+":"+r)/4294967296)/weight(prior,r)}))
  .sort((a,b)=>a.k-b.k).map(x=>x.r);
}

/**
 * Clean-room WFC-style constraint collapse with propagation + backtracking.
 * Uses abstract ASCEND assembly roles only; it never emits historical motif geometry.
 */
export function collapseAssemblyRoles(
 count:number,seed:string,prior?:LearnedAssemblyPrior,
 fixed:Partial<Record<number,AssemblyRole>>={}
):AssemblyRole[]{
 const wave=Array.from({length:count},()=>new Set(ROLES));
 for(const [k,v] of Object.entries(fixed)){const i=Number(k);if(i>=0&&i<count&&v)wave[i]=new Set([v])}
 if(!propagate(wave,prior))throw new Error("assembly prior has no valid initial solution");

 const solve=(state:Set<AssemblyRole>[],depth:number):Set<AssemblyRole>[]|undefined=>{
  let best=-1,bestH=Infinity;
  for(let i=0;i<state.length;i++){
   const n=state[i]!.size;if(n<=1)continue;
   const h=entropy(state[i]!,prior)+(hash(seed+":"+depth+":"+i)%1000)/1e9;
   if(h<bestH){bestH=h;best=i}
  }
  if(best<0)return state;
  for(const r of weightedOrder(state[best]!,seed+":"+depth+":"+best,prior)){
   const next=cloneWave(state);next[best]=new Set([r]);
   if(!propagate(next,prior))continue;
   const out=solve(next,depth+1);if(out)return out;
  }
  return undefined;
 };
 const solved=solve(wave,0);
 if(!solved)throw new Error("assembly constraint collapse exhausted all valid states");
 return solved.map(s=>[...s][0]!);
}

function formForRole(role:AssemblyRole,current:string,seed:string){
 const pools:Record<AssemblyRole,string[]>={
  hero:["enclosure","radial-emission","orbit","axis"],
  companion:["seed","bifurcation","opposition","mutation"],
  filler:["seed","void","axis"],
  frame:["axis","enclosure","opposition"],
  connector:["axis","spatial-flow","bifurcation"]
 };
 const p=pools[role];
 return p.includes(current)?current:p[hash(seed+":"+role)%p.length]!;
}
function scaleForRole(role:AssemblyRole,current:number){
 const target:Record<AssemblyRole,number>={hero:4,companion:2.5,filler:1,frame:1.5,connector:1.5};
 return Math.max(.75,Math.min(4,(current+target[role])/2));
}

/** Apply the collapsed role scaffold to ASCEND-native topology. */
export function applyAssemblyConstraintCollapse(t:Topology,seed:string,prior?:LearnedAssemblyPrior):Topology{
 if(!prior||t.nodes.length<2)return t;
 const center=Math.floor(t.nodes.length/2);
 const fixed:Partial<Record<number,AssemblyRole>>={[center]:"hero"};
 if(t.nodes.length>=4){fixed[0]="frame";fixed[t.nodes.length-1]="frame"}
 const roles=collapseAssemblyRoles(t.nodes.length,seed,prior,fixed);
 const nodes=t.nodes.map((n,i)=>({
  ...n,assemblyRole:roles[i]!,
  form:formForRole(roles[i]!,n.form,seed+":"+n.id),
  scale:scaleForRole(roles[i]!,n.scale)
 }));
 return {nodes,edges:t.edges.map(e=>({...e}))};
}
