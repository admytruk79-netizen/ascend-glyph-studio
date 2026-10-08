export type ProductionGate="design-locked"|"production-validated"|"manufacturer-eligible"|"payment-captured"|"package-generated"|"manufacturer-accepted"|"in-production"|"qc-passed"|"shipped"|"delivered";

export interface EncodedApparelLayerManifest {
 id:string;
 zoneId:string;
 mode:"plain-text"|"secure-band";
 codecVersion:string;
 payloadHash:string;
 widthMm:number;
 heightMm:number;
 repeats:number;
 verified:boolean;
 registryRef?:string;
 keyId?:number;
}

export interface ProductionMathManifest {
 modelVersion:string;
 equation:string;
 scale:number;
 predictedStitches:number;
 compiledStitches?:number;
 needleThreadM:number;
 bobbinThreadM:number;
 machineMinutes:number;
 colors:number;
 calibrationRef?:string;
}

export interface ProductionDesignManifest {
 schemaVersion:"1";
 designId:string;
 designVersion:number;
 lockedAt:string;
 glyphs:ReadonlyArray<{glyphId:string;canonicalVersion:string}>;
 tesseract:{seed:string;stateHash:string};
 garment:{styleId:string;revision:string;size:string;zoneIds:readonly string[]};
 material:{materialId:string;revision:string;colorId:string};
 manufacturing:{recipeIds:readonly string[];capabilityProfileVersion:string};
 productionMath?:ProductionMathManifest;
 encodedLayers?:ReadonlyArray<EncodedApparelLayerManifest>;
 pricing:{currency:string;customerTotalMinor:number};
}

export function assertLockedManifest(m:ProductionDesignManifest):void{
 if(!m.designId||m.designVersion<1||!m.lockedAt)throw new Error("design identity must be locked");
 if(m.glyphs.length===0||m.glyphs.some(g=>!g.glyphId||!g.canonicalVersion))throw new Error("canonical glyph versions required");
 if(!m.tesseract.seed||!m.tesseract.stateHash)throw new Error("reproducible Tesseract state required");
 if(!m.garment.styleId||!m.garment.revision||!m.garment.size)throw new Error("garment revision and size required");
 if(!m.material.materialId||!m.material.revision||!m.material.colorId)throw new Error("material revision and color required");
 if(m.manufacturing.recipeIds.length===0||!m.manufacturing.capabilityProfileVersion)throw new Error("approved manufacturing recipe/capability required");
 if(m.productionMath){
  const x=m.productionMath;
  if(!x.modelVersion||!x.equation)throw new Error("production math model and equation required");
  if(!(x.scale>0)||!Number.isInteger(x.predictedStitches)||x.predictedStitches<0)throw new Error("valid production stitch estimate required");
  if(x.compiledStitches!==undefined&&(!Number.isInteger(x.compiledStitches)||x.compiledStitches<0))throw new Error("compiled stitch count must be a nonnegative integer");
  if(x.needleThreadM<0||x.bobbinThreadM<0||x.machineMinutes<0||!Number.isInteger(x.colors)||x.colors<1)throw new Error("invalid production math quantities");
 }
 const zones=new Set(m.garment.zoneIds);
 for(const layer of m.encodedLayers??[]){
  if(!layer.id||!layer.zoneId||!zones.has(layer.zoneId))throw new Error("encoded layer must target a locked garment zone");
  if(!/^[a-f0-9]{64}$/i.test(layer.payloadHash))throw new Error("encoded layer requires sha256 payload hash");
  if(!(layer.widthMm>0&&layer.heightMm>0&&layer.repeats>0))throw new Error("encoded layer geometry must be positive");
  if(!layer.verified)throw new Error("encoded layer must be verified before production lock");
  if(layer.mode==="secure-band"&&layer.keyId===undefined)throw new Error("secure encoded layer requires key id");
 }
 if(!Number.isInteger(m.pricing.customerTotalMinor)||m.pricing.customerTotalMinor<0)throw new Error("valid integer minor-unit total required");
}
