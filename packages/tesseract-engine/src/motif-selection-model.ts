export type MotifSelectionModel={schema:'ascend.source-motif-selection.v1';status:'candidate';sourceCount:number;sourceGroupCount:number;descriptorCount:number;centroidCount:number;weights:Record<string,number>;trainingReportSha256:string;scope:'descriptor-similarity-part-selection';artisticQualityModelTrained:false};
export function weightedSourceMotifOrder<T extends {id:string}>(items:T[],model:MotifSelectionModel,random:()=>number):T[]{
 if(model.schema!=='ascend.source-motif-selection.v1'||model.status!=='candidate'||model.scope!=='descriptor-similarity-part-selection'||model.artisticQualityModelTrained!==false||![model.sourceCount,model.sourceGroupCount,model.descriptorCount,model.centroidCount].every(v=>Number.isInteger(v)&&v>0)||! /^[a-f0-9]{64}$/.test(model.trainingReportSha256))throw Error('motif-selection:model');
 for(const item of items)if(!Number.isFinite(model.weights[item.id])||model.weights[item.id]!<=0)throw Error('motif-selection:weight');
 return items.map(item=>({item,key:-Math.log(Math.max(1e-12,Math.min(1,random())))/model.weights[item.id]!})).sort((a,b)=>a.key-b.key||a.item.id.localeCompare(b.item.id)).map(row=>row.item);
}
