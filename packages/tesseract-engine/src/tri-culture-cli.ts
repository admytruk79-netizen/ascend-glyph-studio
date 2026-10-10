/** Actual Tesseract generator, with traceable cultural evidence and five-element ASCEND philosophy. */
import {writeFileSync,mkdirSync} from "node:fs";
import {join} from "node:path";
import {generatePatterns} from "./pattern-generator";
import {composeCompoundTextileSvg} from "./compound-ornament";
import {compoundMotifStitchIr,validateCompoundStitchIr} from "./compound-stitch-ir";
import {compoundIrSvg,compoundColourChart} from "./compound-textile-compiler";
import {ASCEND_ELEMENTS,FUSION_ROLES,ascendFusionInput,resolveCultureEvidence,type ElementId} from "./ascend-fusion";
const dir=process.env.TESSERACT_OUTPUT_DIR??"artifacts/tri-culture";
mkdirSync(dir,{recursive:true});
const seed=process.env.TESSERACT_SEED??"ascend-triculture-20261009";
const requested=["ukraine","arabic","arab","native-american","indigenous-north-america"];
const evidence=resolveCultureEvidence(requested);
const results=[];
const compoundPlan=compoundMotifStitchIr({id:"ascend-focal",kind:"branching-garden",xMm:150,yMm:150,radiusMm:62});
const compoundValidation=validateCompoundStitchIr(compoundPlan,300,300);
if(!compoundValidation.valid)throw new Error("Compound textile validation failed: "+compoundValidation.errors.join("; "));
writeFileSync(join(dir,"compound-stitch-ir.json"),JSON.stringify({units:"mm",widthMm:300,heightMm:300,validation:compoundValidation,objects:compoundPlan},null,2));
writeFileSync(join(dir,"compound-shared-geometry.svg"),compoundIrSvg(compoundPlan,300,300));
writeFileSync(join(dir,"compound-textile-colour-chart.json"),JSON.stringify(compoundColourChart(compoundPlan,300,300),null,2));
for(const element of Object.keys(ASCEND_ELEMENTS) as ElementId[]){
 for(const medium of ["embroidery","print"] as const){
  const input=ascendFusionInput(seed,medium,element);
  const patterns=generatePatterns(input);
  if(!patterns.length)throw new Error(`Tesseract produced no ${element}/${medium} patterns`);
  const outputs=patterns.map((p,i)=>{
   const file=join(dir,`${element}-${medium}-${i+1}.svg`);
   if(!p.svg.startsWith("<svg")||!p.svg.includes("</svg>"))throw new Error("Invalid SVG from engine");
   writeFileSync(file,composeCompoundTextileSvg(p.svg,seed+"-"+element+"-"+medium+"-"+i));
   return {file,id:p.id,score:p.score,novelty:p.novelty,critique:p.finalCritique,
    productionObjects:p.productionObjects?.length??0,physicalSizeMm:p.physicalSizeMm};
  });
  results.push({element,philosophy:ASCEND_ELEMENTS[element],medium,outputs});
 }
}
const report={seed,compoundValidation,engine:"generatePatterns",roles:FUSION_ROLES,evidence,results,
 warnings:["The evidence report shows which cultural identifiers actually exist; unresolved traditions are not represented by verified corpus conditioning.","Print SVG is not a weaving machine file; embroidery SVG requires stitch-plan and machine validation before manufacturing.","ASCEND symbolism is original interpretation, not a traditional cultural attribution."]};
writeFileSync(join(dir,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify({seed,evidence,groups:results.map(r=>({element:r.element,medium:r.medium,count:r.outputs.length}))},null,2));
