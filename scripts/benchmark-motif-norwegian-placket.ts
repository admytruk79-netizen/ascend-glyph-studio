import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {graphFromObservedFields,type ObservedFieldAnnotations} from '../packages/tesseract-engine/src/motif-observed-fields';
import type {ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {measureMotifStructure,reconstructMotif} from '../packages/tesseract-engine/src/motif-reconstruction';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
import {measureMotifClearance} from '../packages/tesseract-engine/src/motif-clearance';
import {trainingPermissions,requireTrainingSource} from './train/training-permission';
async function main(){
 const annotationPath='data/research/motif-annotations/cleveland-106581-placket-v1.json',layoutPath='data/research/motif-annotations/cleveland-106581-fields-v1.json';
 const a:ObservedMotifAnnotations=JSON.parse(readFileSync(annotationPath,'utf8')),l:ObservedFieldAnnotations=JSON.parse(readFileSync(layoutPath,'utf8'));
 const image=readFileSync('data/research/shirt-image-sources/cleveland-106581/source-print.jpg'),hash=createHash('sha256').update(image).digest('hex');
 requireTrainingSource(trainingPermissions(JSON.parse(readFileSync('data/research/training/pattern-sequence-manifest-v3.json','utf8'))),'cleveland-106581',hash);
 const metadata=await sharp(image).metadata();if(hash!==a.provenance.originalSha256||metadata.width!==a.image.width||metadata.height!==a.image.height)throw new Error('fields:source-mismatch');
 const graph=graphFromObservedFields(a,l,a.image.width),structure=measureMotifStructure(graph),ir=reconstructMotif(graph),clearance=measureMotifClearance(graph);
 const out='artifacts/motif-reconstruction/norwegian-placket-v1';mkdirSync(out,{recursive:true});
 const boxes=l.fields.map(f=>`<rect x="${f.boxPx.x}" y="${f.boxPx.y}" width="${f.boxPx.width}" height="${f.boxPx.height}" fill="none" stroke="#00dfff" stroke-width="2"/>`).join('');
 const protectedBoxes=l.protectedSpaces.map(f=>`<rect x="${f.boxPx.x}" y="${f.boxPx.y}" width="${f.boxPx.width}" height="${f.boxPx.height}" fill="#ffff0080"/>`).join('');
 const paths=a.elements.map(e=>`<polyline points="${e.paths[0].map(p=>p.join(',')).join(' ')}" fill="none" stroke="#00ff88" stroke-width="2"/>`).join('');
 const overlay=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.image.width} ${a.image.height}"><image width="${a.image.width}" height="${a.image.height}" href="data:image/jpeg;base64,${image.toString('base64')}"/>${boxes}${protectedBoxes}${paths}</svg>`;
 writeFileSync(`${out}/source-overlay.svg`,overlay);await sharp(Buffer.from(overlay)).resize({width:1700}).png().toFile(`${out}/source-overlay.png`);
 const detail=overlay.replace(`viewBox="0 0 ${a.image.width} ${a.image.height}"`,'viewBox="1350 200 750 800"');
 await sharp(Buffer.from(detail)).png().toFile(`${out}/placket-overlay.png`);
 await sharp(image).extract({left:1350,top:200,width:750,height:800}).png().toFile(`${out}/source-placket-crop.png`);
 await sharp(image).extract({left:90,top:380,width:300,height:450}).png().toFile(`${out}/source-cuff-crop.png`);
 writeFileSync(`${out}/reference-contours.svg`,stitchIrToSvg(ir,graph.widthMm,graph.heightMm));writeFileSync(`${out}/graph.json`,JSON.stringify(graph,null,2)+'\n');
 const report={schema:'ascend.observed-fields-benchmark.v1',source:a.provenance,review:a.review,fieldCount:l.fields.length,
  fieldsWithoutContours:l.fields.filter(f=>!f.elementIds.length).map(f=>f.id),contourCount:a.elements.length,structure,clearance,
  annotationHashes:[annotationPath,layoutPath].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),
  geometryBasis:'image coordinates normalized to reference units; not physical mm',modelTrainingPerformed:false,fullHistoricalDecomposition:false,stitchCount:null,productionApproved:false};
 writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
 if(structure.negativeSpaceViolations||clearance.outsideEnvelope.length||clearance.clearanceViolations.length)throw new Error('fields:geometry-regression');
 console.log(JSON.stringify({fields:report.fieldCount,contours:report.contourCount,nests:structure.nestedRelations,protectedSpaceViolations:structure.negativeSpaceViolations,productionApproved:false}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
