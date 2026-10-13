import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {trainingPermissions,requireTrainingSource,type TrainingPermissionManifest} from './training-permission';
import {learnImage,featureOf,kmeans} from '../../packages/tesseract-engine/src/raster-features';

// Refit cumulatively in manifest order; descriptors are unsupervised shapes,
// never historical species, stitch routes or semantic motif labels.
async function main(){
 const path=process.argv[2]??'data/research/training/pattern-sequence-manifest-v2.json';
 const out=process.argv[3]??'artifacts/motif-reconstruction/pattern-sequence-v2';
 const bytes=readFileSync(path),manifest:TrainingPermissionManifest=JSON.parse(bytes.toString());
 const permissions=trainingPermissions(manifest),seen=new Set<string>();
 const examples=await Promise.all(manifest.entries.map(async e=>{
  if(!e.imagePath)throw new Error('training:image-path-required');
  const image=readFileSync(e.imagePath),hash=createHash('sha256').update(image).digest('hex');
  requireTrainingSource(permissions,e.id,hash);
  if(seen.has(hash))throw new Error('training:duplicate-image');seen.add(hash);
  const {data,info}=await sharp(image).rotate().resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
  const learned=learnImage({data,width:info.width,height:info.height});
  const features=learned.elements.map(featureOf);
  let extraction='whole-image-components';
  if(!features.length){
   extraction='4x4-tile-fragments';
   // Connected knotwork exceeds the existing component-area limit. Retain
   // explicitly labelled fragments, never pretend these are whole motifs.
   for(let y=0;y<4;y++)for(let x=0;x<4;x++){
    const left=Math.floor(x*info.width/4),top=Math.floor(y*info.height/4);
    const width=Math.floor((x+1)*info.width/4)-left,height=Math.floor((y+1)*info.height/4)-top;
    const tile=await sharp(data,{raw:{width:info.width,height:info.height,channels:3}}).extract({left,top,width,height}).raw().toBuffer();
    features.push(...learnImage({data:tile,width,height}).elements.map(featureOf));
   }
  }
  if(!features.length||features.some(v=>v.some(x=>!Number.isFinite(x))))throw new Error(`training:invalid-descriptors:${e.id}`);
  return {id:e.id,source:e.source,permission:e.permission,group:e.sourceGroup,imageSha256:hash,density:learned.density,extraction,features};
 }));
 const distance=(a:number[],b:number[])=>a.reduce((s,x,i)=>s+(x-b[i])**2,0);
 const error=(rows:number[][],centers:number[][])=>rows.reduce((s,v)=>s+Math.min(...centers.map(c=>distance(v,c))),0)/rows.length;
 const fit=(rows:number[][])=>kmeans(rows,Math.min(8,rows.length),30).centers;
 const stages=examples.map((e,i)=>{
  const included=examples.slice(0,i+1),rows=included.flatMap(x=>x.features),centers=fit(rows);
  return {stage:i+1,addedSource:e.id,sourceIds:included.map(x=>x.id),descriptorCount:rows.length,centers,trainingMeanSquaredDistance:error(rows,centers)};
 });
 const folds=[...new Set(examples.map(e=>e.group))].map(group=>{
  const train=examples.filter(e=>e.group!==group).flatMap(e=>e.features),test=examples.filter(e=>e.group===group).flatMap(e=>e.features);
  const mean=train[0].map((_,i)=>train.reduce((s,v)=>s+v[i],0)/train.length);
  return {heldOutGroup:group,trainingDescriptorCount:train.length,heldOutDescriptorCount:test.length,codebookError:error(test,fit(train)),singleMeanBaselineError:error(test,[mean])};
 });
 mkdirSync(out,{recursive:true});
 const report={schema:'ascend.pattern-sequence-training.v1',trained:true,method:'existing-raster-features-cumulative-kmeans',status:'candidate',runtime:process.version,
  manifest:path,manifestSha256:createHash('sha256').update(bytes).digest('hex'),sourceGroupCount:folds.length,
  codeFingerprints:['scripts/train/train-pattern-sequence.ts','scripts/train/training-permission.ts','packages/tesseract-engine/src/raster-features.ts'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),
  sources:examples.map(({features,...e})=>({...e,descriptorCount:features.length})),stages,folds,
  limitations:['Connected pixel components are not expert motif parts; large connected designs can be discarded by existing component-size limits.','Small object-group holdouts do not establish unseen-artist, regional or motif-family generalisation.','No semantic family classifier, image segmentation fine-tune, crossing-order reconstruction, cultural inference or stitch model was trained.','Raw descriptor distances are diagnostic, not aesthetic quality or machine feasibility.'],canonicalGeometryChanged:false,neonWrites:false,productionApproved:false};
 writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
 writeFileSync(`${out}/model.json`,JSON.stringify({schema:'ascend.pattern-codebook.v1',status:'candidate',centers:stages.at(-1)!.centers,featureImplementation:'raster-features.featureOf',productionApproved:false},null,2)+'\n');
 console.log(JSON.stringify({trained:true,sources:examples.length,stages:stages.length,descriptors:stages.at(-1)!.descriptorCount,folds,productionApproved:false},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
