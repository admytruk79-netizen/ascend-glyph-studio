import {createHash} from "node:crypto";
import {encodeMessage,type CodecOptions} from "./codec.js";
import {layoutBand,type BandObject} from "./band.js";
import {layoutOrnamentMessage,ornamentMessageSvg} from "./ornament-message.js";
import type {PublicLayer,SecretLayer} from "./payload.js";

export type ApparelMessageMode="plain-text"|"secure-band";
export type ApparelMessageLayerDescriptor={
  id:string;
  zoneId:string;
  mode:ApparelMessageMode;
  codecVersion:string;
  payloadHash:string;
  widthMm:number;
  heightMm:number;
  repeats:number;
  verified:boolean;
  registryRef?:string;
  keyId?:number;
};

const sha256=(bytes:Uint8Array|string)=>createHash("sha256").update(bytes).digest("hex");

export function buildPlainTextApparelLayer(input:{
  id:string;zoneId:string;text:string;lengthMm?:number;pitchMm?:number;heightMm?:number;
}):{descriptor:ApparelMessageLayerDescriptor;svg:string}{
  const layout=layoutOrnamentMessage(input.text,{length:input.lengthMm,pitch:input.pitchMm,height:input.heightMm});
  return {
    descriptor:{
      id:input.id,zoneId:input.zoneId,mode:"plain-text",codecVersion:"ornament-message-v1",
      payloadHash:sha256(input.text),widthMm:layout.width,heightMm:layout.height,
      repeats:layout.repeats,verified:true
    },
    svg:ornamentMessageSvg(layout.objects,layout.width,layout.height)
  };
}

export async function buildSecureApparelLayer(input:{
  id:string;zoneId:string;
  publicLayer:Omit<PublicLayer,"version">;
  secretLayer:SecretLayer;
  unitKey:CryptoKey;
  registryRef?:string;
  rows?:number;pitchMm?:number;heightMm?:number;rowGapMm?:number;
  codec?:CodecOptions;
}):Promise<{descriptor:ApparelMessageLayerDescriptor;objects:BandObject[]}>{
  const encoded=await encodeMessage(input.publicLayer,input.secretLayer,input.unitKey,input.codec);
  const rows=Math.max(1,input.rows??1),pitch=input.pitchMm??10,height=input.heightMm??10,rowGap=input.rowGapMm??1.5;
  const perRow=Math.ceil(encoded.symbols.length/rows);
  const objects=layoutBand(encoded.symbols,{rows,pitch,height,rowGap});
  return {
    descriptor:{
      id:input.id,zoneId:input.zoneId,mode:"secure-band",codecVersion:"secure-glyph-v1",
      payloadHash:sha256(encoded.record),widthMm:perRow*pitch,
      heightMm:rows*height+(rows-1)*rowGap,repeats:1,verified:true,
      registryRef:input.registryRef,keyId:input.publicLayer.keyId
    },
    objects
  };
}
