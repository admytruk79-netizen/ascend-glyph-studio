import {composeBand, type LegoGrammar} from './lego-compose.ts';
import {BRICKS,type BrickId} from './lego.ts';
import {inspectLearnedMotifAssembly,assertLearnedMotifSnapshot,type LearnedMotifSnapshot} from '../../tesseract-engine/src/learned-motif-runtime.ts';
import {plan,estimateMinutes,runGate,previewSvg,recipes,type DesignObject} from '../../stitch-engine/src/index.ts';
import type {MachineTemplate} from '../../tesseract-engine/src/machine-template.ts';
export type LearnedCompositionInput={widthMm:number;heightMm:number;complexity:number;family:'floral'|'geometric';seed:number;motif?:'auto'|BrickId};
export function generateLearnedComposition(snapshot:LearnedMotifSnapshot,input:LearnedCompositionInput,machine?:MachineTemplate){
 assertLearnedMotifSnapshot(snapshot);
 const {widthMm:w,heightMm:h,complexity:c,seed}=input;
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<80||w>600||h<40||h>160||!Number.isFinite(c)||c<0||c>1||!Number.isSafeInteger(seed)||seed<0||seed>1000000||!['floral','geometric'].includes(input.family))throw Error('learned-runtime:input');
 const grammar:LegoGrammar=structuredClone(snapshot.grammar);
 const explicit=input.motif&&input.motif!=='auto'?input.motif:null;
 if(explicit&&(!BRICKS[explicit]||!grammar.bricks[explicit]||BRICKS[explicit].scale!=='hero'))throw Error('learned-runtime:unknown-hero');
 for(const [id,b] of Object.entries(grammar.bricks))if(BRICKS[id as BrickId]?.scale==='hero'&&
   (explicit?id!==explicit:input.family==='geometric'?!['medallion','rhomb-frame','constellation'].includes(id):['medallion','rhomb-frame','constellation'].includes(id)))b.share=0;
 const roles={main:'#a32235',dark:'#252020',leaf:'#252020',light:'#c1785c',accent:'#a32235'};
 const assembled=composeBand(grammar,{seed:`learned-${seed}`,length:w,height:h,roles,explore:c*.25,connectHeroes:true});
 const objects:DesignObject[]=assembled.kit.objs;
 const provenance={schema:'ascend.motif-provenance.v1' as const,id:'existing-ascend-folk-vocabulary',source:'repository:packages/blend-engine/src/folk-rich.ts',creator:'ASCEND existing authored motif vocabulary',community:null,
  culturalContext:'Contemporary authored interpretation; stored Ukrainian grammar selects families and companions. Not authenticated historical motif reconstruction or canonical ASCEND geometry.',retrievedAt:snapshot.source.retrievedAt,
  originalSha256:'c35835235dc77683ee79a2a36898756f13db3aba8743041457f61c26d026a751',
  permission:{status:'verified' as const,evidence:'Existing repository geometry reused under user instruction. Hash identifies folk-rich.ts source code, not a museum image or corpus licence.',purposes:['analysis','reconstruction'] as ('analysis'|'reconstruction')[]},access:'structural-public' as const,confidence:.7,
  transformations:[{operation:'existing Lego composition with learned grammar',evidence:`model ${snapshot.source.modelId}; built ${snapshot.source.modelBuiltAt}; scope ${snapshot.source.traditionScope}; seed ${seed}; learned selection, authored geometry`}],regionalAttribution:{status:'unassigned' as const}};
 const checked=inspectLearnedMotifAssembly(snapshot,objects,assembled.connections,{widthMm:w,heightMm:h,seed:`learned-${seed}`},provenance,machine,assembled.instances);
 const recipe=recipes['linen-180-prewashed']!,stitchPlan=plan(objects,recipe),minutes=estimateMinutes(stitchPlan,recipe.speedSpm);
 const gate=runGate(objects,stitchPlan.commands,recipe,{hoop:{name:machine?.id??'design canvas (not selected hardware)',width:machine?.fieldX.value??w,height:machine?.fieldY.value??h}},minutes);
 const body=objects.map(o=>o.kind==='fill'?`<polygon data-object-id="${o.id}" points="${o.polygon.map(p=>`${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(' ')}" fill="${o.color}"/>`:
  `<polyline data-object-id="${o.id}" points="${o.path.map(p=>`${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(' ')}" fill="none" stroke="${o.color}" stroke-width="${o.kind==='satin'?o.width:.45}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" data-design-state="learned-motif-reference"><metadata>Stored Ukrainian grammar selection; existing authored vector parts; calculated prototype stitches; production approval false.</metadata><rect width="${w}" height="${h}" fill="#f5efe3"/>${body}</svg>`;
 const blockers=[...checked.job.validation.errors,...gate.checks.filter(c=>!c.pass).map(c=>c.id),...(!machine?['machine-not-selected']:[]),'model-source-rights-review-pending'];
 return {...checked,input:{...input},svg,objects,assemblyPlan:assembled.plan,assemblies:assembled.instances,stitchPlan,stitchSvg:previewSvg(stitchPlan.commands,stitchPlan.colors),
  stitchCount:stitchPlan.commands.filter(c=>c.cmd==='stitch').length,estimatedMinutes:minutes,recipeId:recipe.id,gate,blockers,sourceImagesEmbedded:false};
}
