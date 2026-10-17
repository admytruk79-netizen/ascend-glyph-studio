import { glyphRegistry } from "../glyph-registry/src/registry";

export type BandMode="poltava"|"podillia"|"hutsul"|"bukovyna"|"polissia"|"zaporizhzhia";
export type BandPlacement={glyphId:string;version:1;x:number;y:number;scale:number;rotation:number;mirrorX:boolean;role:"guard"|"pulse"|"satellite"|"anchor"};
export type DiaryBandRecipe={id:string;mode:BandMode;widthMm:number;heightMm:number;placements:BandPlacement[];productionReady:boolean;blockedGlyphIds:string[]};

const MODE={
 poltava:{anchorEvery:4,micro:.25,secondary:.46,breath:34},
 podillia:{anchorEvery:2,micro:.32,secondary:.58,breath:14},
 hutsul:{anchorEvery:2,micro:.30,secondary:.62,breath:10},
 bukovyna:{anchorEvery:3,micro:.28,secondary:.55,breath:12},
 polissia:{anchorEvery:4,micro:.24,secondary:.44,breath:28},
 zaporizhzhia:{anchorEvery:3,micro:.27,secondary:.50,breath:38}
} as const;

export function buildDiaryBand(id:string,mode:BandMode,glyphIds:string[],heightMm=210,widthMm=26):DiaryBandRecipe{
 if(!glyphIds.length) throw new Error("Diary band requires ASCEND source glyphs");
 const records=glyphIds.map(id=>glyphRegistry.find(g=>g.id===id)).filter(Boolean) as typeof glyphRegistry;
 if(records.length!==glyphIds.length) throw new Error("Unknown ASCEND glyph ID");
 const blocked=records.filter(g=>g.status!=="canonical-digital"||g.vectorStatus!=="geometry-verified").map(g=>g.id);
 const m=MODE[mode], placements:BandPlacement[]=[];
 let y=6,phrase=0;
 while(y<heightMm-8){
  const anchor=records[phrase%records.length];
  placements.push({glyphId:anchor.id,version:1,x:widthMm/2,y,scale:1,rotation:phrase%2?180:0,mirrorX:phrase%2===1,role:"anchor"});
  const sat=records[(phrase+1)%records.length];
  placements.push({glyphId:sat.id,version:1,x:widthMm*.26,y:y+7,scale:m.secondary,rotation:0,mirrorX:false,role:"satellite"});
  placements.push({glyphId:sat.id,version:1,x:widthMm*.74,y:y+7,scale:m.secondary,rotation:0,mirrorX:true,role:"satellite"});
  const guard=records[(phrase+2)%records.length];
  placements.push({glyphId:guard.id,version:1,x:2,y:y+3,scale:m.micro,rotation:90,mirrorX:false,role:"guard"});
  placements.push({glyphId:guard.id,version:1,x:widthMm-2,y:y+3,scale:m.micro,rotation:-90,mirrorX:true,role:"guard"});
  y+=18+(phrase%m.anchorEvery===m.anchorEvery-1?m.breath:0); phrase++;
 }
 return {id,mode,widthMm,heightMm,placements,productionReady:blocked.length===0,blockedGlyphIds:[...new Set(blocked)]};
}

export function assertProductionBand(recipe:DiaryBandRecipe){
 if(!recipe.productionReady) throw new Error("NON-PRODUCTION glyph geometry: "+recipe.blockedGlyphIds.join(", "));
 return recipe;
}
