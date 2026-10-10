/** Run the actual Tesseract generator; no image synthesis or mocked SVGs. */
import {writeFileSync,mkdirSync} from "node:fs";
import {join} from "node:path";
import {generatePatterns} from "./pattern-generator";
const dir=process.env.TESSERACT_OUTPUT_DIR??"artifacts/tri-culture";
mkdirSync(dir,{recursive:true});
const seed=process.env.TESSERACT_SEED??"ukraine-arabic-native-american-20261009";
const patterns=generatePatterns({
 seed,concepts:["ancestry","continuity","protection","journey","harmony","return"],
 cultureIds:["ukraine","arabic","arab","native-american","indigenous-north-america"],
 mode:"field",medium:"print",placement:"textile",width:1200,height:1200,
 variations:4,complexity:.82,population:64,generations:5
});
if(!patterns.length)throw new Error("Tesseract generated no patterns");
const report=patterns.map((p,i)=>{
 const file=join(dir,`tesseract-triculture-${i+1}.svg`);
 if(!p.svg.startsWith("<svg")||!p.svg.includes("</svg>"))throw new Error("Invalid SVG from engine");
 writeFileSync(file,p.svg);
 return {file,id:p.id,score:p.score,novelty:p.novelty,critique:p.finalCritique,
   physicalSizeMm:p.physicalSizeMm,productionObjects:p.productionObjects?.length??0};
});
writeFileSync(join(dir,"report.json"),JSON.stringify({seed,engine:"generatePatterns",inputCultures:["ukraine","arabic","arab","native-american","indigenous-north-america"],warning:"Culture identifiers must be checked against corpus graph; no claim of balanced cultural evidence",report},null,2));
console.log(JSON.stringify(report,null,2));
