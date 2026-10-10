import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {connectedMotifFixture} from '../packages/tesseract-engine/src/motif-fixtures';
import {decomposeAnnotatedMotif,reconstructMotif,measureMotifStructure,assembleAscendMotif} from '../packages/tesseract-engine/src/motif-reconstruction';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
import {deriveConstructionEnvelope} from '../packages/tesseract-engine/src/construction-envelope';
import {buildPilotShirtPattern} from '../packages/tesseract-engine/src/pilot-shirt';
import {PILOT_SIZE_PROFILES} from '../packages/tesseract-engine/src/shirt-measurements';
const output=process.argv[2]??'artifacts/motif-reconstruction';mkdirSync(output,{recursive:true});
const original=connectedMotifFixture(),graph=decomposeAnnotatedMotif(original),ir=reconstructMotif(graph);
// Independent authored world-space vector ground truth, not reconstructed graph output.
const expected=Array.from({length:3},(_,i)=>{const x=20+i*35;return [[{x,y:45},{x,y:20}],[{x:x-10,y:8},{x,y:20},{x:x+10,y:8}]];}).flat();
const points=ir.flatMap(o=>o.kind==='fill'?o.polygon:o.path),truth=expected.flat();
const rmse=Math.sqrt(points.reduce((s,p,i)=>s+(p.x-truth[i].x)**2+(p.y-truth[i].y)**2,0)/points.length);
const faults=connectedMotifFixture();faults.nodes.find(n=>n.id==='crown0')!.transform.xMm=4;faults.nodes.find(n=>n.id==='a2')!.transform.xMm+=7;faults.nodes.find(n=>n.id==='trunk0')!.geometry!.paths=[[{x:0,y:20},{x:0,y:45}]];
const baseline=measureMotifStructure(graph),negativeControl=measureMotifStructure(faults);
const svg=stitchIrToSvg(ir,graph.widthMm,graph.heightMm);
const sha=(v:unknown)=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
writeFileSync(`${output}/reference.svg`,svg);writeFileSync(`${output}/motif-graph.json`,JSON.stringify(graph,null,2));
// Integration smoke checks on REFERENCE piece envelopes; not a full-shirt placement benchmark.
const shirt=buildPilotShirtPattern(PILOT_SIZE_PROFILES[1]);
const pieces=shirt.pieces.map(piece=>{
 const g=connectedMotifFixture();g.widthMm=Math.max(...piece.outline.map(p=>p.x));g.heightMm=Math.max(...piece.outline.map(p=>p.y));g.negativeSpace[0].widthMm=g.widthMm;
 for(const n of g.nodes.filter(n=>n.kind==='element'))n.transform.scaleX=n.transform.scaleY=.08;
 const mapping=Object.fromEntries(g.nodes.filter(n=>n.kind==='element').map(n=>[n.id,'axis']));
 const result=assembleAscendMotif(g,mapping,deriveConstructionEnvelope(undefined,'embroidery'));
 writeFileSync(`${output}/${piece.id}-canonical-reference.svg`,stitchIrToSvg(result.stitchObjects,g.widthMm,g.heightMm));
 return {pieceId:piece.id,sourceState:piece.sourceState,productionObjects:result.productionObjects.length,irObjects:result.stitchObjects.length,jobErrors:result.job.validation.errors};
});
const report={schema:'ascend.motif-benchmark.v1',state:'REFERENCE',dataset:'authored-synthetic-vector-fixture-v1',trainingPerformed:false,
 seed:graph.seed,graphSha256:sha(graph),reconstructionSha256:sha(svg),deterministic:sha(ir)===sha(reconstructMotif(decomposeAnnotatedMotif(connectedMotifFixture()))),
 referenceReconstruction:{vectorPointRmseMm:rmse,structure:baseline},negativeControl,
 visualRasterSimilarity:null,comparisonBaselines:{tracing:null,primitiveTiling:null,svgFirst:null},
 referencePieceIntegration:{size:shirt.size.id,pieces,seamRegistrationVerified:false,machineFeasibilityVerified:false},
 incomplete:['Unannotated image decomposition','Historical-source fixtures and source-disjoint evaluation','Raster and comparative baselines','Symmetry and general clearance scoring','Canonical port remapping and collision validation','Full-shirt zone/no-go placement and seam continuity','Machine-specific stitch generation and measured stitch count','Model training and physical production validation']};
writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(rmse!==0||!report.deterministic||baseline.brokenJunctions||baseline.brokenRepeats||baseline.negativeSpaceViolations||negativeControl.brokenJunctions!==1||negativeControl.brokenRepeats!==1||negativeControl.negativeSpaceViolations!==1)process.exitCode=1;
