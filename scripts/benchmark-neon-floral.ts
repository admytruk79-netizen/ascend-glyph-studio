import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {reconstructMotif,measureMotifStructure} from '../packages/tesseract-engine/src/motif-reconstruction';
import {measureMotifClearance} from '../packages/tesseract-engine/src/motif-clearance';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
async function main(){
 const a:ObservedMotifAnnotations=JSON.parse(readFileSync('data/research/motif-annotations/neon-plate37-connected-floral-v1.json','utf8'));
 const source=readFileSync('data/research/motif-references/commons-96737753/source.jpg');
 if(createHash('sha256').update(source).digest('hex')!==a.provenance.originalSha256)throw new Error('Neon source hash mismatch');
 const m=await sharp(source).metadata();if(m.width!==a.image.width||m.height!==a.image.height)throw new Error('Annotation dimensions mismatch');
 const graph=graphFromObservedAnnotations(a,a.image.width),ir=reconstructMotif(graph);
 const expected=a.elements.flatMap(e=>e.paths.flatMap(p=>p.map(([x,y])=>({x,y}))));
 const actual=ir.flatMap(o=>o.kind==='fill'?o.polygon:o.path);
 if(expected.length!==actual.length)throw new Error('Landmark count changed');
 const rmse=Math.sqrt(expected.reduce((n,p,i)=>n+(p.x-actual[i].x)**2+(p.y-actual[i].y)**2,0)/expected.length);
 const structure=measureMotifStructure(graph),clearance=measureMotifClearance(graph);
 const broken=structuredClone(graph);broken.nodes.find(n=>n.id==='element:stem-bud')!.transform.xMm+=3;
 const negativeControl=measureMotifStructure(broken);
 const folder='artifacts/motif-reconstruction/neon-plate37';mkdirSync(folder,{recursive:true});
 writeFileSync(`${folder}/reference.svg`,stitchIrToSvg(ir,graph.widthMm,graph.heightMm));
 writeFileSync(`${folder}/graph.json`,JSON.stringify(graph,null,2));
 const paths=ir.map(o=>{const p=o.kind==='fill'?o.polygon:o.path;
  const color=o.id.includes('stem')?'#ff6a00':o.id.includes('inset')?'#00b9d1':'#a423c6';
  return `<polyline points="${p.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;
 }).join('');
 const image=`<image width="1280" height="465" href="data:image/jpeg;base64,${source.toString('base64')}"/>`;
 const overlay=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 540"><rect width="1280" height="540" fill="white"/>${image}${paths}<g font-family="sans-serif" font-size="17"><text x="12" y="490">Neon plate 37 — draft flower / inset / stem annotations</text><text x="12" y="520">Approximate landmarks; connections are reference geometry, not machine stitches.</text></g></svg>`;
 writeFileSync(`${folder}/source-overlay.svg`,overlay);
 const report={schema:'ascend.neon-floral-reconstruction-benchmark.v1',neonSourceId:'commons-96737753',originalSha256:a.provenance.originalSha256,
  annotationReview:a.review.status,elementCount:a.elements.length,landmarkCount:expected.length,annotationCoordinateRmse:rmse,
  structure,portsOffPath:clearance.portsOffPath,outsideEnvelope:clearance.outsideEnvelope,
  referenceContourIntersections:clearance.clearanceViolations,negativeControl,
  independentExpertAnnotationsAvailable:false,imageTracingAccuracy:null,physicalCalibration:null,stitchCount:null,
  productionApproved:false,modelTrainingPerformed:false,
  limitations:['Zero coordinate RMSE verifies preservation of manually supplied draft landmarks, not accurate image tracing.','Item public-domain declaration and 1902 publication support the reference-use review; live Commons licence refresh was unavailable.','Contours represent visible regions, not satin/fill/stitch direction or physical thread clearance.']};
 writeFileSync(`${folder}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(rmse||structure.brokenJunctions||clearance.portsOffPath.length||clearance.outsideEnvelope.length||!negativeControl.brokenJunctions)throw new Error('Neon floral reconstruction regression');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
