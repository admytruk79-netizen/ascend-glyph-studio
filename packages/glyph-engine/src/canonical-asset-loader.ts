export interface BinaryAssetStore{get(key:string):Promise<Uint8Array>;exists(key:string):Promise<boolean>}
export interface CanonicalGlyphAssetRef{id:string;family:string;sourceVersion:number;vectorAssetKey:string}
export function canonicalR2Key(g:CanonicalGlyphAssetRef){return `glyphs/${g.family}/${g.id}/v${g.sourceVersion}.svg`}
export async function loadCanonicalGlyphSvg(store:BinaryAssetStore,g:CanonicalGlyphAssetRef):Promise<{key:string;svg:string}>{
 const canonicalKey=canonicalR2Key(g);
 if(g.vectorAssetKey!==canonicalKey)throw new Error(`canonical-vector-key-mismatch:${g.id}:${g.vectorAssetKey}:${canonicalKey}`);
 if(!await store.exists(canonicalKey))throw new Error(`canonical-vector-asset-missing:${g.id}:${canonicalKey}`);
 const bytes=await store.get(canonicalKey),svg=new TextDecoder().decode(bytes);
 if(!/^\s*<svg[\s>]/i.test(svg)||!/<path\b/i.test(svg))throw new Error(`invalid-canonical-svg:${g.id}`);
 return{key:canonicalKey,svg};
}
