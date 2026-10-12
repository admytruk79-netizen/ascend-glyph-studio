import {assertMotifGraph,transformMotifPoint,type MotifGraph} from './motif-graph';
import {assertObservedContainment} from './motif-containment';
import {segmentDistance} from './motif-clearance';
import type {StitchIrPoint as Point} from './production-stitch-ir';
export const MOTIF_RELATION_LABELS=['none','junction','nest'] as const;
export type MotifRelationLabel=typeof MOTIF_RELATION_LABELS[number];
export const MOTIF_RELATION_FEATURES=['dx','dy','logExtentRatio','boxOverlap','containsA','containsB','closedA','closedB','portsA','portsB','portNear','boundaryNear'] as const;
export type MotifPairFeatures={from:string;to:string;features:number[]};
export type MotifRelationTrainingRow=MotifPairFeatures&{label:MotifRelationLabel};
export type MotifRelationModel={schema:'ascend.motif-relation-model.v1';state:'REFERENCE';status:'candidate';method:'class-balanced-multinomial-logistic-v1';
 featureOrder:string[];labels:MotifRelationLabel[];mean:number[];sd:number[];weights:number[][];bias:number[];classCounts:number[];
 epochs:number;learningRate:number;l2:number;lossTrace:{epoch:number;loss:number}[];productionApproved:false};
const clamp=(v:number)=>Math.max(-6,Math.min(6,v));
/** Geometry and supplied ports only. No node IDs, hypothesis text, cultural labels,
 * hierarchy or declared relations enter features. This is not image segmentation. */
