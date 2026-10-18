import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {ACTIVE_VINE_STUDY,vineStudyAnnotations} from '../packages/tesseract-engine/src/vine-construction-study';
import {graphFromObservedAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {measureMotifStructure} from '../packages/tesseract-engine/src/motif-reconstruction';
import {measureMotifClearance} from '../packages/tesseract-engine/src/motif-clearance';
import {NEON_MOTIF_SELECTION} from '../packages/tesseract-engine/src/neon-motif-selection';
import {composeDetailedMotifParts} from '../packages/tesseract-engine/src/motif-part-composer';
async function main(){
 const out='data/research/motif-benchmarks/source-guided-vine-v1';mkdirSync(out,{recursive:true});const study=ACTIVE_VINE_STUDY,source=readFileSync('data/research/motif-references/commons-96737741/source.jpg');
 if(createHash('sha256').update(source).digest('hex')!==study.provenance.originalSha256)throw Error('vine-study:source-hash');
 const annotations=vineStudyAnnotations(study),graph=graphFromObservedAnnotations(annotations,study.image.width),structure=measureMotifStructure(graph),clearance=measureMotifClearance(graph);
 const moved=structuredClone(graph);moved.nodes.find(n=>n.id===`element:branch-${study.heads[0]!.id}`)!.transform.xMm=3;const negativeControl=measureMotifStructure(moved);if(!negativeControl.brokenJunctions)throw Error('missing-negative-control');
 const drawing=annotations.elements.map(e=>`<polyline points="${e.paths[0]!.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${e.id==='spine'?'#2a664d':e.id.startsWith('branch-')?'#766c5d':'#b82444'}" stroke-width="${e.id==='spine'?7:3}"/>`).join('');
 const diagram=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${study.image.width} ${study.image.height}"><rect width="${study.image.width}" height="${study.image.height}" fill="#f5efe3"/>${drawing}</svg>`;
 writeFileSync(`${out}/macro-reconstruction.svg`,diagram);writeFileSync(`${out}/macro-graph.json`,JSON.stringify(graph));
 const library=JSON.parse(readFileSync('data/research/motif-parts-v2/library.json','utf8')),cases=[];
 for(const seed of [0,1,7]){const result=composeDetailedMotifParts(library,{widthMm:250,heightMm:80,complexity:.8,family:'floral',seed},study,NEON_MOTIF_SELECTION);writeFileSync(`${out}/seed-${seed}.svg`,result.svg);await sharp(Buffer.from(result.svg)).resize({width:1500}).png().toFile(`${out}/seed-${seed}.png`);cases.push({seed,parts:result.placements.length,structure:result.structure,checks:result.checks,skippedLeaves:result.skippedLeaves,contourRefinement:result.contourRefinement,productionApproved:result.productionApproved,stitchCount:result.stitchCount});}
 const report={schema:'ascend.source-guided-vine-benchmark.v1',sourceSha256:study.provenance.originalSha256,studyId:study.id,review:'draft',macroReconstruction:{structure,portsOffPath:clearance.portsOffPath,outsideEnvelope:clearance.outsideEnvelope,negativeControl,independentImageAccuracy:null},cases,modelTrainingPerformed:false,selectionModelApplied:NEON_MOTIF_SELECTION,productionApproved:false,limitations:['Macro source reconstruction consists of manual axes, envelopes and relationships, not a full reconstruction of the artwork.','Generated heads reuse attributed plate 27/31/37 contours in a plate 31-informed layout. Interpreted cleanup, backing and recolouring change those contours.','Main layout fits horizontal and vertical space independently; each placed source shape uses uniform scale.','Small or colliding leaves are reduced or omitted explicitly. Detailed contour digitization and physical validation remain incomplete.']};writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
