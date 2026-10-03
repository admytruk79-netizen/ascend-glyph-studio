import type {Topology} from "./topology";
function signature(t:Topology){return new Set([...t.nodes.map(n=>"f:"+n.form),...t.edges.map(e=>"r:"+e.relation),...t.nodes.map(n=>"s:"+n.scale)])}
export function structuralDistance(a:Topology,b:Topology){
 const A=signature(a),B=signature(b);let intersection=0;for(const x of A)if(B.has(x))intersection++;
 const union=new Set([...A,...B]).size;return union?1-intersection/union:0;
}
export function noveltyAgainst(candidate:Topology,history:Topology[]){return history.length?Math.min(...history.map(x=>structuralDistance(candidate,x))):1}
