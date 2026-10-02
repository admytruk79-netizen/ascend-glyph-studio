export type GlyphPlacement={glyphId:string;x:number;y:number;scale:number;rotation:number;mirrorX:boolean;mirrorY:boolean;z:number};
export type SavedDesign={id:string;version:number;garmentId:string;zoneId:string;mode:"emblem"|"border"|"path"|"field"|"composition";placements:GlyphPlacement[]};

export function renderPlacement(p:GlyphPlacement,href:string){
 const sx=p.mirrorX?-p.scale:p.scale, sy=p.mirrorY?-p.scale:p.scale;
 return `<use href="${href}" transform="translate(${p.x} ${p.y}) rotate(${p.rotation}) scale(${sx} ${sy})"/>`;
}

export function designManifest(d:SavedDesign){
 return JSON.stringify({schema:"ascend.design.v1",...d,placements:[...d.placements].sort((a,b)=>a.z-b.z)});
}
