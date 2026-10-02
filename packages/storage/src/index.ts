export interface AssetStore {
 put(key:string, data:Uint8Array, contentType:string):Promise<{key:string;sha256:string}>;
 get(key:string):Promise<Uint8Array>;
 exists(key:string):Promise<boolean>;
}
export const assetKeys={
 atlas:(family:string)=>`atlas/v1/${family}.png`,
 glyph:(family:string,id:string,version=1)=>`glyphs/${family}/${id}/v${version}.svg`,
 preview:(designId:string,version:number)=>`designs/${designId}/v${version}/preview.png`,
 production:(designId:string,version:number,name:string)=>`production/${designId}/v${version}/${name}`
} as const;
