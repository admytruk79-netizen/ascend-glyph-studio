import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename,join} from 'node:path';
import sharp from 'sharp';
import {assertUserReferenceStudy,type UserReferenceStudy} from './user-reference-study';
import {trainingPermissions,requireTrainingSource,type TrainingPermissionManifest} from './training-permission';
import {extractPatternDescriptors} from './pattern-descriptor-extraction';
import {kmeans} from '../../packages/tesseract-engine/src/raster-features';
async function main(){
 const studyPath=process.argv[2]??'data/research/training/user-reference-study-v1.json',out=process.argv[3]??'artifacts/motif-reconstruction/user-reference-study-v1';
 const studyBytes=readFileSync(studyPath),s:UserReferenceStudy=JSON.parse(studyBytes.toString());assertUserReferenceStudy(s);
 const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
 const sources=new Map(await Promise.all(s.sources.map(async e=>{
  const path=process.env.USER_REFERENCE_IMAGE_DIR?join(process.env.USER_REFERENCE_IMAGE_DIR,basename(e.imagePath)):e.imagePath;
  const image=readFileSync(path),m=await sharp(image).metadata();
  if(hash(image)!==e.imageSha256||m.width!==e.width||m.height!==e.height)throw new Error('user-study:source-mismatch');
  return [e.id,image] as const;
 })));
 const museumPath='data/research/training/pattern-sequence-manifest-v3.json',museumBytes=readFileSync(museumPath),m:TrainingPermissionManifest=JSON.parse(museumBytes.toString()),permissions=trainingPermissions(m);
 const museums=await Promise.all(m.entries.map(async e=>{
  if(!e.imagePath)throw new Error('training:image-path-required');
  const image=readFileSync(e.imagePath);requireTrainingSource(permissions,e.id,hash(image));
  return {id:e.id,group:e.sourceGroup,imageSha256:e.imageSha256,...await extractPatternDescriptors(image)};
 }));
 const crops=await Promise.all(s.crops.map(async c=>{
  const crop=await sharp(sources.get(c.sourceId)!).extract(c.box).png().toBuffer();
  return {id:c.id,sourceId:c.sourceId,group:s.sourceGroup,box:c.box,observedApproaches:c.observedApproaches,cropSha256:hash(crop),...await extractPatternDescriptors(crop)};
 }));
 const stages=crops.map((c,i)=>{
  const rows=[...museums,...crops.slice(0,i+1)].flatMap(e=>e.features),fit=kmeans(rows,8,30);
  return {stage:i+1,addedCrop:c.id,replayedMuseumSources:museums.length,replayedStudyCrops:i+1,descriptorCount:rows.length,centers:fit.centers};
 });
 mkdirSync(out,{recursive:true});
 const report={schema:'ascend.user-reference-training-run.v1',trained:true,method:'existing-raster-descriptors-cumulative-kmeans',status:'candidate',runtime:process.version,
  authorization:{scope:s.scope,evidence:s.authorizationEvidence,originalImageOwnershipClaimed:false},studyManifestSha256:hash(studyBytes),museumManifestSha256:hash(museumBytes),
  screenshots:s.sources.map(({imagePath,...e})=>e),museumSources:museums.map(({features,...e})=>({...e,descriptorCount:features.length})),
  crops:crops.map(({features,...e})=>({...e,descriptorCount:features.length})),stages,
  sourceGroupCount:new Set([...museums,...crops].map(e=>e.group)).size,
  independentHistoricalSourceCount:null,heldOutEvaluation:null,reasonNoHoldout:'Screenshots are one correlated discovery session with unresolved original sources; no independent screenshot generalisation claim.',
  codeFingerprints:['scripts/train/train-user-reference-study.ts','scripts/train/pattern-descriptor-extraction.ts','scripts/train/user-reference-study.ts','packages/tesseract-engine/src/raster-features.ts'].map(path=>({path,sha256:hash(readFileSync(path))})),
  limitations:[...s.limitations,'Shape descriptors can represent ground or contour fragments, not complete semantic motifs.','Manual approach tags are recorded for study; no layout, cultural identity, embroidery stitch or garment model was fitted.'],
  originalImagesRedistributed:false,canonicalGeometryChanged:false,neonWrites:false,foundationModelFineTuned:false,stitchCount:null,productionApproved:false};
 writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
 writeFileSync(`${out}/model.json`,JSON.stringify({schema:'ascend.pattern-codebook.v1',status:'candidate',centers:stages.at(-1)!.centers,featureImplementation:'raster-features.featureOf',productionApproved:false},null,2)+'\n');
 console.log(JSON.stringify({trained:true,museumSources:museums.length,screenshots:s.sources.length,crops:crops.length,
  museumDescriptors:museums.reduce((n,e)=>n+e.features.length,0),studyDescriptors:crops.reduce((n,e)=>n+e.features.length,0),finalDescriptors:stages.at(-1)!.descriptorCount,productionApproved:false}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
