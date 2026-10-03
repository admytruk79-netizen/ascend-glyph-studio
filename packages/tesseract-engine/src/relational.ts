export type Cardinality="0:1"|"1:1"|"0:N"|"1:N"|"N:1"|"N:M";
export type SpatialRelation={angleDeg?:number;distanceRatio?:number;scaleRatio?:number;rotationDeg?:number;cardinality?:Cardinality;degree?:number};
export type RelationalEdge={from:string;to:string;kind:string;weight:number;spatial:SpatialRelation};
export type RelationalGraph={nodes:string[];edges:RelationalEdge[]};

export function relationshipDegree(g:RelationalGraph,from:string,to:string,max=8):number|null{
 if(from===to)return 0;let frontier=new Set([from]),seen=new Set([from]);
 for(let d=1;d<=max;d++){const next=new Set<string>();for(const n of frontier)for(const e of g.edges)if(e.from===n&&!seen.has(e.to)){if(e.to===to)return d;next.add(e.to);seen.add(e.to)}frontier=next;if(!frontier.size)break;}return null;
}
export function enrichDegrees(g:RelationalGraph):RelationalGraph{return {...g,edges:g.edges.map(e=>({...e,spatial:{...e.spatial,degree:relationshipDegree(g,e.from,e.to)??1}}))};}
