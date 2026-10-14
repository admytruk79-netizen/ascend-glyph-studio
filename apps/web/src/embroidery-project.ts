export type EmbroiderySettings = {
 method: 'detail'|'learned'|'jigsaw'|'authored';
 motif: 'auto'|'tree'|'rose'|'lily'|'horns'|'medallion'|'rhomb-frame';
 machineProfile: string; widthMm: number; heightMm: number;
 complexity: number; family: 'floral'|'geometric'; seed: number;
};
export function readEmbroideryProject(text: string, machineIds: readonly string[]): EmbroiderySettings {
 if(text.length>16384)throw new Error('Project file is too large.');
 const project=JSON.parse(text);
 if(project?.format!=='ascend-embroidery-project'||project.version!==1)throw new Error('Choose an ASCEND embroidery project file.');
 const s=project.settings;
 if(!s||!['detail','learned','jigsaw','authored'].includes(s.method)||!['auto','tree','rose','lily','horns','medallion','rhomb-frame'].includes(s.motif)||!['floral','geometric'].includes(s.family))throw new Error('The project has unsupported motif settings.');
 if(s.machineProfile!=='none'&&!machineIds.includes(s.machineProfile))throw new Error('The project uses an unavailable machine profile.');
 for(const [key,min,max] of [['widthMm',80,600],['heightMm',40,160],['complexity',0,1],['seed',0,Number.MAX_SAFE_INTEGER]] as const){
  if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw new Error(`Invalid project ${key}.`);
 }
 if(!Number.isSafeInteger(s.seed))throw new Error('Invalid project seed.');
 return {method:s.method,motif:s.motif,machineProfile:s.machineProfile,widthMm:s.widthMm,heightMm:s.heightMm,complexity:s.complexity,family:s.family,seed:s.seed};
}
export function writeEmbroideryProject(settings: EmbroiderySettings): string {
 return JSON.stringify({format:'ascend-embroidery-project',version:1,settings},null,2);
}
