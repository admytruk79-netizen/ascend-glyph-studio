import type {VisualFeatureVector} from "./visual-features";

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const count=(s:string,re:RegExp)=>[...s.matchAll(re)].length;
const entropy=(xs:number[])=>{const sum=xs.reduce((a,b)=>a+b,0)||1;return -xs.reduce((h,x)=>{const p=x/sum;return p>0?h+p*Math.log(p):h},0)/Math.log(Math.max(2,xs.length))};

export type SvgStructuralAnalysis={
 vector:VisualFeatureVector;
 metrics:{paths:number;groups:number;transforms:number;mirrors:number;uniquePathRatio:number;layerCount:number;opacityLayers:number;strokeWidth:number;viewAspect:number};
 flags:string[];
};

export function analyzeSvgStructure(svg:string):SvgStructuralAnalysis{
 const flags:string[]=[];
 const pathTags=[...svg.matchAll(/<path\b[^>]*>/g)].map(x=>x[0]);
 const paths=pathTags.map(tag=>tag.match(/\bd="([^"]*)"/)?.[1]??"").filter(Boolean);
 const groups=count(svg,/<g\b/g),transforms=count(svg,/transform="/g),mirrors=count(svg,/scale\(\s*-1(?:\s|\))/g);
 const opacities=count(svg,/opacity="/g),layers=count(svg,/data-(?:rich|composition|sash)-layer=/g);
 const strokes=[...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(x=>Number(x[1])).filter(Number.isFinite);
 const strokeWidth=strokes.length?strokes.reduce((a,b)=>a+b,0)/strokes.length:2;
 const vb=svg.match(/viewBox="[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)"/);
 const w=Number(vb?.[1]||1),h=Number(vb?.[2]||1),aspect=w/Math.max(1,h);
 const unique=new Set(paths.map(d=>d.replace(/\s+/g," ").trim()));
 const uniquePathRatio=paths.length?unique.size/paths.length:0;
 const rawRepeatedPathRatio=1-uniquePathRatio;
 const transformRelief=Math.min(.72,transforms/Math.max(1,paths.length)*.9);
 const repeatedPathRatio=clamp(rawRepeatedPathRatio*(1-transformRelief));
 const pathData=paths.join(" ");
 const cmds={M:count(pathData,/[Mm](?=[\s,.-]*\d)/g),L:count(pathData,/[Ll](?=[\s,.-]*\d)/g),C:count(pathData,/[Cc](?=[\s,.-]*\d)/g),Q:count(pathData,/[Qq](?=[\s,.-]*\d)/g),A:count(pathData,/[Aa](?=[\s,.-]*\d)/g),H:count(pathData,/[Hh](?=[\s,.-]*\d)/g),V:count(pathData,/[Vv](?=[\s,.-]*\d)/g)};
 const directionalEntropy=clamp(entropy([cmds.L+cmds.H,cmds.V,cmds.C+cmds.Q,cmds.A]));
 const commandTotal=Object.values(cmds).reduce((a,b)=>a+b,0);
 const density=clamp(commandTotal/900);
 const densityVariation=clamp((uniquePathRatio*.45)+(layers>1?.25:0)+(opacities>1?.15:0)+(transforms>2?.15:0));
 const symmetry=clamp(mirrors/Math.max(1,transforms)*.75 + repeatedPathRatio*.35);
 const periodicity=clamp(repeatedPathRatio*.65 + (layers>2?.2:0) + (mirrors>1?.15:0));
 const interruption=clamp((opacities>0?.2:0)+(transforms>0?.15:0)+uniquePathRatio*.45+(layers>2?.2:0));
 const scaleLevels=clamp(Math.max(1,layers)/6);
 const focalDominance=clamp(uniquePathRatio*.35 + (layers>=3?.25:.08) + (opacities>=2?.18:0) + Math.min(.22,Math.abs(aspect-3)*.04));
 const asymmetryBalance=clamp((1-symmetry)*.55 + interruption*.25 + densityVariation*.2);
 const motifFieldRatio=clamp(paths.length/(paths.length+groups+8));
 const compositionalDepth=clamp(scaleLevels*.3+densityVariation*.3+focalDominance*.25+interruption*.15);
 const embroideryComplexity=clamp(density*.3+densityVariation*.25+Math.min(1,strokeWidth/4)*.2+periodicity*.25);
 const voidRatio=clamp(1-density*.62-periodicity*.12);
 if(repeatedPathRatio>.72)flags.push("excessive-path-repetition");
 if(symmetry>.82&&periodicity>.72)flags.push("sampler-strip-risk");
 if(compositionalDepth<.32)flags.push("flat-composition");
 if(focalDominance<.28)flags.push("weak-focal-hierarchy");
 if(voidRatio<.16)flags.push("insufficient-negative-space");
 return {vector:{
  symmetry,density,voidRatio,scaleLevels,
  vertical:aspect<1.3?1:.25,horizontal:aspect>2?1:.25,radial:clamp(cmds.A/Math.max(1,commandTotal)*4),field:aspect<3?1:.45,wrap:aspect>2.5?1:.3,
  branching:clamp((cmds.C+cmds.Q)/Math.max(1,commandTotal)*3),repetition:clamp(repeatedPathRatio),interruption,closure:clamp(cmds.A/Math.max(1,commandTotal)*2),
  densityVariation,directionalEntropy,axisStrength:clamp(Math.max(symmetry,aspect>2?0.72:0.4)),rotation180:clamp(mirrors>1?.7:symmetry*.5),
  periodicity,focalDominance,asymmetryBalance,motifFieldRatio,compositionalDepth,embroideryComplexity
 },metrics:{paths:paths.length,groups,transforms,mirrors,uniquePathRatio,layerCount:layers,opacityLayers:opacities,strokeWidth,viewAspect:aspect},flags};
}
