import{generatePatterns,type PatternMode}from"./pattern-generator";
import{writeFileSync}from"node:fs";
const modes:PatternMode[]=["band","cuff","collar","sleeve","emblem","field"];
const dims:Record<PatternMode,[number,number]>={band:[1200,220],cuff:[900,180],collar:[1000,180],sleeve:[700,1400],emblem:[800,800],field:[1200,900]};
for(const mode of modes){
 const [width,height]=dims[mode];
 const patterns=generatePatterns({seed:`specimen-${mode}-01`,concepts:["ancestry","freedom","protection","return","ascent"],mode,complexity:.72,variations:8,width,height,paletteId:"underdog-heritage"});
 if(!patterns.length)throw new Error(`No accepted specimen patterns for ${mode}`);
 const best=patterns[0]!;
 writeFileSync(`dist/specimen-${mode}.svg`,best.svg);
 writeFileSync(`dist/specimen-${mode}.json`,JSON.stringify({mode,id:best.id,lineageId:best.lineageId,generatorScore:best.generatorScore,aesthetic:best.aesthetic,quality:best.quality},null,2));
 console.log(`dist/specimen-${mode}.svg`);
}
