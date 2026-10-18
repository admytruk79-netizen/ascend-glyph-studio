import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {refineMotifPartLibrary} from '../packages/tesseract-engine/src/motif-part-refinement';
import {pigmentUnionMask} from '../packages/tesseract-engine/src/motif-pigment-backing';
const bytes=readFileSync('data/research/motif-parts-v2/library.json'),library=JSON.parse(bytes.toString()),refined=refineMotifPartLibrary(library),out='data/research/motif-benchmarks/pigment-refinement-v2';mkdirSync(out,{recursive:true});
const parts=library.pieces.filter((p:any)=>p.kind!=='border').map((p:any)=>{
 const reference=pigmentUnionMask(p.layers.map((l:any)=>l.graph),p.width,p.height),r=refined.library.pieces.find(q=>q.id===p.id)!,output=pigmentUnionMask(r.layers.map(l=>l.graph),p.width,p.height);
 let intersection=0,union=0,added=0,removed=0,ellipseIntersection=0,ellipseUnion=0;
 reference.forEach((v,i)=>{const o=output[i]!;intersection+=v&&o?1:0;union+=v||o?1:0;added+=!v&&o?1:0;removed+=v&&!o?1:0;const x=(i%p.width+.5)/p.width-.5,y=(Math.floor(i/p.width)+.5)/p.height-.5,e=x*x+y*y<=.25;ellipseIntersection+=v&&e?1:0;ellipseUnion+=v||e?1:0;});
 return {id:p.id,sourceMaskIoU:intersection/union,ellipseBaselineIoU:ellipseIntersection/ellipseUnion,addedPixels:added,removedPixels:removed};
});
const report={schema:'ascend.pigment-refinement-benchmark.v1',librarySha256:createHash('sha256').update(bytes).digest('hex'),method:refined.report.method,parts,meanSourceMaskIoU:parts.reduce((n:number,p:any)=>n+p.sourceMaskIoU,0)/parts.length,meanEllipseBaselineIoU:parts.reduce((n:number,p:any)=>n+p.ellipseBaselineIoU,0)/parts.length,limitations:['Mask similarity measures retention of draft segmentation, not fidelity to the original photograph or aesthetic quality.','Loop filtering and smoothing still change holes and edges before backing.','Backing preserves gaps in retained pigment; no semantic petal segmentation, neural training or manufacturing validation.'],productionApproved:false};
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
