import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {graphFromMotifMaskContours} from '../packages/tesseract-engine/src/motif-mask-contours';
import {rasterizeObservedContours} from '../packages/tesseract-engine/src/motif-contour-rasterization';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import type {MotifProvenance} from '../packages/tesseract-engine/src/motif-graph';
async function main(){
 const base='data/research/motif-references/met-445264/';
 const original=readFileSync(base+'source-original.jpg');
 const provenance:MotifProvenance=JSON.parse(readFileSync(base+'provenance-original.json','utf8'));
 if(createHash('sha256').update(original).digest('hex')!==provenance.originalSha256)throw new Error('Original source hash mismatch');
 const roi={left:177,top:935,width:147,height:162};
 const {data,info}=await sharp(original).extract(roi).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
 if(info.channels!==3)throw new Error('Expected RGB');
 const mask=Uint8Array.from({length:roi.width*roi.height},(_,i)=>{
  const [r,g,b]=data.subarray(i*3,i*3+3);return r-g>30&&r-b>15?0:1;
 });
 provenance.transformations.push({operation:'explicit floral connector crop and colour segmentation',
  evidence:`original 701x1945; ROI ${JSON.stringify(roi)}; red ground iff R-G>30 and R-B>15; no morphology or invented detail; threshold is not expert ground truth`});
 const result=graphFromMotifMaskContours(mask,roi.width,roi.height,provenance,roi.width);
 const decoded=rasterizeObservedContours(result.graph,roi.width,roi.height);
 const metrics=(actual:Uint8Array)=>{let intersection=0,union=0,errors=0;
  for(let i=0;i<mask.length;i++){intersection+=mask[i]&&actual[i]?1:0;union+=mask[i]||actual[i]?1:0;errors+=mask[i]===actual[i]?0:1;}
  return {binaryMaskIoU:union?intersection/union:1,binaryMaskRmse:Math.sqrt(errors/mask.length)};
 };
 // Prior rough six-corner envelope is a separate baseline; convert thumbnail pixels
 // into the original-photo ROI, without treating it as independently reviewed truth.
 const a:ObservedMotifAnnotations=JSON.parse(readFileSync('data/research/motif-annotations/met-445264-coarse-v1.json','utf8'));
 const coarse=a.elements.find(e=>e.id==='flower-middle-left')!;
 a.id='met-445264-detail-coarse-envelope';a.image={width:roi.width,height:roi.height};a.provenance=provenance;
 a.elements=[{...coarse,paths:coarse.paths.map(path=>path.map(([x,y])=>[x*701/225-roi.left,y*1945/624-roi.top]))}];
 const coarseMask=rasterizeObservedContours(graphFromObservedAnnotations(a,roi.width),roi.width,roi.height);
 const moved=structuredClone(result.graph);for(const n of moved.nodes)if(n.kind==='element')n.transform.xMm+=2;
 const out='artifacts/motif-reconstruction/detail-met-445264';mkdirSync(out,{recursive:true});
 const png=await sharp(data,{raw:{width:roi.width,height:roi.height,channels:3}}).png().toBuffer();
 writeFileSync(`${out}/source-crop.png`,png);
 const pathSvg=result.graph.nodes.flatMap(n=>n.geometry?[`<path d="${n.geometry.paths.map(path=>path.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')+' Z').join(' ')}" fill-rule="evenodd"/>`]:[]).join('');
 const source=`<image width="147" height="162" href="data:image/png;base64,${png.toString('base64')}"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 465 195"><rect width="465" height="195" fill="white"/><g transform="translate(4,24)">${source}</g><g transform="translate(159,24)" fill="#111">${pathSvg}</g><g transform="translate(314,24)">${source}<g fill="#00c5ff" opacity=".45">${pathSvg}</g></g><g font-family="sans-serif" font-size="10" fill="#111"><text x="4" y="14">Original crop</text><text x="159" y="14">Colour-mask contours</text><text x="314" y="14">Overlay (draft segmentation)</text><text x="4" y="193">REFERENCE: colour threshold, not semantic or machine stitch validation</text></g></svg>`;
 writeFileSync(`${out}/comparison.svg`,svg);writeFileSync(`${out}/graph.json`,JSON.stringify(result,null,2));
 const report={schema:'ascend.motif-detail-benchmark.v1',source:provenance.source,originalSha256:provenance.originalSha256,
  sourceDimensions:{width:701,height:1945},roi,segmentation:'red ground iff R-G>30 and R-B>15',
  foregroundPixels:mask.reduce((a,b)=>a+b,0),componentCount:result.componentCount,loopCount:result.loopCount,holeCount:result.holeCount,
  cellContourReconstruction:metrics(decoded),coarseEnvelopeBaseline:metrics(coarseMask),twoPixelDisplacementControl:metrics(rasterizeObservedContours(moved,roi.width,roi.height)),
  independentExpertAnnotationsAvailable:false,semanticAccuracy:null,physicalCalibration:null,productionApproved:false,modelTrainingPerformed:false,
  limitation:'Scores measure preservation of a colour-selected mask; they do not establish correct petal, stem or ornament segmentation. Small components may be JPEG or textile texture artefacts.'};
 writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(report.cellContourReconstruction.binaryMaskIoU!==1||report.twoPixelDisplacementControl.binaryMaskIoU>=1)throw new Error('Contour benchmark regression');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
