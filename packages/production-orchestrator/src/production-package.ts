import type {ProductionDesignManifest} from "./production-manifest";
import {assertLockedManifest} from "./production-manifest";
export interface ProductionPackage {
 packageVersion:"1"; packageId:string; manifest:ProductionDesignManifest;
 files:ReadonlyArray<{role:"tech-pack"|"placement-preview"|"canonical-svg"|"bom"|"thread-spec"|"machine-manifest";key:string;sha256:string}>;
 createdAt:string;
}
export function createProductionPackage(input:{manifest:ProductionDesignManifest;files:ProductionPackage["files"];createdAt:string}):ProductionPackage{
 assertLockedManifest(input.manifest);
 const required=["tech-pack","placement-preview","canonical-svg","bom","thread-spec","machine-manifest"] as const;
 for(const role of required)if(!input.files.some(f=>f.role===role))throw new Error(`missing production file: ${role}`);
 if(input.files.some(f=>!f.key||!/^[a-f0-9]{64}$/i.test(f.sha256)))throw new Error("every production file requires key and sha256");
 return Object.freeze({packageVersion:"1",packageId:`${input.manifest.designId}:v${input.manifest.designVersion}`,manifest:input.manifest,files:Object.freeze([...input.files]),createdAt:input.createdAt});
}