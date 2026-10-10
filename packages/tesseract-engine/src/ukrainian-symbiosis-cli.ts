import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {generatePatterns} from './pattern-generator';
import {SYMBIOSIS_KINDS} from './ukrainian-symbiosis';
const dir=process.env.TESSERACT_OUTPUT_DIR??'artifacts/ukrainian-symbiosis';mkdirSync(dir,{recursive:true});const designs=[];
for(const kind of SYMBIOSIS_KINDS)for(const palette of ['red-cream','garden-dark'] as const){
 const p=generatePatterns({seed:'symbiosis-reviewed-20261010',concepts:[],compositionStyle:'ukrainian-symbiosis',symbiosisKind:kind,botanicalPalette:palette,mode:'field',medium:'print',variations:1})[0]!;
 const name=kind+'-'+palette;writeFileSync(join(dir,name+'.svg'),p.svg);writeFileSync(join(dir,name+'-ir.json'),JSON.stringify({units:'mm',physicalSizeMm:p.physicalSizeMm,sourceEvidence:p.sourceEvidence,objects:p.stitchObjects},null,2));designs.push(p.sourceEvidence);
}writeFileSync(join(dir,'report.json'),JSON.stringify({engine:'generatePatterns',designs,status:'contemporary-fusion-design-prototypes'},null,2));console.log('Exported eight symbiosis designs.');
