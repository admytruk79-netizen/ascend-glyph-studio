import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {generatePatterns} from "./pattern-generator";
import {UKRAINIAN_BAND_SOURCE} from "./ukrainian-band";
const dir=process.env.TESSERACT_OUTPUT_DIR??"artifacts/ukrainian-bands";
mkdirSync(dir,{recursive:true});
const patterns=generatePatterns({seed:"neon-ukrainian-reviewed-20261010",concepts:[],compositionStyle:"ukrainian-counted-band",mode:"band",medium:"embroidery",variations:3});
for(const p of patterns){const name=p.sourceEvidence!.kind;writeFileSync(join(dir,name+".svg"),p.svg);writeFileSync(join(dir,name+"-ir.json"),JSON.stringify({units:"mm",physicalSizeMm:p.physicalSizeMm,sourceEvidence:p.sourceEvidence,objects:p.stitchObjects},null,2));}
const report={engine:"generatePatterns",compositionStyle:"ukrainian-counted-band",evidence:UKRAINIAN_BAND_SOURCE,designs:patterns.map(p=>p.sourceEvidence),status:"design-prototypes",limitations:["One visually reviewed Ukrainian source; no claim to all Neon records or regional authenticity.","Human-authored rules from source observations and recorded structural metrics; not an ML motif-recognition model.","Fill IR requires embroidery digitisation and physical sew-out before production."]};
writeFileSync(join(dir,"report.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report.designs,null,2));
