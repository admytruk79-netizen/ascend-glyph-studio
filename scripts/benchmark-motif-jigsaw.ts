import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {assembleMotifFragmentJigsaw,type MotifFragmentLibrary} from '../packages/tesseract-engine/src/motif-fragment-jigsaw';
async function main(){
 const path='data/research/jigsaw-fragments-v1/library.json',bytes=readFileSync(path),library:MotifFragmentLibrary=JSON.parse(bytes.toString()),out='data/research/motif-benchmarks/jigsaw-v1';mkdirSync(out,{recursive:true});
 const cases=[];
 for(const seed of [0,1]){
  const r=assembleMotifFragmentJigsaw(library,{widthMm:250,heightMm:80,complexity:.8,family:'floral',seed});
  writeFileSync(`${out}/seed-${seed}.svg`,r.svg+'\n');await sharp(Buffer.from(r.svg)).resize({width:1800}).png().toFile(`${out}/seed-${seed}.png`);
  cases.push({seed,input:r.input,placements:r.placements,checks:r.checks,elementCount:r.elementCount,svgSha256:createHash('sha256').update(r.svg).digest('hex'),
   sourceIds:r.graph.provenance.map(p=>p.id),historicalShapesReused:true,canonicalGeometryChanged:false,sourceImagesEmbedded:false,learnedModelApplied:false,physicalCalibration:null,stitchCount:null,productionApproved:false});
 }
 writeFileSync(`${out}/report.json`,JSON.stringify({schema:'ascend.motif-jigsaw-benchmark.v1',librarySha256:createHash('sha256').update(bytes).digest('hex'),segmentationReview:'draft',edgeMatching:'soft foreground/colour edge mismatch, not exact stem joins',cases},null,2)+'\n');
 console.log(JSON.stringify(cases.map(c=>({seed:c.seed,pieces:c.placements.length,...c.checks}))));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
