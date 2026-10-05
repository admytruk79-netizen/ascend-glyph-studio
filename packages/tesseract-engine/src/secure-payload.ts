import{createCipheriv,createDecipheriv,randomBytes}from"node:crypto";
export type AccessTier="public"|"private"|"restricted";
export interface ProtectedPayload{v:1;alg:"aes-256-gcm";tier:Exclude<AccessTier,"public">;keyId:string;iv:string;tag:string;ciphertext:string}
const b64=(b:Buffer)=>b.toString("base64url"),unb64=(s:string)=>Buffer.from(s,"base64url");
export function protectPayload(plaintext:Uint8Array,key:Uint8Array,keyId:string,tier:Exclude<AccessTier,"public">):ProtectedPayload{
 if(key.byteLength!==32)throw new Error("AES-256-GCM requires a 32-byte key");
 if(!keyId)throw new Error("keyId required");
 const iv=randomBytes(12),c=createCipheriv("aes-256-gcm",key,iv);
 c.setAAD(Buffer.from("ASCEND-TESSERACT|v1|"+tier+"|"+keyId));
 const ciphertext=Buffer.concat([c.update(plaintext),c.final()]);
 return{v:1,alg:"aes-256-gcm",tier,keyId,iv:b64(iv),tag:b64(c.getAuthTag()),ciphertext:b64(ciphertext)};
}
export function openPayload(p:ProtectedPayload,key:Uint8Array):Buffer{
 if(p.v!==1||p.alg!=="aes-256-gcm")throw new Error("unsupported protected payload");
 if(key.byteLength!==32)throw new Error("AES-256-GCM requires a 32-byte key");
 const d=createDecipheriv("aes-256-gcm",key,unb64(p.iv));
 d.setAAD(Buffer.from("ASCEND-TESSERACT|v1|"+p.tier+"|"+p.keyId));d.setAuthTag(unb64(p.tag));
 return Buffer.concat([d.update(unb64(p.ciphertext)),d.final()]);
}
export function assertAuthorized(p:ProtectedPayload,allowedKeyIds:ReadonlySet<string>){if(!allowedKeyIds.has(p.keyId))throw new Error("access denied")}