export function motifPairFeatures(graph:MotifGraph):MotifPairFeatures[]{
 assertMotifGraph(graph);
 const nodes=graph.nodes.filter(n=>n.kind==='element');
 if(nodes.length>128)throw new Error('motif-learning:too-many-elements');
 const diagonal=Math.hypot(graph.widthMm,graph.heightMm);
 const elements=nodes.map(n=>{
  const paths=n.geometry!.paths.map(path=>path.map(p=>transformMotifPoint(graph,n.id,p))),points=paths.flat();
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const p of points){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
  const ports=Object.values(n.geometry!.ports).map(p=>transformMotifPoint(graph,n.id,p));
  return {id:n.id,paths,ports,x0,y0,x1,y1,cx:(x0+x1)/2,cy:(y0+y1)/2,
   extent:Math.max(1e-8,Math.hypot(x1-x0,y1-y0)/diagonal),area:Math.max(1e-12,(x1-x0)*(y1-y0)/(diagonal*diagonal)),
   closed:paths.every(p=>p[0].x===p.at(-1)!.x&&p[0].y===p.at(-1)!.y),
   segments:paths.flatMap(p=>p.slice(1).map((v,i)=>[p[i],v] as [Point,Point]))};
 });
 const rows:MotifPairFeatures[]=[];
 for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++){
  const a=elements[i],b=elements[j];
  const contains=(outer:typeof a,inner:typeof a)=>{try{assertObservedContainment(outer.paths,inner.paths);return 1;}catch{return 0;}};
  const ab=contains(a,b),ba=contains(b,a);
  const overlap=Math.max(0,Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0))*Math.max(0,Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0))/(diagonal*diagonal);
  let portDistance=Infinity,boundaryDistance=Infinity;
  for(const p of a.ports)for(const q of b.ports)portDistance=Math.min(portDistance,Math.hypot(p.x-q.x,p.y-q.y));
  for(const p of a.segments)for(const q of b.segments)boundaryDistance=Math.min(boundaryDistance,segmentDistance(p,q));
  const nearPort=Number.isFinite(portDistance)?Math.exp(-portDistance/diagonal*200):0;
  const nearBoundary=Number.isFinite(boundaryDistance)?Math.exp(-boundaryDistance/diagonal*100):0;
  const make=(x:typeof a,y:typeof a,xy:number,yx:number):MotifPairFeatures=>({from:x.id,to:y.id,features:[
   (y.cx-x.cx)/diagonal,(y.cy-x.cy)/diagonal,clamp(Math.log(y.extent/x.extent)),Math.min(1,overlap/Math.min(x.area,y.area)),
   xy,yx,Number(x.closed),Number(y.closed),Number(x.ports.length>0),Number(y.ports.length>0),nearPort,nearBoundary]});
  rows.push(make(a,b,ab,ba),make(b,a,ba,ab));
 }
 return rows;
}
/** Labels come from declared manual contacts/nesting, independently of features. */
export function motifRelationTrainingRows(graph:MotifGraph):MotifRelationTrainingRow[]{
 const pairs=motifPairFeatures(graph),labels=new Map<string,MotifRelationLabel>();
 const put=(from:string,to:string,label:MotifRelationLabel)=>{
  const key=from+'|'+to;if(labels.has(key)&&labels.get(key)!==label)throw new Error('motif-learning:conflicting-label');labels.set(key,label);
 };
 for(const r of graph.relations){
  if(r.kind==='junction'){put(r.from,r.to,'junction');put(r.to,r.from,'junction');}
  if(r.kind==='nest'){
   const from=graph.nodes.filter(n=>n.kind==='element'&&n.parentId===r.from);
   const to=graph.nodes.find(n=>n.id===r.to);
   if(from.length!==1||to?.kind!=='element')throw new Error('motif-learning:ambiguous-nest-label');
   put(from[0].id,to.id,'nest');
  }
 }
 return pairs.map(p=>({...p,label:labels.get(p.from+'|'+p.to)??'none'}));
}
function probabilities(scores:number[],counts:number[]){
 const active=scores.filter((_,i)=>counts[i]>0),max=Math.max(...active);
 const exp=scores.map((s,i)=>counts[i]>0?Math.exp(s-max):0),total=exp.reduce((n,x)=>n+x,0);
 return exp.map(x=>x/total);
}
export function fitMotifRelationModel(rows:MotifRelationTrainingRow[],options:{epochs?:number;learningRate?:number;l2?:number}={}):MotifRelationModel{
 const epochs=options.epochs??1500,learningRate=options.learningRate??.08,l2=options.l2??.01;
 if(rows.length<2||rows.length>100000||!Number.isInteger(epochs)||epochs<1||epochs>10000
  ||!Number.isFinite(learningRate)||learningRate<=0||learningRate>1||!Number.isFinite(l2)||l2<0)throw new Error('motif-learning:fit-options');
 const k=MOTIF_RELATION_LABELS.length,d=MOTIF_RELATION_FEATURES.length;
 if(rows.some(r=>r.features.length!==d||r.features.some(v=>!Number.isFinite(v))||!MOTIF_RELATION_LABELS.includes(r.label)))throw new Error('motif-learning:training-row');
 const mean=Array.from({length:d},(_,i)=>rows.reduce((n,r)=>n+r.features[i],0)/rows.length);
 const sd=mean.map((m,i)=>Math.sqrt(rows.reduce((n,r)=>n+(r.features[i]-m)**2,0)/rows.length)||1);
 const data=rows.map(r=>({x:r.features.map((v,i)=>(v-mean[i])/sd[i]),y:MOTIF_RELATION_LABELS.indexOf(r.label)}));
 const counts=MOTIF_RELATION_LABELS.map(label=>rows.filter(r=>r.label===label).length),present=counts.filter(n=>n>0).length;
 const classWeights=counts.map(n=>n?rows.length/(present*n):0);
 const weights=Array.from({length:k},()=>Array(d).fill(0) as number[]),bias=Array(k).fill(0) as number[],lossTrace:{epoch:number;loss:number}[]=[];
 for(let epoch=0;epoch<epochs;epoch++){
  const gradient=Array.from({length:k},()=>Array(d).fill(0) as number[]),gb=Array(k).fill(0) as number[];let loss=0;
  for(const row of data){
   const p=probabilities(weights.map((w,c)=>w.reduce((n,v,i)=>n+v*row.x[i],bias[c])),counts),cw=classWeights[row.y];
   loss-=cw*Math.log(Math.max(p[row.y],1e-15));
   for(let c=0;c<k;c++){if(!counts[c])continue;const error=cw*(p[c]-Number(c===row.y));gb[c]+=error;
    for(let i=0;i<d;i++)gradient[c][i]+=error*row.x[i];}
  }
  for(let c=0;c<k;c++)for(let i=0;i<d;i++)loss+=rows.length*l2*weights[c][i]**2/2;
  if(epoch%100===0||epoch===epochs-1)lossTrace.push({epoch,loss:loss/rows.length});
  for(let c=0;c<k;c++){bias[c]-=learningRate*gb[c]/rows.length;
   for(let i=0;i<d;i++)weights[c][i]-=learningRate*(gradient[c][i]/rows.length+l2*weights[c][i]);}
 }
 const model:MotifRelationModel={schema:'ascend.motif-relation-model.v1',state:'REFERENCE',status:'candidate',method:'class-balanced-multinomial-logistic-v1',featureOrder:[...MOTIF_RELATION_FEATURES],labels:[...MOTIF_RELATION_LABELS],mean,sd,weights,bias,classCounts:counts,epochs,learningRate,l2,lossTrace,productionApproved:false};
 assertMotifRelationModel(model);return model;
}
export function assertMotifRelationModel(m:MotifRelationModel){
 const d=MOTIF_RELATION_FEATURES.length,k=MOTIF_RELATION_LABELS.length;
 if(m.schema!=='ascend.motif-relation-model.v1'||m.state!=='REFERENCE'||m.status!=='candidate'||m.method!=='class-balanced-multinomial-logistic-v1'||m.productionApproved!==false
  ||JSON.stringify(m.featureOrder)!==JSON.stringify(MOTIF_RELATION_FEATURES)||JSON.stringify(m.labels)!==JSON.stringify(MOTIF_RELATION_LABELS)
  ||m.mean.length!==d||m.sd.length!==d||m.weights.length!==k||m.bias.length!==k||m.classCounts.length!==k
  ||[...m.mean,...m.sd,...m.bias,...m.weights.flat()].some(v=>!Number.isFinite(v))||m.sd.some(v=>v<=0)
  ||m.weights.some(w=>w.length!==d)||m.classCounts.some(n=>!Number.isInteger(n)||n<0)||!m.classCounts.some(n=>n>0))throw new Error('motif-learning:model');
}
export function predictMotifRelation(m:MotifRelationModel,features:number[]){
 assertMotifRelationModel(m);
 if(features.length!==m.mean.length||features.some(v=>!Number.isFinite(v)))throw new Error('motif-learning:features');
 const x=features.map((v,i)=>(v-m.mean[i])/m.sd[i]);
 const scores=m.weights.map((w,c)=>w.reduce((n,v,i)=>n+v*x[i],m.bias[c]));
 if(scores.some(v=>!Number.isFinite(v)))throw new Error('motif-learning:prediction-overflow');
 const p=probabilities(scores,m.classCounts),index=p.indexOf(Math.max(...p));
 return {label:m.labels[index],probabilities:Object.fromEntries(m.labels.map((label,i)=>[label,p[i]])) as Record<MotifRelationLabel,number>,productionApproved:false as const};
}
/** Ranked assistance only. No graph edits, inferred ports or manufacturing approval. */
export function rankMotifRelationCandidates(graph:MotifGraph,model:MotifRelationModel){
 return motifPairFeatures(graph).map(p=>({...p,...predictMotifRelation(model,p.features)}))
  .sort((a,b)=>(1-b.probabilities.none)-(1-a.probabilities.none)||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
}
