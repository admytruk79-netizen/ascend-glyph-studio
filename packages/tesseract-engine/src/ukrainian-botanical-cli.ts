import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {generatePatterns} from './pattern-generator';
import {BOTANICAL_KINDS} from './ukrainian-botanical';
const dir=process.env.TESSERACT_OUTPUT_DIR??'artifacts/ukrainian-botanical';mkdirSync(dir,{recursive:true});
const report=[];
for(const palette of ['red-cream','garden-dark'] as const)for(const kind of BOTANICAL_KINDS){
 const p=generatePatterns({seed:'botanical-study-20261010',concepts:[],compositionStyle:'ukrainian-botanical',botanicalKind:kind,botanicalPalette:palette,mode:'field',medium:'embroidery',variations:1})[0]!;
 const name=kind+'-'+palette;writeFileSync(join(dir,name+'.svg'),p.svg);writeFileSync(join(dir,name+'-ir.json'),JSON.stringify({units:'mm',physicalSizeMm:p.physicalSizeMm,sourceEvidence:p.sourceEvidence,objects:p.stitchObjects},null,2));report.push(p.sourceEvidence);
}
writeFileSync(join(dir,'report.json'),JSON.stringify({engine:'generatePatterns',designs:report,limitations:['Independently drawn, human-authored construction rules; no copied images or traced historical motifs.','Public title previews reviewed only; subscriber-only photographs were not accessed.','Design geometry requires digitisation and physical sampling before textile production.']},null,2));console.log('Exported six botanical compositions through generatePatterns.');
