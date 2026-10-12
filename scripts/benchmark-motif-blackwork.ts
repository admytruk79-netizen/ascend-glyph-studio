import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {reconstructMotif} from '../packages/tesseract-engine/src/motif-reconstruction';
import {profileMotifConstruction} from '../packages/tesseract-engine/src/motif-construction-profile';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
import {graphFromMotifMaskContours} from '../packages/tesseract-engine/src/motif-mask-contours';
import {rasterizeObservedContours} from '../packages/tesseract-engine/src/motif-contour-rasterization';
async function main(){
 const a:ObservedMotifAnnotations=JSON.parse(readFileSync('data/research/motif-annotations/met-239343-leaf-v1.json','utf8'));
 const image=readFileSync('data/research/motif-references/met-239343/source-original.jpg');
 if(createHash('sha256').update(image).digest('hex')!==a.provenance.originalSha256)throw new Error('Source hash mismatch');
 const m=await sharp(image).metadata();if(m.width!==a.image.width||m.height!==a.image.height)throw new Error('Source dimensions mismatch');
 const graph=graphFromObservedAnnotations(a,a.image.width),ir=reconstructMotif(graph),profile=profileMotifConstruction(graph);
 const expected=a.elements.flatMap(e=>e.paths.flatMap(p=>p.map(([x,y])=>({x,y}))));
 const actual=ir.flatMap(o=>o.kind==='fill'?o.polygon:o.path);
 if(JSON.stringify(expected)!==JSON.stringify(actual))throw new Error('Landmarks changed');
 const out='artifacts/motif-reconstruction/blackwork-leaf';mkdirSync(out,{recursive:true});
 writeFileSync(`${out}/graph.json`,JSON.stringify(graph,null,2));
 writeFileSync(`${out}/reference.svg`,stitchIrToSvg(ir,graph.widthMm,graph.heightMm));
 const paths=actual.length?ir.map(o=>{const p=o.kind==='fill'?o.polygon:o.path;return `<polyline points="${p.map(v=>`${v.x},${v.y}`).join(' ')}" fill="none" stroke="${o.id.includes('vein')?'#00bfff':'#ff00cc'}" stroke-width="4"/>`;}).join(''):'';
 writeFileSync(`${out}/source-overlay.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.image.width} ${a.image.height}"><image width="${a.image.width}" height="${a.image.height}" href="data:image/jpeg;base64,${image.toString('base64')}"/>${paths}</svg>`);
 // Independent micro-detail study: a manually selected patch inside the leaf.
 // Dark-pixel contours are not identified rosettes or recovered stitch routes.
 const roi={left:2360,top:830,width:175,height:143};
 const {data,info}=await sharp(image).extract(roi).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
 if(info.channels!==3)throw new Error('Expected RGB');
 const mask=Uint8Array.from({length:info.width*info.height},(_,i)=>data[3*i]<130&&data[3*i+1]<125&&data[3*i+2]<115?1:0);
 const provenance=structuredClone(a.provenance);
 provenance.transformations.push({operation:'separate micro-fill patch mask',evidence:`Original image ROI ${JSON.stringify(roi)}; dark pixel iff R<130, G<125, B<115; no smoothing, semantic segmentation or stitch calibration.`});
 const contours=graphFromMotifMaskContours(mask,info.width,info.height,provenance,info.width);
 const decoded=rasterizeObservedContours(contours.graph,info.width,info.height);
 const pixelErrors=mask.reduce((n,p,i)=>n+(p===decoded[i]?0:1),0),foregroundPixels=mask.reduce((n,p)=>n+p,0);
 if(pixelErrors||!foregroundPixels||foregroundPixels===mask.length)throw new Error('Micro-detail reconstruction failed');
 const crop=await sharp(data,{raw:{width:info.width,height:info.height,channels:3}}).png().toBuffer();
 writeFileSync(`${out}/micro-source.png`,crop);writeFileSync(`${out}/micro-graph.json`,JSON.stringify(contours.graph,null,2));
 const filled=contours.graph.nodes.flatMap(n=>n.geometry?[`<path d="${n.geometry.paths.map(p=>p.map((v,i)=>`${i?'L':'M'}${v.x},${v.y}`).join(' ')+' Z').join(' ')}" fill-rule="evenodd"/>`]:[]).join('');
 writeFileSync(`${out}/micro-comparison.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 370 170"><rect width="370" height="170" fill="white"/><image width="175" height="143" href="data:image/png;base64,${crop.toString('base64')}"/><g transform="translate(190,0)">${filled}</g><text x="4" y="163" font-size="11">Source patch / dark-pixel contours; not machine stitches</text></svg>`);
 const report={schema:'ascend.blackwork-reference-benchmark.v1',annotationId:a.id,profile,landmarkCount:expected.length,
  microDetail:{roi,foregroundPixels,componentCount:contours.componentCount,loopCount:contours.loopCount,holeCount:contours.holeCount,binaryMaskPixelErrors:pixelErrors,semanticAccuracy:null},
  annotationCoordinateRmse:0,imageTracingAccuracy:null,physicalCalibration:null,stitchCount:null,productionApproved:false,
  modelTrainingPerformed:false,limitations:a.review.limitations.concat(['Micro-fill patch is separate from the leaf graph; dark pixels can include texture, damage and photographic shading.','Zero pixel error measures mask round-trip preservation, not historical identification or image segmentation accuracy.'])};
 writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({elementCount:profile.elementCount,nestedRelationCount:profile.nestedRelationCount,landmarkCount:expected.length,productionApproved:false}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
