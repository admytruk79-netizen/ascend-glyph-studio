import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {reconstructMotif,measureMotifStructure} from '../packages/tesseract-engine/src/motif-reconstruction';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
const a=JSON.parse(readFileSync('data/research/motif-annotations/met-445264-coarse-v1.json','utf8')) as ObservedMotifAnnotations;
const g=graphFromObservedAnnotations(a,a.image.width),ir=reconstructMotif(g);
const expected=a.elements.flatMap(e=>e.paths.flatMap(path=>path.map(([x,y])=>({x,y}))));
const actual=ir.flatMap(o=>o.kind==='fill'?o.polygon:o.path);
if(expected.length!==actual.length)throw new Error('Landmark count changed');
const rmse=Math.sqrt(expected.reduce((n,p,i)=>n+(p.x-actual[i].x)**2+(p.y-actual[i].y)**2,0)/expected.length);
const folder='artifacts/motif-reconstruction/observed-met-445264';mkdirSync(folder,{recursive:true});
writeFileSync(`${folder}/reference.svg`,stitchIrToSvg(ir,g.widthMm,g.heightMm));
writeFileSync(`${folder}/graph.json`,JSON.stringify(g,null,2));
const report={schema:'ascend.observed-motif-benchmark.v1',annotationId:a.id,review:a.review,elementCount:a.elements.length,
 landmarkCount:expected.length,annotationCoordinateRmse:rmse,structure:measureMotifStructure(g),
 imageTracingAccuracy:null,semanticAccuracy:null,physicalCalibration:null,productionApproved:false,modelTrainingPerformed:false,
 limitation:'Coordinate preservation against supplied draft landmarks; not an independent measure of image tracing or historical identification.'};
writeFileSync(`${folder}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(rmse!==0)throw new Error('Observed annotation coordinates changed');
