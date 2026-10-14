import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import sharp from 'sharp';
import {trainingPermissions,requireTrainingSource,type TrainingPermissionManifest} from './training-permission';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../../packages/tesseract-engine/src/motif-observed-annotations';
import {profileMotifConstruction} from '../../packages/tesseract-engine/src/motif-construction-profile';
import {fitMotifRelationModel,motifRelationTrainingRows,predictMotifRelation,rankMotifRelationCandidates,MOTIF_RELATION_LABELS,type MotifRelationLabel,type MotifRelationTrainingRow} from '../../packages/tesseract-engine/src/motif-relation-learning';
import {reconstructMotif} from '../../packages/tesseract-engine/src/motif-reconstruction';
import {stitchIrToSvg} from '../../packages/tesseract-engine/src/canonical-preview';
async function main(){
const manifestPath=process.argv[2]??'data/research/training/motif-relation-manifest-v3.json';
const out=process.argv[3]??'artifacts/motif-reconstruction/trained-relations-v3';
const startedAt=new Date().toISOString();
const hash=(data:Uint8Array|string)=>createHash('sha256').update(data).digest('hex');
const manifestBytes=readFileSync(manifestPath),manifest:TrainingPermissionManifest=JSON.parse(manifestBytes.toString());
const permissions=trainingPermissions(manifest);
const seenHashes=new Set<string>();
const examples=await Promise.all(manifest.entries.map(async entry=>{
 if(!entry.imagePath||!entry.annotationPath)throw new Error('training:local-paths-required');
 const image=readFileSync(resolve(entry.imagePath)),sha=hash(image);requireTrainingSource(permissions,entry.id,sha);
 if(seenHashes.has(sha))throw new Error('training:duplicate-source-image');seenHashes.add(sha);
 const bytes=readFileSync(resolve(entry.annotationPath)),a:ObservedMotifAnnotations=JSON.parse(bytes.toString());
 if(a.provenance.originalSha256!==sha||a.provenance.source!==entry.source)throw new Error('training:annotation-source-mismatch');
 const metadata=await sharp(image).metadata();if(metadata.width!==a.image.width||metadata.height!==a.image.height)throw new Error('training:annotation-image-dimensions');
 const graph=graphFromObservedAnnotations(a,a.image.width),profile=profileMotifConstruction(graph);
 return {entry,annotationHash:hash(bytes),review:a.review,graph,profile,rows:motifRelationTrainingRows(graph)};
}));
const groups=[...new Set(examples.map(e=>e.entry.sourceGroup))].sort();
if(groups.length<2)throw new Error('training:independent-groups-required');
function evaluate(rows:MotifRelationTrainingRow[],predicted:MotifRelationLabel[]){
 if(rows.length!==predicted.length||!rows.length)throw new Error('training:empty-evaluation');
 const labels=[...MOTIF_RELATION_LABELS],matrix=labels.map(()=>labels.map(()=>0));
 rows.forEach((r,i)=>matrix[labels.indexOf(r.label)][labels.indexOf(predicted[i])]++);
 const classes=labels.map((label,i)=>{
  const tp=matrix[i][i],actual=matrix[i].reduce((n,x)=>n+x,0),proposed=matrix.reduce((n,row)=>n+row[i],0);
  const precision=proposed?tp/proposed:0,recall=actual?tp/actual:0;
  return {label,support:actual,predicted:proposed,precision,recall,f1:precision+recall?2*precision*recall/(precision+recall):0};
 });
 const present=classes.filter(c=>c.support>0);
 return {pairCount:rows.length,accuracy:classes.reduce((n,c,i)=>n+matrix[i][i],0)/rows.length,
  macroF1:present.reduce((n,c)=>n+c.f1,0)/present.length,classes,confusionMatrix:{actualRows:labels,predictedColumns:labels,counts:matrix}};
}
const geometric=(r:MotifRelationTrainingRow):MotifRelationLabel=>r.features[8]&&r.features[9]&&r.features[10]>1-1e-7?'junction':r.features[4]?'nest':'none';
const folds=[],heldRows:MotifRelationTrainingRow[]=[],heldPredictions:MotifRelationLabel[]=[];
for(const group of groups){
 const train=examples.filter(e=>e.entry.sourceGroup!==group),test=examples.filter(e=>e.entry.sourceGroup===group);
 const trainRows=train.flatMap(e=>e.rows),testRows=test.flatMap(e=>e.rows),model=fitMotifRelationModel(trainRows);
 const predicted=testRows.map(r=>predictMotifRelation(model,r.features).label);
 folds.push({heldOutGroup:group,trainingSourceIds:train.map(e=>e.entry.id),heldOutSourceIds:test.map(e=>e.entry.id),
  trainingGroupIds:train.map(e=>e.entry.sourceGroup),trainingPairCount:trainRows.length,trainingClassCounts:model.classCounts,
  unsupportedLabels:model.labels.filter((_,i)=>!model.classCounts[i]),evaluation:evaluate(testRows,predicted),
  geometricBaseline:evaluate(testRows,testRows.map(geometric)),allNoneBaseline:evaluate(testRows,testRows.map(()=> 'none')),
  predictions:testRows.map((r,i)=>({from:r.from,to:r.to,actual:r.label,predicted:predicted[i]}))});
 heldRows.push(...testRows);heldPredictions.push(...predicted);
}
const rows=examples.flatMap(e=>e.rows),model=fitMotifRelationModel(rows);
const evaluation=evaluate(heldRows,heldPredictions),baseline=evaluate(heldRows,heldRows.map(geometric));
const codePaths=['scripts/train/train-motif-relations.ts','scripts/train/training-permission.ts',...['motif-relation-learning','motif-graph','motif-observed-annotations','motif-containment','motif-clearance','motif-construction-profile'].map(n=>`packages/tesseract-engine/src/${n}.ts`)];
const report={schema:'ascend.motif-relation-training-run.v1',trained:true,method:model.method,status:'candidate',startedAt,finishedAt:new Date().toISOString(),runtime:process.version,scope:'relationships between manually supplied reference parts and ports; not raw-image segmentation or cultural style generation',
 dataset:{manifest:manifestPath,manifestSha256:hash(manifestBytes),independentSourceObjects:examples.length,sourceGroups:groups.length,
  annotationElementCount:examples.reduce((n,e)=>n+e.profile.elementCount,0),directedPairCount:rows.length,classCounts:Object.fromEntries(model.labels.map((l,i)=>[l,model.classCounts[i]])),
  sources:examples.map(e=>({id:e.entry.id,sourceGroup:e.entry.sourceGroup,imageSha256:e.entry.imageSha256,annotationSha256:e.annotationHash,permission:e.entry.permission,review:e.review}))},
 optimizer:{epochs:model.epochs,learningRate:model.learningRate,l2:model.l2,initialLoss:model.lossTrace[0].loss,finalRecordedLoss:model.lossTrace.at(-1)!.loss},
 evaluation:{method:'leave-one-source-group-out',fittedTransformsUseTrainingOnly:true,aggregate:evaluation,geometricBaseline:baseline,
  allNoneBaseline:evaluate(heldRows,heldRows.map(()=> 'none')),folds},trainingSetMetrics:evaluate(rows,rows.map(r=>predictMotifRelation(model,r.features).label)),
 promotion:{approved:false,reason:'Tiny draft-labelled dataset; no demonstrated advantage over the geometric baseline or independent expert/physical validation. No automatic production or live model promotion.'},
 codeFingerprints:codePaths.map(path=>({path,sha256:hash(readFileSync(path))})),neonWrites:false,canonicalGeometryChanged:false,
 neuralFoundationModelFineTuned:false,physicalCalibration:null,stitchCount:null,productionApproved:false,
 limitations:['Directed pairs share parts and are correlated; pair count is not an independent-source count.','Two Ukrainian plates from one book/artist are grouped together; unknown creators are separate object groups, not proof of unseen-artist generalisation.','Annotations are partial manual drafts, not independent expert ground truth.','none means no declared contact/nest in the draft, not verified absence of every historical relation.','Features use supplied contours/ports, not inferred semantic segmentation from images.','Exact containment/port geometry is an important baseline; training is not evidence of improvement over it.','Training does not predict culture, region, botanical identity, symbolic meaning or machine stitch routes.']};
mkdirSync(out,{recursive:true});writeFileSync(`${out}/model.json`,JSON.stringify(model,null,2)+'\n');writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
const connected=examples.find(e=>e.entry.id==='met-239343');
if(connected){
 const a:ObservedMotifAnnotations=JSON.parse(readFileSync(connected.entry.annotationPath!,'utf8')),image=readFileSync(connected.entry.imagePath!);
 const paths=a.elements.flatMap(e=>e.paths.map(p=>`<polyline points="${p.map(v=>v.join(',')).join(' ')}" fill="none" stroke="${e.id==='attached-stem'?'#00aaff':'#e500cc'}" stroke-width="4"/>`)).join('');
 writeFileSync(`${out}/connected-leaf-overlay.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.image.width} ${a.image.height}"><image width="${a.image.width}" height="${a.image.height}" href="data:image/jpeg;base64,${image.toString('base64')}"/>${paths}</svg>`);
}
const example=examples.find(e=>e.entry.id==='commons-96737731')??examples[0];
writeFileSync(`${out}/ranked-relations.json`,JSON.stringify({sourceId:example.entry.id,demonstrationOnTrainingSource:true,graphEdited:false,candidates:rankMotifRelationCandidates(example.graph,model)},null,2)+'\n');
writeFileSync(`${out}/reference-example.svg`,stitchIrToSvg(reconstructMotif(example.graph),example.graph.widthMm,example.graph.heightMm));
console.log(JSON.stringify({trained:true,sources:examples.length,groups:groups.length,pairs:rows.length,loss:{initial:report.optimizer.initialLoss,final:report.optimizer.finalRecordedLoss},
 heldOut:{macroF1:evaluation.macroF1,accuracy:evaluation.accuracy,classes:evaluation.classes},geometricBaselineMacroF1:baseline.macroF1,productionApproved:false},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
