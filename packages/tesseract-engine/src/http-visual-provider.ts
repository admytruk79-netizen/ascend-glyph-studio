import type {VisualCandidate,VisualGenerationRequest,VisualGeneratorProvider} from "./visual-generator";
type FetchLike=(input:string,init?:RequestInit)=>Promise<Response>;
export type HttpVisualProviderOptions={baseUrl:string;token?:string;model:string;fetch?:FetchLike};
export class HttpVisualProvider implements VisualGeneratorProvider{
 readonly id:string;private f:FetchLike;
 constructor(private o:HttpVisualProviderOptions){this.id="http:"+o.model;this.f=o.fetch??fetch}
 private async call<T>(path:string,body:unknown):Promise<T>{const r=await this.f(this.o.baseUrl.replace(/\/$/,"")+path,{method:"POST",headers:{"content-type":"application/json",...(this.o.token?{authorization:"Bearer "+this.o.token}:{})},body:JSON.stringify(body)});if(!r.ok)throw new Error("Visual provider "+path+" failed: "+r.status+" "+(await r.text()).slice(0,500));return await r.json() as T}
 async generate(request:VisualGenerationRequest){return (await this.call<{candidates:VisualCandidate[]}>("/generate",{model:this.o.model,request})).candidates}
 async embed(imageUri:string){return (await this.call<{embedding:number[]}>("/embed",{model:this.o.model,imageUri})).embedding}
 async segment(imageUri:string){return await this.call<{maskUri:string;labels:string[]}>("/segment",{model:this.o.model,imageUri})}
 async estimateDepth(imageUri:string){return await this.call<{depthUri:string}>("/depth",{model:this.o.model,imageUri})}
}
export function httpVisualProviderFromEnv(env:Record<string,string|undefined>=process.env){
 const baseUrl=env.TESSERACT_VISUAL_BASE_URL,model=env.TESSERACT_VISUAL_MODEL;
 if(!baseUrl||!model)throw new Error("TESSERACT_VISUAL_BASE_URL and TESSERACT_VISUAL_MODEL are required");
 return new HttpVisualProvider({baseUrl,model,token:env.TESSERACT_VISUAL_TOKEN});
}
