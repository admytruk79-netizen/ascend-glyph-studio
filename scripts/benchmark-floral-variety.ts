import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {graphFromMotifMaskContours} from '../packages/tesseract-engine/src/motif-mask-contours';
import {rasterizeObservedContours} from '../packages/tesseract-engine/src/motif-contour-rasterization';
import type {MotifProvenance} from '../packages/tesseract-engine/src/motif-graph';
async function main(){
 const base='data/research/motif-references/met-445265/';
 const image=readFileSync(base+'source-original.jpg');
 const provenance:MotifProvenance=JSON.parse(readFileSync(base+'provenance-original.json','utf8'));
 if(createHash('sha256').update(image).digest('hex')!==provenance.originalSha256)throw new Error('Source hash mismatch');
 const fixture=JSON.parse(readFileSync('data/research/motif-annotations/met-445265-floral-regions.json','utf8'));
 const metadata=await sharp(image).metadata();
 if(metadata.width!==fixture.imageDimensions.width||metadata.height!==fixture.imageDimensions.height)throw new Error('Source dimensions mismatch');
 const out='artifacts/motif-reconstruction/floral-variety';mkdirSync(out,{recursive:true});
 const reports=[];const gallery:string[]=[];
 for(const [index,region] of fixture.regions.entries()){
  const {data,info}=await sharp(image).extract(region.roi).resize({width:192,height:192,fit:'inside',withoutEnlargement:true}).removeAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
  if(info.channels!==3)throw new Error('Expected RGB');
  const mask=Uint8Array.from({length:info.width*info.height},(_,i)=>data[i*3]-data[i*3+1]>30&&data[i*3]-data[i*3+2]>15?0:1);
  const source=structuredClone(provenance);source.transformations.push({operation:'explicit floral region and colour mask',evidence:`${region.id}; ROI ${JSON.stringify(region.roi)}; fit inside 192x192; red ground iff R-G>30 and R-B>15; ${fixture.reviewStatus}`});
  const result=graphFromMotifMaskContours(mask,info.width,info.height,source,info.width);
  const reconstructed=rasterizeObservedContours(result.graph,info.width,info.height);
  const pixels=mask.reduce((n,p)=>n+p,0),errors=mask.reduce((n,p,i)=>n+(p!==reconstructed[i]?1:0),0);
  if(!pixels||pixels===mask.length||errors)throw new Error('Degenerate mask or contour loss: '+region.id);
  const png=await sharp(data,{raw:{width:info.width,height:info.height,channels:3}}).png().toBuffer();
  const dir=`${out}/${region.id}`;mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/source-crop.png`,png);writeFileSync(`${dir}/graph.json`,JSON.stringify(result,null,2));
  const paths=result.graph.nodes.flatMap(n=>n.geometry?[`<path d="${n.geometry.paths.map(p=>p.map((v,i)=>`${i?'L':'M'}${v.x},${v.y}`).join(' ')+' Z').join(' ')}" fill-rule="evenodd"/>`]:[]).join('');
  const y=index*240;
  gallery.push(`<g transform="translate(8,${y+24})"><text y="-8" font-size="12">${region.id} (draft)</text><image width="${info.width}" height="${info.height}" href="data:image/png;base64,${png.toString('base64')}"/><g transform="translate(220,0)" fill="#111">${paths}</g></g>`);
  reports.push({id:region.id,description:region.description,roi:region.roi,raster:{width:info.width,height:info.height},foregroundPixels:pixels,componentCount:result.componentCount,loopCount:result.loopCount,holeCount:result.holeCount,binaryMaskPixelErrors:errors,semanticAccuracy:null,productionApproved:false});
 }
 writeFileSync(`${out}/gallery.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 ${240*reports.length}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif">${gallery.join('')}</g></svg>`);
 const report={schema:'ascend.floral-variety-benchmark.v1',source:provenance.source,originalSha256:provenance.originalSha256,reviewStatus:fixture.reviewStatus,regions:reports,modelTrainingPerformed:false,physicalCalibration:null,limitations:fixture.limitations.concat(['Zero pixel error measures preservation of a colour-selected mask, not correct individual flower segmentation.','Serrated leaf is supporting geometry, not a fourth flower family.'])};
 writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
