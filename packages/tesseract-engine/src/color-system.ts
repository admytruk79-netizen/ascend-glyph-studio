export type AscendElement="earth"|"water"|"fire"|"air"|"spirit";
export type PaletteRole="ground"|"structure"|"accent"|"highlight";
export type MediumPaletteId="embroidery"|"leather-tooling"|"emboss"|"print";

export type AscendColor={
 id:string;name:string;hex:string;element?:AscendElement;roles:PaletteRole[];metallic?:boolean
};

export const ASCEND_COLORS:Record<string,AscendColor>={
 "midnight-navy":{id:"midnight-navy",name:"Midnight Navy",hex:"#0F1B2D",roles:["ground","structure"]},
 "raven-black":{id:"raven-black",name:"Raven Black",hex:"#111111",roles:["ground","structure"]},
 "bone-ivory":{id:"bone-ivory",name:"Bone Ivory",hex:"#F2E9D8",roles:["ground","structure","highlight"]},
 "natural-linen":{id:"natural-linen",name:"Natural Linen",hex:"#DCCFB8",roles:["ground"]},
 "ash-grey":{id:"ash-grey",name:"Ash Grey",hex:"#8C877F",roles:["structure"]},
 "ochre-gold":{id:"ochre-gold",name:"Ochre Gold",hex:"#B88A3B",element:"earth",roles:["accent","highlight"]},
 "clay-brown":{id:"clay-brown",name:"Clay Brown",hex:"#8A5A3A",element:"earth",roles:["accent","structure"]},
 "moss-green":{id:"moss-green",name:"Moss Green",hex:"#5E6B43",element:"earth",roles:["accent"]},
 "muted-teal":{id:"muted-teal",name:"Muted Teal",hex:"#2E6F73",element:"water",roles:["accent"]},
 "blue-slate":{id:"blue-slate",name:"Blue Slate",hex:"#4D667A",element:"water",roles:["accent","structure"]},
 "deep-water-blue":{id:"deep-water-blue",name:"Deep Water Blue",hex:"#25465A",element:"water",roles:["accent","ground"]},
 "oxblood":{id:"oxblood",name:"Oxblood",hex:"#7A1F2B",element:"fire",roles:["accent"]},
 "burnt-orange":{id:"burnt-orange",name:"Burnt Orange",hex:"#B6542A",element:"fire",roles:["accent"]},
 "copper-rust":{id:"copper-rust",name:"Copper Rust",hex:"#8F4426",element:"fire",roles:["accent","structure"]},
 "pale-smoke":{id:"pale-smoke",name:"Pale Smoke",hex:"#D8DDE0",element:"air",roles:["structure","highlight"]},
 "soft-sky-grey":{id:"soft-sky-grey",name:"Soft Sky Grey",hex:"#B8C4CF",element:"air",roles:["structure"]},
 "cool-mist":{id:"cool-mist",name:"Cool Mist",hex:"#E7ECEF",element:"air",roles:["highlight"]},
 "antique-gold":{id:"antique-gold",name:"Antique Gold",hex:"#C6A15B",element:"spirit",roles:["accent","highlight"],metallic:true},
 "starlight-white":{id:"starlight-white",name:"Starlight White",hex:"#F7F2E8",element:"spirit",roles:["structure","highlight"]},
 "deep-cosmic-blue":{id:"deep-cosmic-blue",name:"Deep Cosmic Blue",hex:"#17263D",element:"spirit",roles:["ground","structure"]}
};

export type AscendPalette={
 id:string;name:string;colors:{colorId:string;ratio:number;role:PaletteRole}[];
 mediums:MediumPaletteId[];notes:string[]
};

export const ASCEND_PALETTES:Record<string,AscendPalette>={
 "underdog-heritage":{
  id:"underdog-heritage",name:"Underdog Heritage",
  colors:[
   {colorId:"midnight-navy",ratio:.75,role:"ground"},
   {colorId:"bone-ivory",ratio:.12,role:"structure"},
   {colorId:"oxblood",ratio:.05,role:"accent"},
   {colorId:"muted-teal",ratio:.04,role:"accent"},
   {colorId:"ochre-gold",ratio:.04,role:"highlight"}
  ],
  mediums:["embroidery","print"],notes:["Quiet field over dense heritage band.","Use accent colors sparingly; geometry must remain legible in monochrome."]
 },
 "quiet-ceremonial":{
  id:"quiet-ceremonial",name:"Quiet Ceremonial",
  colors:[
   {colorId:"midnight-navy",ratio:.82,role:"ground"},
   {colorId:"bone-ivory",ratio:.14,role:"structure"},
   {colorId:"antique-gold",ratio:.04,role:"highlight"}
  ],
  mediums:["embroidery","emboss","print"],notes:["Minimal accent; no decorative gold saturation."]
 },
 "rugged-leather":{
  id:"rugged-leather",name:"Rugged Leather",
  colors:[
   {colorId:"raven-black",ratio:.72,role:"ground"},
   {colorId:"clay-brown",ratio:.16,role:"structure"},
   {colorId:"moss-green",ratio:.07,role:"accent"},
   {colorId:"burnt-orange",ratio:.05,role:"accent"}
  ],
  mediums:["leather-tooling","emboss"],notes:["Reduce color count further for physical tooling/embossing."]
 },
 "cosmic-spirit":{
  id:"cosmic-spirit",name:"Cosmic Spirit",
  colors:[
   {colorId:"deep-cosmic-blue",ratio:.78,role:"ground"},
   {colorId:"starlight-white",ratio:.16,role:"structure"},
   {colorId:"antique-gold",ratio:.03,role:"highlight"},
   {colorId:"blue-slate",ratio:.03,role:"accent"}
  ],
  mediums:["embroidery","print"],notes:["High contrast; metallic is a minor punctuation, not a field."]
 }
};

export function validatePalette(p:AscendPalette){
 const ratio=p.colors.reduce((s,c)=>s+c.ratio,0);
 const accents=p.colors.filter(c=>c.role==="accent").length;
 const metallic=p.colors.filter(c=>ASCEND_COLORS[c.colorId]?.metallic).reduce((s,c)=>s+c.ratio,0);
 const errors:string[]=[];
 if(Math.abs(ratio-1)>.001)errors.push("ratios-must-sum-to-1");
 if(accents>2)errors.push("too-many-accents");
 if(metallic>.08)errors.push("metallic-overuse");
 for(const c of p.colors)if(!ASCEND_COLORS[c.colorId])errors.push(`unknown-color:${c.colorId}`);
 return errors;
}
