export type SecurePayloadClass="private"|"restricted"|"mission";
export interface SecureCarrierHeaderV1{kind:"secure";version:1;classification:SecurePayloadClass;algorithm:string;keyId:string;nonce:string;expiresAt?:string;audience?:string[]}
export interface SecureCarrierV1{header:SecureCarrierHeaderV1;ciphertext:string;authTag:string;signature?:string}
/** Tesseract transports opaque authenticated ciphertext. Encryption/decryption and authorization belong to an external approved security boundary. */
export function createSecureCarrier(header:SecureCarrierHeaderV1,ciphertext:string,authTag:string,signature?:string):SecureCarrierV1{if(!header.algorithm||!header.keyId||!header.nonce)throw new Error("secure carrier requires algorithm, keyId and nonce");if(!ciphertext||!authTag)throw new Error("secure carrier requires ciphertext and authentication tag");return{header,ciphertext,authTag,signature}}
export function isSecureCarrier(x:unknown):x is SecureCarrierV1{if(!x||typeof x!=="object")return false;const v=x as SecureCarrierV1;return v.header?.kind==="secure"&&v.header?.version===1&&!!v.header.algorithm&&!!v.header.keyId&&!!v.header.nonce&&!!v.ciphertext&&!!v.authTag}
