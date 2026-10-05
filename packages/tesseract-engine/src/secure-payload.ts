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


export interface RestrictedSecurityPolicy{
 version:1;
 classification:"restricted";
 requireExternalKms:true;
 requireHardwareBackedKeys:true;
 requireMfa:true;
 requireSignedReader:true;
 requireAuditLog:true;
 offlineRevocationMaxAgeHours:number;
 maxKeyAgeDays:number;
}
export const RESTRICTED_SECURITY_POLICY:RestrictedSecurityPolicy={
 version:1,classification:"restricted",requireExternalKms:true,requireHardwareBackedKeys:true,
 requireMfa:true,requireSignedReader:true,requireAuditLog:true,offlineRevocationMaxAgeHours:24,maxKeyAgeDays:30
};
export interface AuthorizationContext{subjectId:string;roles:string[];deviceAttested:boolean;mfa:boolean;readerSigned:boolean;revocationAgeHours:number}
export function authorizeRestricted(ctx:AuthorizationContext,requiredRole:string,policy=RESTRICTED_SECURITY_POLICY){
 if(!ctx.roles.includes(requiredRole))throw new Error("required role missing");
 if(policy.requireMfa&&!ctx.mfa)throw new Error("MFA required");
 if(policy.requireHardwareBackedKeys&&!ctx.deviceAttested)throw new Error("device attestation required");
 if(policy.requireSignedReader&&!ctx.readerSigned)throw new Error("signed reader required");
 if(ctx.revocationAgeHours>policy.offlineRevocationMaxAgeHours)throw new Error("revocation state stale");
 return true;
}
