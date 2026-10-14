import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {partitionObservedMotifPaths} from '../packages/tesseract-engine/src/motif-path-decomposition';
import {reconstructMotif,measureMotifStructure} from '../packages/tesseract-engine/src/motif-reconstruction';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
const a=JSON.parse(readFileSync('data/research/motif-annotations/met-445264-coarse-v1.json','utf8')) as ObservedMotifAnnotations;
const sourceBytes=readFileSync('data/research/motif-references/met-445264/source.jpg');
if(createHash('sha256').update(sourceBytes).digest('hex')!==a.provenance.originalSha256)throw new Error('Original source hash mismatch');
const baseline=graphFromObservedAnnotations(a,225);
const partitions=a.elements.map(e=>({elementId:`element:${e.id}`,cuts:e.paths[0].slice(1,-1).map((_,i)=>i+1),evidence:'Split supplied draft contour at every annotated vertex; sides are editable micro parts, not inferred petals'}));
const graph=partitionObservedMotifPaths(baseline,partitions),ir=reconstructMotif(graph);
// Independent segment multiset directly from input pixel annotations, not the graph.
const key=(p:{x:number;y:number},q:{x:number;y:number})=>JSON.stringify([p,q]);
const expected=a.elements.flatMap(e=>e.paths.flatMap(p=>p.slice(1).map(([x,y],i)=>key({x:p[i][0],y:p[i][1]},{x,y})))).sort();
const actual=ir.flatMap(o=>{const p=o.kind==='fill'?o.polygon:o.path;return p.slice(1).map((q,i)=>key(p[i],q));}).sort();
const preserved=JSON.stringify(expected)===JSON.stringify(actual);
const structure=measureMotifStructure(graph);
const broken=structuredClone(graph);const first=broken.nodes.find(n=>n.id.endsWith(':part-0'))!;first.transform.xMm+=1;
const negativeControl=measureMotifStructure(broken);
const out='artifacts/motif-reconstruction/partition-met-445264';mkdirSync(out,{recursive:true});
writeFileSync(`${out}/reference.svg`,stitchIrToSvg(ir,graph.widthMm,graph.heightMm));
writeFileSync(`${out}/graph.json`,JSON.stringify(graph,null,2));
const report={schema:'ascend.motif-partition-benchmark.v1',annotationId:a.id,reviewStatus:a.review.status,
 sourceElements:a.elements.length,editableParts:graph.nodes.filter(n=>n.kind==='element').length,referenceSegments:expected.length,
 exactAnnotatedSegmentsPreserved:preserved,structure,negativeControl,
 independentExpertAnnotationsAvailable:false,semanticAccuracy:null,imageTracingAccuracy:null,productionApproved:false,modelTrainingPerformed:false};
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(!preserved||structure.brokenJunctions||!negativeControl.brokenJunctions)throw new Error('Partition reconstruction regression');
