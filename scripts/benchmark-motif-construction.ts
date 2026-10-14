import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {profileMotifConstruction} from '../packages/tesseract-engine/src/motif-construction-profile';
import {reconstructMotif,measureMotifStructure} from '../packages/tesseract-engine/src/motif-reconstruction';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
import {layoutReferenceMotifRegion} from '../packages/tesseract-engine/src/motif-region-layout';
async function main(){
 const out='artifacts/motif-reconstruction/construction-study';mkdirSync(out,{recursive:true});
 const files=['neon-plate37-connected-floral-v1.json','neon-plate37-connected-floral-v2.json','neon-plate27-bouquet-v1.json'];
 const profiles=[];
 for(const file of files){
  const a:ObservedMotifAnnotations=JSON.parse(readFileSync('data/research/motif-annotations/'+file,'utf8'));
  const sourceId=file.includes('plate27')?'commons-96737731':'commons-96737753';
  const image=readFileSync(`data/research/motif-references/${sourceId}/source.jpg`);
  if(createHash('sha256').update(image).digest('hex')!==a.provenance.originalSha256)throw new Error('Source hash mismatch');
  const metadata=await sharp(image).metadata();if(metadata.width!==a.image.width||metadata.height!==a.image.height)throw new Error('Source dimensions mismatch');
  const graph=graphFromObservedAnnotations(a,a.image.width),profile=profileMotifConstruction(graph);profiles.push({annotationId:a.id,profile});
  if(file.includes('plate27')){
   const ir=reconstructMotif(graph),structure=measureMotifStructure(graph);
   const expected=a.elements.flatMap(e=>e.paths.flatMap(path=>path.map(([x,y])=>({x,y}))));
   const actual=ir.flatMap(o=>o.kind==='fill'?o.polygon:o.path);
   const coordinatePreserved=JSON.stringify(expected)===JSON.stringify(actual);
   if(!coordinatePreserved||structure.brokenJunctions)throw new Error('Bouquet reconstruction changed annotations');
   writeFileSync(`${out}/plate27-graph.json`,JSON.stringify(graph,null,2));writeFileSync(`${out}/plate27-reference.svg`,stitchIrToSvg(ir,graph.widthMm,graph.heightMm));
   const paths=ir.map(o=>{const p=o.kind==='fill'?o.polygon:o.path;return `<polyline points="${p.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${o.id.includes('stem')?'#ff6500':'#a326bb'}" stroke-width="2"/>`;}).join('');
   writeFileSync(`${out}/plate27-overlay.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 780"><rect width="1280" height="780" fill="white"/><image width="1280" height="736" href="data:image/jpeg;base64,${image.toString('base64')}"/>${paths}<text x="12" y="764" font-family="sans-serif" font-size="18">Neon plate 27: partial draft bouquet; not exact tracing or machine stitches.</text></svg>`);
   const layout=layoutReferenceMotifRegion(graph,{id:'bouquet-panel-reference',widthMm:130,heightMm:180,columns:1,rows:1,gapMm:8,marginMm:8});
   writeFileSync(`${out}/bouquet-panel-reference.svg`,stitchIrToSvg(reconstructMotif(layout.graph),layout.graph.widthMm,layout.graph.heightMm));
  }
 }
 const [before,detail,bouquet]=profiles.map(p=>p.profile);
 const preservedSkeleton=JSON.stringify(before.unitDegrees)===JSON.stringify(detail.unitDegrees);
 if(!preservedSkeleton||bouquet.maxUnitDegree!==4||bouquet.maximumAssemblyNestingDepth!==2)throw new Error('Construction profile regression');
 const report={schema:'ascend.motif-construction-benchmark.v1',profiles,
  comparisons:{plate37DetailPreservesUnitSkeleton:preservedSkeleton,plate37AddedElements:detail.elementCount-before.elementCount,
   plate37MaximumUnitDegree:detail.maxUnitDegree,plate27MaximumUnitDegree:bouquet.maxUnitDegree,
   plate37MaximumAssemblyNestingDepth:detail.maximumAssemblyNestingDepth,plate27MaximumAssemblyNestingDepth:bouquet.maximumAssemblyNestingDepth},
  independentExpertAnnotationsAvailable:false,imageTracingAccuracy:null,modelTrainingPerformed:false,productionApproved:false,
  limitations:['Statistics describe declared draft annotation networks, not verified historical grammar.','Unit degree counts neighbouring motif assemblies, not the valence of an individual geometric junction.','Network cycle rank is not a count of fabric holes or stitch loops.','Plate 27 reconstruction is partial; the vase and lower border are not reconstructed.']};
 writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({comparisons:report.comparisons,sourceCount:2,productionApproved:false},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
