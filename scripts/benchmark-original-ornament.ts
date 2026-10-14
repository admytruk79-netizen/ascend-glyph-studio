import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generateOriginalOrnament} from '../packages/tesseract-engine/src/original-ornament-composition';
const out='data/research/motif-benchmarks/original-composition-v1';
mkdirSync(out,{recursive:true});
const cases=[{id:'floral-seed-0',family:'floral' as const,seed:0},{id:'floral-seed-1',family:'floral' as const,seed:1},{id:'geometric-seed-0',family:'geometric' as const,seed:0}];
const reports=cases.map(({id,...settings})=>{
 const input={widthMm:250,heightMm:80,complexity:.8,...settings},r=generateOriginalOrnament(input);
 if(r.structure.brokenJunctions||r.structure.brokenRepeats||r.clearance.clearanceViolations.length||r.clearance.outsideEnvelope.length)throw new Error(`invalid-composition:${id}`);
 writeFileSync(`${out}/${id}.svg`,r.svg+'\n');
 writeFileSync(`${out}/${id}.graph.json`,JSON.stringify(r.graph,null,2)+'\n');
 return {id,input,svgSha256:createHash('sha256').update(r.svg).digest('hex'),structure:r.structure,clearance:r.clearance,
  elementCount:r.graph.nodes.filter(n=>n.kind==='element').length,sourceImagesEmbedded:r.sourceImagesEmbedded,learnedModelApplied:r.learnedModelApplied,
  canonicalGeometryChanged:r.canonicalGeometryChanged,physicalCalibration:r.physicalCalibration,stitchCount:r.stitchCount,productionApproved:r.productionApproved};
});
if(reports[0].svgSha256===reports[1].svgSha256)throw new Error('seed-did-not-change-output');
writeFileSync(`${out}/report.json`,JSON.stringify({schema:'ascend.original-composition-benchmark.v1',method:'Authored procedural vector assembly through existing Tesseract components',noveltyAgainstFullCorpusVerified:false,reports},null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({id:r.id,parts:r.elementCount,junctions:r.structure.junctionCount,nests:r.structure.nestedRelations,productionApproved:false}))));
