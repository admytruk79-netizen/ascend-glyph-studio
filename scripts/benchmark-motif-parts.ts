import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {gzipSync} from 'node:zlib';
import {composeDetailedMotifParts,type MotifPartLibrary} from '../packages/tesseract-engine/src/motif-part-composer';
async function main(){const bytes=readFileSync('data/research/motif-parts-v1/library.json'),library:MotifPartLibrary=JSON.parse(bytes.toString()),out='data/research/motif-benchmarks/detailed-parts-v1';mkdirSync(out,{recursive:true});const cases=[];
 for(const seed of [0,1]){const r=composeDetailedMotifParts(library,{widthMm:250,heightMm:80,complexity:.8,family:'floral',seed});writeFileSync(`${out}/seed-${seed}.svg`,r.svg+'\n');await sharp(Buffer.from(r.svg)).resize({width:1800}).png().toFile(`${out}/seed-${seed}.png`);writeFileSync(`${out}/seed-${seed}.graph.json.gz`,gzipSync(JSON.stringify(r.graph)));cases.push({seed,parts:r.placements.length,input:r.input,placements:r.placements,structure:r.structure,checks:r.checks,stitchCount:null,physicalCalibration:null,productionApproved:false});}
 writeFileSync(`${out}/report.json`,JSON.stringify({schema:'ascend.detailed-parts-benchmark.v1',librarySha256:createHash('sha256').update(bytes).digest('hex'),segmentationReview:'draft',modelTrainingPerformed:false,cases},null,2)+'\n');console.log(JSON.stringify(cases.map(c=>({seed:c.seed,parts:c.parts,junctions:c.structure.junctionCount,checks:c.checks}))));}
main().catch(e=>{console.error(e);process.exitCode=1});
