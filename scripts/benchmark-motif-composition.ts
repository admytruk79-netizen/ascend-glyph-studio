import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {composeReferenceMotifFields,type MotifCompositionField} from '../packages/tesseract-engine/src/motif-composition-layout';
import {reconstructMotif} from '../packages/tesseract-engine/src/motif-reconstruction';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
import {assertMotifGraph} from '../packages/tesseract-engine/src/motif-graph';
const source=(file:string)=>{
 const a:ObservedMotifAnnotations=JSON.parse(readFileSync('data/research/motif-annotations/'+file,'utf8'));
 const sourceId=file.includes('plate27')?'commons-96737731':'commons-96737753';
 const image=readFileSync(`data/research/motif-references/${sourceId}/source.jpg`);
 if(createHash('sha256').update(image).digest('hex')!==a.provenance.originalSha256)throw new Error('Source hash mismatch');
 return graphFromObservedAnnotations(a,a.image.width);
};
const floral=source('neon-plate37-connected-floral-v2.json'),bouquet=source('neon-plate27-bouquet-v1.json');
// Author a vertical presentation of the same permitted observed geometry.
const vertical=structuredClone(floral),root=vertical.nodes.find(n=>n.kind==='composition')!;
root.transform.rotationDeg=90;root.transform.xMm=floral.heightMm;
vertical.widthMm=floral.heightMm;vertical.heightMm=floral.widthMm;
// A transformed lineage gets its own identifier; do not merge incompatible
// provenance histories merely because they share an original image.
const oldProvenanceId=vertical.provenance[0].id;
vertical.provenance[0].id+=':vertical-study';
for(const n of vertical.nodes)if(n.provenanceId===oldProvenanceId)n.provenanceId=vertical.provenance[0].id;
vertical.provenance[0].transformations.push({operation:'authored 90 degree reference rotation',evidence:'Presentation for side-field experiment; not a historical rotation rule.'});
assertMotifGraph(vertical);
const out='artifacts/motif-reconstruction/composition-fields';mkdirSync(out,{recursive:true});
const reports=[],gallery:string[]=[];
for(const [index,variant] of [{id:'open-field',sideRows:2,bodyColumns:1,bodyRows:1},{id:'mixed-scales',sideRows:3,bodyColumns:2,bodyRows:1},{id:'dense-field',sideRows:4,bodyColumns:2,bodyRows:2}].entries()){
 const field=(id:string,xMm:number,yMm:number,widthMm:number,heightMm:number,columns:number,rows:number,s=floral):MotifCompositionField=>({id,xMm,yMm,source:s,layout:{id,widthMm,heightMm,columns,rows,gapMm:8,marginMm:5}});
 const fields=[field('left-edge',10,10,45,420,1,variant.sideRows,vertical),field('right-edge',305,10,45,420,1,variant.sideRows,vertical),
  field('main-field',75,170,210,240,variant.bodyColumns,variant.bodyRows,bouquet),field('terminal-band',10,440,340,70,2,1)];
 const result=composeReferenceMotifFields(360,520,fields),graph=result.graph;
 const svg=stitchIrToSvg(reconstructMotif(graph),graph.widthMm,graph.heightMm);
 writeFileSync(`${out}/${variant.id}.svg`,svg);writeFileSync(`${out}/${variant.id}.graph.json`,JSON.stringify(graph,null,2));
 const inner=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<rect[^>]*width="100%"[^>]*\/>/,'');
 gallery.push(`<g transform="translate(${index*380+10},30)"><text x="0" y="-10" font-size="14">${variant.id} — authored reference</text>${inner}</g>`);
 reports.push({id:variant.id,fieldCount:result.fields.length,elementCount:graph.nodes.filter(n=>n.kind==='element').length,
  fields:result.fields,structure:result.structure,clearance:result.clearance,productionApproved:false});
}
writeFileSync(`${out}/gallery.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1140 570"><rect width="1140" height="570" fill="white"/><g font-family="sans-serif">${gallery.join('')}</g></svg>`);
const report={schema:'ascend.motif-composition-benchmark.v1',compositionReferences:['https://krovets.ua/item/kro-537','https://krovets.ua/item/kro-610','https://krovets.ua/item/kro-613'],
 geometrySources:[floral.provenance[0].source,bouquet.provenance[0].source],variants:reports,modelTrainingPerformed:false,productionApproved:false,stitchCount:null,
 limitations:['Krovets public previews inform field/border organisation only; no Krovets photos or traced geometry are included.','These are authored layouts of partial Neon reference motifs, not reconstructions of Krovets objects or complete historic trees.','Object-specific Poltava attribution must not be transferred to the Neon geometry.','Rectangles are composition regions, not physical garment cuts or machine hoops.','No new botanical grammar, machine digitization or physical calibration is claimed.']};
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(reports.map(r=>({id:r.id,elementCount:r.elementCount,brokenJunctions:r.structure.brokenJunctions,productionApproved:false})),null,2));
