import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {analyseMotifInterlace} from '../packages/tesseract-engine/src/motif-interlace';
import {measureMotifClearance} from '../packages/tesseract-engine/src/motif-clearance';
import {trainingPermissions,requireTrainingSource} from './train/training-permission';
async function main(){
 const path='data/research/motif-annotations/met-388374-crossing-detail-v1.json',bytes=readFileSync(path);
 const a:ObservedMotifAnnotations=JSON.parse(bytes.toString());
 const image=readFileSync('data/research/motif-references/met-388374/source-original.jpg');
 const hash=createHash('sha256').update(image).digest('hex');
 requireTrainingSource(trainingPermissions(JSON.parse(readFileSync('data/research/training/pattern-sequence-manifest-v1.json','utf8'))),'met-388374',hash);
 const info=await sharp(image).metadata();
 if(hash!==a.provenance.originalSha256||info.width!==a.image.width||info.height!==a.image.height)throw new Error('interlace:source-mismatch');
 const graph=graphFromObservedAnnotations(a,a.image.width),found=analyseMotifInterlace(graph);
 if(found.candidates.length!==1)throw new Error('interlace:unexpected-crossing-count');
 const c=found.candidates[0];
 const report=analyseMotifInterlace(graph,[{id:'draft-crossing-1',over:'element:visible-over',under:'element:interpolated-under',at:c.at,toleranceMm:0,
  evidence:'Manual review of lower central knotwork detail: descending light strand is uninterrupted, rising strand is interrupted; hidden continuation interpolated. Draft, not independent ground truth.'}]);
 const out='artifacts/motif-reconstruction/interlace-v1';mkdirSync(out,{recursive:true});
 writeFileSync(`${out}/report.json`,JSON.stringify({...report,source:a.provenance,review:a.review,
  annotationSha256:createHash('sha256').update(bytes).digest('hex'),geometryBasis:'image pixel positions represented in reference units; not physical mm',
  clearance:measureMotifClearance(graph),trained:false,fullHistoricalDecomposition:false},null,2)+'\n');
 const x=c.at.x-110,y=c.at.y-110;
 const paths=a.elements.map((e,i)=>`<polyline points="${e.paths[0].map(p=>p.join(',')).join(' ')}" fill="none" stroke="${i?'#00aaff':'#e500cc'}" stroke-width="3"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} 220 220"><image width="${a.image.width}" height="${a.image.height}" href="data:image/jpeg;base64,${image.toString('base64')}"/>${paths}<circle cx="${c.at.x}" cy="${c.at.y}" r="5" fill="none" stroke="#ffff00" stroke-width="2"/></svg>`;
 writeFileSync(`${out}/source-overlay.svg`,svg);await sharp(Buffer.from(svg)).resize(880,880).png().toFile(`${out}/source-overlay.png`);
 // Reference illustration only: an authored display gap conveys the reviewed
 // order. It neither edits the graph nor specifies thread width or stitch jumps.
 const preview=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} 220 220"><defs><mask id="under-gap" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="220" height="220"><rect x="${x}" y="${y}" width="220" height="220" fill="white"/><circle cx="${c.at.x}" cy="${c.at.y}" r="12" fill="black"/></mask></defs><rect x="${x}" y="${y}" width="220" height="220" fill="white"/>${a.elements.map((e,i)=>`<polyline points="${e.paths[0].map(p=>p.join(',')).join(' ')}" fill="none" stroke="${i?'#0077bb':'#aa3377'}" stroke-width="5" ${i?'mask="url(#under-gap)"':''}/>`).join('')}</svg>`;
 writeFileSync(`${out}/reference-crossing-preview.svg`,preview);
 console.log(JSON.stringify({observedCrossings:report.crossings.length,unresolved:report.unresolved.length,clearanceViolations:measureMotifClearance(graph).clearanceViolations.length,trained:false,productionApproved:false}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
