import{PhraseField}from"./phrase-field";
export type FieldTransform="mirror-x"|"mirror-y"|"rotate-90"|"rotate-180"|"quarter-fold"|"overlay";
export interface TransformedField{sourceId:string;transform:FieldTransform;semanticChecksum:string;svgTransform:string;overlayOpacity?:number}
export function transformField(f:PhraseField,t:FieldTransform):TransformedField{const m:Record<FieldTransform,string>={"mirror-x":"translate(100 0) scale(-1 1)","mirror-y":"translate(0 100) scale(1 -1)","rotate-90":"rotate(90 50 50)","rotate-180":"rotate(180 50 50)","quarter-fold":"translate(50 50) scale(.5 .5) rotate(90) translate(-50 -50)","overlay":"rotate(180 50 50)"};return{sourceId:f.id,transform:t,semanticChecksum:f.semanticChecksum,svgTransform:m[t],...(t==="overlay"?{overlayOpacity:.42}:{})}}
export function allFieldTransforms(f:PhraseField){return(["mirror-x","mirror-y","rotate-90","rotate-180","quarter-fold","overlay"] as FieldTransform[]).map(t=>transformField(f,t))}
