import {createHash} from 'node:crypto';
import {identityMotifTransform,type MotifGraph,type MotifNode} from './motif-graph';
/** Authored synthetic vector annotations. No historical attribution or training corpus. */
export function connectedMotifFixture(seed='fixture-v1'):MotifGraph {
 const source='Synthetic repeated branch fixture v1';
 const node=(id:string,kind:MotifNode['kind'],parentId?:string):MotifNode=>({id,kind,parentId,provenanceId:'synthetic-v1',confidence:1,evidence:['authored-annotation:v1'],transform:identityMotifTransform()});
 const nodes:MotifNode[]=[node('composition','composition'),node('field','region','composition')];
 for(let i=0;i<3;i++){
  const assembly=node(`a${i}`,'assembly','field');assembly.transform.xMm=20+i*35;assembly.transform.yMm=20;nodes.push(assembly);
  const trunk=node(`trunk${i}`,'element',assembly.id);trunk.geometry={namespace:'reference',paths:[[{x:0,y:25},{x:0,y:0}]],ports:{tip:{x:0,y:0}}};nodes.push(trunk);
  const crown=node(`crown${i}`,'element',assembly.id);crown.geometry={namespace:'reference',paths:[[{x:-10,y:-12},{x:0,y:0},{x:10,y:-12}]],ports:{root:{x:0,y:0}}};nodes.push(crown);
 }
 return {schema:'ascend.motif-graph.v1',state:'REFERENCE',units:'mm',seed,widthMm:120,heightMm:60,minGapMm:2,
  provenance:[{id:'synthetic-v1',source:'fixture://connected-branch-v1',creator:'ASCEND development fixture',community:null,culturalContext:'Synthetic test geometry; no historical or community attribution',retrievedAt:'2026-10-10T00:00:00Z',originalSha256:createHash('sha256').update(JSON.stringify(nodes)).digest('hex'),permission:{status:'verified',evidence:'Repository-authored synthetic fixture; authorised for repository tests and benchmarks',purposes:['analysis','reconstruction']},access:'structural-public',confidence:1,transformations:[{operation:'manual vector annotation',evidence:source}]}],nodes,
  relations:[...Array.from({length:3},(_,i)=>({kind:'junction' as const,from:`trunk${i}`,fromPort:'tip',to:`crown${i}`,toPort:'root',toleranceMm:.01})),{kind:'repeat',members:['a0','a1','a2'],stepMm:{x:35,y:0},toleranceMm:.01},{kind:'nest',from:'field',to:'crown0'}],negativeSpace:[{xMm:0,yMm:50,widthMm:120,heightMm:10}]};
}
