import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {decomposeMotifMask,reconstructMotifMask} from '../packages/tesseract-engine/src/motif-raster';
import type {MotifProvenance} from '../packages/tesseract-engine/src/motif-graph';
// Explicit input provenance is required; no remote fetching or inferred permission.
async function main(){
const [imagePath,provenancePath,outDir]=process.argv.slice(2);
if(!imagePath||!provenancePath||!outDir)throw new Error('Usage: tsx scripts/benchmark-motif-raster.ts IMAGE PROVENANCE_JSON OUTPUT_DIRECTORY');
const original=await readFile(imagePath);
const provenance:MotifProvenance=JSON.parse(await readFile(provenancePath,'utf8'));
if(createHash('sha256').update(original).digest('hex')!==provenance.originalSha256)throw new Error('Source hash mismatch');
const {data,info}=await sharp(original).rotate().resize({width:256,height:256,fit:'inside',withoutEnlargement:true}).greyscale().raw().toBuffer({resolveWithObject:true});
// Deliberately simple threshold baseline: ornament segmentation is NOT ground truth.
const mask=Uint8Array.from(data,v=>v<128?1:0);
provenance.transformations.push({operation:'raster preprocessing',evidence:`EXIF orientation; fit inside 256x256; grayscale; threshold <128; no automatic rectification or semantic segmentation`});
const result=decomposeMotifMask(mask,info.width,info.height,provenance,100);
const reconstructed=reconstructMotifMask(result,info.width,info.height);
let intersection=0,union=0,errors=0;
for(let i=0;i<mask.length;i++){intersection+=mask[i]&&reconstructed[i]?1:0;union+=mask[i]||reconstructed[i]?1:0;errors+=mask[i]===reconstructed[i]?0:1;}
await mkdir(outDir,{recursive:true});
await writeFile(`${outDir}/graph.json`,JSON.stringify(result,null,2));
await sharp(Buffer.from(Uint8Array.from(mask,v=>v?0:255)),{raw:{width:info.width,height:info.height,channels:1}}).png().toFile(`${outDir}/threshold-mask.png`);
await sharp(Buffer.from(Uint8Array.from(reconstructed,v=>v?0:255)),{raw:{width:info.width,height:info.height,channels:1}}).png().toFile(`${outDir}/reconstructed-mask.png`);
const report={schema:'ascend.motif-raster-benchmark.v1',source:provenance.source,originalSha256:provenance.originalSha256,
 raster:{width:info.width,height:info.height},foregroundPixels:result.foregroundPixels,components:result.graph.nodes.filter(n=>n.kind==='assembly').length,
 binaryMaskIoU:union?intersection/union:1,binaryMaskRmse:Math.sqrt(errors/mask.length),
 historicalSegmentationAccuracy:null,semanticElementAccuracy:null,rectificationAccuracy:null,physicalCalibration:null,
 productionApproved:false,modelTrainingPerformed:false,
 limitations:['IoU compares a threshold mask with its lossless row-run reconstruction, not a historical expert annotation.','FFT symmetry and repeat results are hypotheses; not independently verified on this photograph.','Reference dimensions are normalized; row runs are not machine stitches.']};
await writeFile(`${outDir}/report.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(errors)throw new Error('Raster reconstruction lost pixels');

}
main().catch(error=>{console.error(error);process.exitCode=1;});
