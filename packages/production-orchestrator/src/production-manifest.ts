export type ProductionGate="design-locked"|"production-validated"|"manufacturer-eligible"|"payment-captured"|"package-generated"|"manufacturer-accepted"|"in-production"|"qc-passed"|"shipped"|"delivered";

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
 pricing:{currency:string;customerTotalMinor:number};
}

export function assertLockedManifest(m:ProductionDesignManifest):void{
 if(!m.designId||m.designVersion<1||!m.lockedAt)throw new Error("design identity must be locked");
 if(m.glyphs.length===0||m.glyphs.some(g=>!g.glyphId||!g.canonicalVersion))throw new Error("canonical glyph versions required");
 if(!m.tesseract.seed||!m.tesseract.stateHash)throw new Error("reproducible Tesseract state required");
 if(!m.garment.styleId||!m.garment.revision||!m.garment.size)throw new Error("garment revision and size required");
 if(!m.material.materialId||!m.material.revision||!m.material.colorId)throw new Error("material revision and color required");
 if(m.manufacturing.recipeIds.length===0||!m.manufacturing.capabilityProfileVersion)throw new Error("approved manufacturing recipe/capability required");
 if(!Number.isInteger(m.pricing.customerTotalMinor)||m.pricing.customerTotalMinor<0)throw new Error("valid integer minor-unit total required");
}
