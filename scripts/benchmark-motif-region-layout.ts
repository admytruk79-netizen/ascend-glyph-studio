import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../packages/tesseract-engine/src/motif-observed-annotations';
import {layoutReferenceMotifRegion,type MotifRegionLayout} from '../packages/tesseract-engine/src/motif-region-layout';
import {reconstructMotif} from '../packages/tesseract-engine/src/motif-reconstruction';
import {stitchIrToSvg} from '../packages/tesseract-engine/src/canonical-preview';
const a:ObservedMotifAnnotations=JSON.parse(readFileSync('data/research/motif-annotations/neon-plate37-connected-floral-v2.json','utf8'));
if(createHash('sha256').update(readFileSync('data/research/motif-references/commons-96737753/source.jpg')).digest('hex')!==a.provenance.originalSha256)throw new Error('Source hash mismatch');
const source=graphFromObservedAnnotations(a,1280);
const layouts:MotifRegionLayout[]=[
 {id:'sleeve-panel-reference',widthMm:130,heightMm:240,columns:2,rows:5,gapMm:8,marginMm:8,mirrorAlternateRows:true},
 {id:'cuff-band-reference',widthMm:180,heightMm:42,columns:4,rows:1,gapMm:6,marginMm:4},
 {id:'collar-band-reference',widthMm:180,heightMm:25,columns:6,rows:1,gapMm:4,marginMm:3}
];
const out='artifacts/motif-reconstruction/garment-regions';mkdirSync(out,{recursive:true});
const reports=[],gallery:string[]=[];
layouts.forEach((layout,index)=>{
 const result=layoutReferenceMotifRegion(source,layout),ir=reconstructMotif(result.graph);
 writeFileSync(`${out}/${layout.id}.svg`,stitchIrToSvg(ir,layout.widthMm,layout.heightMm));
 writeFileSync(`${out}/${layout.id}.json`,JSON.stringify(result.graph,null,2));
 const colorIr=ir.map(o=>({...o,color:o.id.includes('stem')?'#466543':o.id.includes('inset')?'#9b653f':'#803145'}));
 const svg=stitchIrToSvg(colorIr,layout.widthMm,layout.heightMm);
 const body=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>')).replace(/^<rect[^>]*\/>/,'');
 const x=index===0?12:168,y=index===0?30:index===1?30:110;
 gallery.push(`<g transform="translate(${x},${y})"><text y="-7" font-size="5">${layout.id}</text><rect width="${layout.widthMm}" height="${layout.heightMm}" fill="#faf7ef" stroke="#ddd" stroke-width=".3"/>${body}</g>`);
 reports.push({id:layout.id,region:layout,tileCount:result.placements.length,elementCount:result.graph.nodes.filter(n=>n.kind==='element').length,
  uniformScale:result.scale,structure:result.structure,minimumReferenceCentrelineGapMm:result.clearance.minimumCenterlineGapMm,
  referenceClearanceViolations:result.clearance.clearanceViolations.length,productionApproved:false,stitchCount:null});
});
writeFileSync(`${out}/gallery.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 364 286"><rect width="364" height="286" fill="white"/><g font-family="sans-serif">${gallery.join('')}<text x="168" y="164" font-size="5">Neon plate 37, authored reference layouts</text><text x="168" y="174" font-size="5">Grid repeats are not inferred historical grammar.</text><text x="168" y="184" font-size="5">Region dimensions are design references,</text><text x="168" y="194" font-size="5">not a measured garment or machine plan.</text></g></svg>`);
const report={schema:'ascend.motif-region-benchmark.v1',motifSource:'commons-96737753',layoutStudy:'https://vytvory.ua/uk/catalog',
 layoutAuthorship:'ASCEND development reference grid; no Vytvory artwork or template copied',regions:reports,modelTrainingPerformed:false,
 limitations:['Original contour annotations remain approximate drafts.','Rectangular reference regions are not actual garment pattern pieces.','Spacing is centreline geometry; manufacturing stroke widths, fabric and hoop registration remain unvalidated.','Site regional labels are not transferred to the Neon source.']};
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
