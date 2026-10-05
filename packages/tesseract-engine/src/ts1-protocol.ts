export type Ts1Classification="private"|"restricted"|"mission";
export interface Ts1Header{version:"TS-1";suite:string;messageId:string;classification:Ts1Classification;senderKeyId:string;recipientKeyIds:string[];createdAt:string;expiresAt?:string;nonce:string;sequence?:number;previousMessageId?:string;aad:string}
export interface Ts1Envelope{header:Ts1Header;wrappedKeys:string[];ciphertext:string;authTag:string;signature:string}
export interface Ts1CryptoProvider{
 readonly suite:string;
 randomId():Promise<string>;
 randomNonce():Promise<string>;
 seal(plaintext:Uint8Array,aad:Uint8Array,nonce:string,recipientKeyIds:string[]):Promise<{ciphertext:string;authTag:string;wrappedKeys:string[]}>;
 sign(data:Uint8Array,senderKeyId:string):Promise<string>;
 verify(data:Uint8Array,signature:string,senderKeyId:string):Promise<boolean>;
 open(envelope:Ts1Envelope,recipientKeyId:string):Promise<Uint8Array>;
}
const enc=new TextEncoder();
export function canonicalTs1SigningBytes(e:Omit<Ts1Envelope,"signature">):Uint8Array{return enc.encode(JSON.stringify({header:e.header,wrappedKeys:e.wrappedKeys,ciphertext:e.ciphertext,authTag:e.authTag}))}
export async function createTs1Envelope(p:Ts1CryptoProvider,input:{plaintext:Uint8Array;classification:Ts1Classification;senderKeyId:string;recipientKeyIds:string[];createdAt:string;expiresAt?:string;sequence?:number;previousMessageId?:string;aad:string}):Promise<Ts1Envelope>{
 if(!input.recipientKeyIds.length)throw new Error("TS-1 requires at least one recipient");
 const messageId=await p.randomId(),nonce=await p.randomNonce();
 const header:Ts1Header={version:"TS-1",suite:p.suite,messageId,classification:input.classification,senderKeyId:input.senderKeyId,recipientKeyIds:[...input.recipientKeyIds].sort(),createdAt:input.createdAt,expiresAt:input.expiresAt,nonce,sequence:input.sequence,previousMessageId:input.previousMessageId,aad:input.aad};
 const sealed=await p.seal(input.plaintext,enc.encode(input.aad),nonce,header.recipientKeyIds);
 const unsigned={header,wrappedKeys:sealed.wrappedKeys,ciphertext:sealed.ciphertext,authTag:sealed.authTag};
 return{...unsigned,signature:await p.sign(canonicalTs1SigningBytes(unsigned),input.senderKeyId)}
}
export async function verifyTs1Envelope(p:Ts1CryptoProvider,e:Ts1Envelope,nowIso:string):Promise<{ok:boolean;reason?:string}>{
 if(e.header.version!=="TS-1")return{ok:false,reason:"unsupported-version"};
 if(e.header.suite!==p.suite)return{ok:false,reason:"unsupported-suite"};
 if(e.header.expiresAt&&Date.parse(nowIso)>Date.parse(e.header.expiresAt))return{ok:false,reason:"expired"};
 const{signature,...unsigned}=e;
 if(!await p.verify(canonicalTs1SigningBytes(unsigned),signature,e.header.senderKeyId))return{ok:false,reason:"bad-signature"};
 return{ok:true}
}
