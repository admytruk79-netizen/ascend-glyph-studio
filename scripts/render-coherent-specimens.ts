import {mkdirSync,writeFileSync} from "node:fs";
import {renderCoherentBand,type BandGrammar} from "../packages/tesseract-engine/src/coherent-band";
import {assessCoherentBand} from "../packages/tesseract-engine/src/coherent-band-quality";
import type {Topology} from "../packages/tesseract-engine/src/topology";
const dir=process.env.SPECIMEN_OUT??"out/tesseract-specimens";
mkdirSync(dir,{recursive:true});
const topology:Topology={nodes:[
 {id:"source-seed",conceptId:"origin",form:"seed",scale:2},
 {id:"source-orbit",conceptId:"journey",form:"orbit",scale:1.6},
 {id:"source-branch",conceptId:"ancestors",form:"branch",scale:2.4},
 {id:"source-crossing",conceptId:"choice",form:"crossing",scale:1.4},
 {id:"source-axis",conceptId:"ascent",form:"axis",scale:2.2}
],edges:[]};
const grammars:BandGrammar[]=["continuity","alternation","return","passage","development"];
const specimens=grammars.map((grammar,i)=>{
 const result=renderCoherentBand(topology,{width:1200,height:240,seed:20261011+i,grammar});
 const assessment=assessCoherentBand(topology,result,grammar,1200,240);
 const filename=grammar+".svg";
 writeFileSync(dir+"/"+filename,result.svg);
 return {grammar,filename,...assessment};
});
writeFileSync(dir+"/assessment.json",JSON.stringify({generator:"coherent-band-v1",trained:false,productionApproved:false,sourceGeometry:"provisional",specimens},null,2));
console.log(JSON.stringify({output:dir,specimens:specimens.length,assessment:specimens.map(s=>({grammar:s.grammar,score:s.score,accepted:s.accepted,reasons:s.reasons}))}));
if(specimens.some(s=>!s.accepted))process.exitCode=1;
