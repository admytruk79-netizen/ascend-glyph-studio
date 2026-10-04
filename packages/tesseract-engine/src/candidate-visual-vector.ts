import type {Topology} from "./topology";
import type {VisualFeatureVector} from "./visual-features";

export function topologyVisualVector(t:Topology):VisualFeatureVector{
 const n=Math.max(1,t.nodes.length),e=t.edges.length,rels=t.edges.map(x=>x.relation);
 const count=(xs:string[])=>rels.filter(r=>xs.includes(r)).length/Math.max(1,e);
 const scales=new Set(t.nodes.map(x=>x.scale)).size;
 const branching=count(["branch","radiate"]),repetition=count(["repeat"]),interruption=count(["terminate","oppose","intersect"]);
 const closure=count(["return","enclose","orbit"]);
 // Structural proxy until raster/path analysis is attached.
 return {symmetry:Math.max(0,.55-interruption*.25+repetition*.2),density:Math.min(1,(n+e)/(n*3)),voidRatio:Math.max(.1,.55-(e/n)*.12),scaleLevels:Math.min(1,scales/6),
 vertical:count(["ascend","anchor"]),horizontal:count(["bridge","oppose"]),radial:count(["radiate"]),field:count(["enclose","orbit"]),wrap:closure,
 branching,repetition,interruption,closure};
}
