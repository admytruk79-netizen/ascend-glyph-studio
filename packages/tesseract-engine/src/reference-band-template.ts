import {deriveZoneConstructionEnvelope} from './construction-envelope';
import {productionObjectsFromTopology,placeProductionObjects} from './production-object';
import {compileProductionObjectsToStitchIr} from './production-stitch-ir';
import {stitchIrToSvg} from './canonical-preview';
import {planEmbroideryJob} from './manufacturing-job-plan';
import {primitiveForForm} from './ascend-primitives';
import {machineTemplate,assertUsableMachineTemplate} from './machine-template';

/** Authored construction rule from reference studies, not a promoted learned
 * model or a reconstruction of a historical pattern. Canonical paths stay intact. */
export function generateReferenceBand(input:{widthMm:number;heightMm:number;complexity:number;seed:string;placement:'band'|'collar'|'cuff';machineProfileId?:string}){
 const {widthMm:w,heightMm:h}=input;
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<80||w>600||h<40||h>160||!Number.isFinite(input.complexity)||input.complexity<0||input.complexity>1||!input.seed
  ||!['band','collar','cuff'].includes(input.placement))throw new Error('reference-band:invalid-input');
 const machine=machineTemplate(input.machineProfileId);if(input.machineProfileId&&!machine)throw new Error('reference-band:unknown-machine');if(machine)assertUsableMachineTemplate(machine);
 const envelope=deriveZoneConstructionEnvelope([{id:'reference-band',kind:input.placement==='band'?'hem':input.placement,surface:'flat',widthMm:w,heightMm:h,editable:true,wrapAllowed:false}],
  'embroidery',undefined,{targetOccupancy:.65},machine);
 const base=Math.max(8,envelope.minFeatureMm*8),gap=Math.max(2,envelope.minGapMm),margin=gap*2;
 const count=Math.min(Math.floor(envelope.maxNodes/3),Math.floor((w-2*margin)/(base*.5+gap)),3+Math.round(input.complexity*9));
 if(count<2)throw new Error('reference-band:insufficient-capacity');
 const step=(w-2*margin)/count;
 const mainSize=Math.min(h*.35,step-gap,base*envelope.maxScaleLevels),edgeSize=Math.min(h*.14,mainSize*.5);
 if(edgeSize<base*.5)throw new Error('reference-band:insufficient-border-space');
 const forms=['radial-emission','axis','opposition','branch'];
 const offset=Array.from(input.seed).reduce((n,c)=>n+c.charCodeAt(0),0)%forms.length;
 const nodes=Array.from({length:3},(_,row)=>Array.from({length:count},(_,col)=>({id:`band-${row}-${col}`,conceptId:'authored-framed-repeat',
  form:row===1?forms[(col+offset)%forms.length]:'opposition',scale:(row===1?mainSize:edgeSize)/base}))).flat();
 const objects=productionObjectsFromTopology({nodes,edges:[]},envelope).map(o=>({...o,threadColor:o.id.startsWith('band-1-')?'#8b1538':'#202020'}));
 const placed=placeProductionObjects(objects,Object.fromEntries(nodes.map(n=>{const [,row,col]=n.id.split('-').map(Number);return [n.id,{x:margin+(col+.5)*step,y:h*[.13,.5,.87][row],angleDeg:col%2?180:0}];})));
 const stitchObjects=compileProductionObjectsToStitchIr(placed),job=planEmbroideryJob(stitchObjects,{widthMm:w,heightMm:h,machine});
 job.validation.valid=false;job.validation.errors.push('reference-construction-requires-digitization-and-sew-out');
 return {schema:'ascend.reference-band-template.v1' as const,status:'REFERENCE' as const,templateId:'framed-repeat-band-v1',
  svg:stitchIrToSvg(stitchObjects,w,h),productionObjects:placed,stitchObjects,manufacturingJob:job,columns:count,widthMm:w,heightMm:h,
  provenance:{studyIds:['user-reference-study-v1','cleveland-106581-placket-v1'],method:'authored three-band layout; source studies guide framing and differentiated scale, not canonical glyph paths',
   culturalAttribution:'Contemporary ASCEND composition; historical studies retain separate attribution',learnedModelApplied:false},
  canonicalPaths:nodes.map(n=>({id:n.id,form:n.form,paths:[...primitiveForForm(n.form)!.paths]})),stitchCount:null,productionApproved:false as const};
}
