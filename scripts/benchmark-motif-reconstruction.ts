import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {connectedMotifFixture} from '../packages/tesseract-engine/src/motif-fixtures';
import {decomposeAnnotatedMotif,reconstructMotif,measureMotifStructure,assembleAscendMotif} from '../packages/tesseract-engine/src/motif-reconstruction';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
import {deriveConstructionEnvelope} from '../packages/tesseract-engine/src/construction-envelope';
import {buildPilotShirtPattern} from '../packages/tesseract-engine/src/pilot-shirt';
import {PILOT_SIZE_PROFILES} from '../packages/tesseract-engine/src/shirt-measurements';
import {measureMotifClearance} from '../packages/tesseract-engine/src/motif-clearance';
import {MACHINE_TEMPLATES} from '../packages/tesseract-engine/src/machine-template';
import {generatePatterns} from '../packages/tesseract-engine/src/pattern-generator';
import {pilotGarment,runPilotProduction} from '../packages/tesseract-engine/src/pilot-runner';
import {planEmbroideryJob} from '../packages/tesseract-engine/src/manufacturing-job-plan';
const output=process.argv[2]??'artifacts/motif-reconstruction';mkdirSync(output,{recursive:true});
const original=connectedMotifFixture(),graph=decomposeAnnotatedMotif(original),ir=reconstructMotif(graph);
// Independent authored world-space vector ground truth, not reconstructed graph output.
const expected=Array.from({length:3},(_,i)=>{const x=20+i*35;return [[{x,y:45},{x,y:20}],[{x:x-10,y:8},{x,y:20},{x:x+10,y:8}]];}).flat();
const points=ir.flatMap(o=>o.kind==='fill'?o.polygon:o.path),truth=expected.flat();
const rmse=Math.sqrt(points.reduce((s,p,i)=>s+(p.x-truth[i].x)**2+(p.y-truth[i].y)**2,0)/points.length);
const faults=connectedMotifFixture();faults.nodes.find(n=>n.id==='crown0')!.transform.xMm=4;faults.nodes.find(n=>n.id==='a2')!.transform.xMm+=7;faults.nodes.find(n=>n.id==='trunk0')!.geometry!.paths=[[{x:0,y:20},{x:0,y:45}]];
const baseline=measureMotifStructure(graph),negativeControl=measureMotifStructure(faults);
const clearance=measureMotifClearance(graph),gapFault=connectedMotifFixture();gapFault.nodes.find(n=>n.id==='a1')!.transform.xMm=41;
const gapNegativeControl=measureMotifClearance(gapFault);
const withheld=connectedMotifFixture();withheld.relations=withheld.relations.filter(r=>r.kind!=='repeat');
const inferred=decomposeAnnotatedMotif(withheld,{inferRepeats:true});
const inferredRepeat=inferred.relations.find(r=>r.kind==='repeat');
const svg=stitchIrToSvg(ir,graph.widthMm,graph.heightMm);
const sha=(v:unknown)=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
writeFileSync(`${output}/reference.svg`,svg);writeFileSync(`${output}/motif-graph.json`,JSON.stringify(graph,null,2));
writeFileSync(`${output}/inferred-motif-graph.json`,JSON.stringify(inferred,null,2));
// Integration smoke checks on REFERENCE piece envelopes; not a full-shirt placement benchmark.
const shirt=buildPilotShirtPattern(PILOT_SIZE_PROFILES[1]);
const machine=MACHINE_TEMPLATES['brother-pr1055x-reference'];
const pieces=shirt.pieces.map(piece=>{
 const g=connectedMotifFixture();g.widthMm=Math.max(...piece.outline.map(p=>p.x));g.heightMm=Math.max(...piece.outline.map(p=>p.y));g.negativeSpace[0].widthMm=g.widthMm;
 for(const n of g.nodes.filter(n=>n.kind==='element'))n.transform.scaleX=n.transform.scaleY=.08;
 const mapping=Object.fromEntries(g.nodes.filter(n=>n.kind==='element').map(n=>[n.id,'axis']));
 const result=assembleAscendMotif(g,mapping,deriveConstructionEnvelope(undefined,'embroidery',undefined,{},machine),{machine});
 writeFileSync(`${output}/${piece.id}-canonical-reference.svg`,stitchIrToSvg(result.stitchObjects,g.widthMm,g.heightMm));
 return {pieceId:piece.id,sourceState:piece.sourceState,productionObjects:result.productionObjects.length,irObjects:result.stitchObjects.length,jobErrors:result.job.validation.errors};
});
const sleeveInput={seed:'motif-sleeve-integration-v2',concepts:['ancestry','protection','ascent'],mode:'sleeve' as const,complexity:.2,population:8,generations:1,variations:4,machineProfileId:machine.id,physicalWidthMm:360,physicalHeightMm:500};
const sleeves=generatePatterns(sleeveInput),sleevesAgain=generatePatterns(sleeveInput);
for(const [i,p] of sleeves.entries())writeFileSync(`${output}/engine-sleeve-${i+1}.svg`,p.svg);
const pilotInput={seed:'motif-fullshirt-integration-v2',intent:{concepts:[{id:'ancestors',weight:1},{id:'protection',weight:.9}],traditions:[{id:'ascend-core',weight:1}],character:[{id:'ordered-organic',weight:.7}],materialId:'linen-woven',zoneId:'sleeve-wrap'},principles:[],population:8,generations:1,keep:2,medium:'embroidery' as const,machineProfileId:machine.id,machine};
const fullShirt=runPilotProduction(pilotInput),fullShirtAgain=runPilotProduction(pilotInput);
const garment=pilotGarment(),winner=fullShirt.batch.candidates[0];
const zoneJobs=(winner?.zones??[]).map(zone=>{
 const physical=garment.zones.find(z=>z.id===zone.zoneId)!;
 const job=zone.manufacturingJob??planEmbroideryJob(zone.stitchObjects??[],{widthMm:physical.widthMm!,heightMm:physical.heightMm!,machine});
 return {zoneId:zone.zoneId,irObjects:zone.stitchObjects?.length??0,valid:job.validation.valid,errors:job.validation.errors};
});
mkdirSync(`${output}/full-shirt`,{recursive:true});
for(const artifact of fullShirt.artifacts)writeFileSync(`${output}/full-shirt/${artifact.fileName}`,artifact.content);
const report={schema:'ascend.motif-benchmark.v2',state:'REFERENCE',dataset:'authored-synthetic-vector-fixture-v1',trainingPerformed:false,
 seed:graph.seed,graphSha256:sha(graph),reconstructionSha256:sha(svg),deterministic:sha(ir)===sha(reconstructMotif(decomposeAnnotatedMotif(connectedMotifFixture()))),
 referenceReconstruction:{vectorPointRmseMm:rmse,structure:baseline,clearance},negativeControl,gapNegativeControl,
 repeatInference:{withheldRepeatRecovered:inferredRepeat?.kind==='repeat'&&inferredRepeat.members.join(',')==='a0,a1,a2',relation:inferredRepeat,geometryUnchanged:sha(reconstructMotif(inferred))===sha(ir)},
 visualRasterSimilarity:null,comparisonBaselines:{tracing:null,primitiveTiling:null,svgFirst:null},
 referencePieceIntegration:{size:shirt.size.id,pieces,seamRegistrationVerified:false,machineFieldAndColorChecksApplied:true,physicalMachineValidation:false},
 engineSleeve:{seed:sleeveInput.seed,designs:sleeves.length,deterministic:sha(sleeves.map(p=>p.stitchObjects))===sha(sleevesAgain.map(p=>p.stitchObjects)),jobs:sleeves.map(p=>({id:p.id,valid:p.manufacturingJob?.validation.valid,errors:p.manufacturingJob?.validation.errors}))},
 engineFullShirt:{seed:pilotInput.seed,candidates:fullShirt.batch.candidateCount,errors:fullShirt.errors,deterministic:sha(fullShirt.batch)===sha(fullShirtAgain.batch)&&sha(fullShirt.artifacts)===sha(fullShirtAgain.artifacts),productionApproved:fullShirt.manifest?.productionApproved,blockers:fullShirt.manifest?.blockers,zoneJobs,
  note:'Existing reference pilot; this does not project the reconstructed motif onto the shirt. Piece artwork layers remain placeholders. Per-zone machine feasibility is enforced in the runtime batch and retained as packet blockers.'},
 incomplete:['Unannotated image decomposition','Historical-source fixtures and source-disjoint evaluation','Raster and comparative baselines','Symmetry scoring and non-translational lattice inference','Canonical port remapping, stroke-width/fill-aware clearance validation','Full-shirt motif zone/no-go placement and seam continuity','Registered multi-hoop segmentation','Machine-specific stitch generation and measured stitch count','Model training and physical production validation']};
writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(rmse!==0||!report.deterministic||baseline.brokenJunctions||baseline.brokenRepeats||baseline.negativeSpaceViolations||negativeControl.brokenJunctions!==1||negativeControl.brokenRepeats!==1||negativeControl.negativeSpaceViolations!==1
 ||clearance.clearanceViolations.length||clearance.portsOffPath.length||clearance.outsideEnvelope.length||!gapNegativeControl.clearanceViolations.length||Math.abs((gapNegativeControl.minimumCenterlineGapMm??Infinity)-1)>1e-6
 ||!report.repeatInference.withheldRepeatRecovered||!report.repeatInference.geometryUnchanged||!sleeves.length||!report.engineSleeve.deterministic||sleeves.some(p=>!p.manufacturingJob?.validation.errors.includes('machine-field-exceeded:segmentation-required'))
 ||!fullShirt.batch.candidateCount||fullShirt.errors.length||!report.engineFullShirt.deterministic||fullShirt.manifest?.productionApproved!==false)process.exitCode=1;
