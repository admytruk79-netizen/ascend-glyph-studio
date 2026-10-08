/** CLIP prompts and region labels for the training run (no model imports, so tests can load it). */

export const CLIP_MODEL = "Xenova/clip-vit-base-patch32"; // must match scripts/score/clip.mts MODEL

export const ORNAMENT = [
  "a close-up photo of embroidered folk ornament", "an embroidered textile with a pattern", "a woven sash or towel with geometric ornament",
  "an ornament plate from a pattern book", "a tooled leather boot or saddle with a carved pattern", "a carved or painted folk ornament",
];
export const NOT_ORNAMENT = ["a page of printed text", "a photograph of a person or a group of people", "a portrait of a person wearing folk costume", "a landscape or a building", "a map or a diagram", "a blank or damaged page"];
export const MOTIF_TYPES: Record<string, string> = {
  floral: "a floral ornament with flowers, leaves and branches", animals: "an ornament with birds, horses or other animals",
  tree: "a tree of life ornament", cross: "an ornament made of crosses", geometric: "a geometric ornament of rhombs, stars and zigzags",
  amorphous: "a free-flowing curvilinear ornament without clear motifs", figures: "an ornament with human figures",
};
export const REGIONS: [RegExp, string][] = [
  // Ukrainian, Russian and Latin spellings of regions, their towns and oblasts (catalogues use all three)
  [/hutsul|гуцул|kosiv|косів|косов|verkhovyn|верховин|kolomy|коломи/i, "Hutsul"],
  [/poltav|полтав|reshetyliv|решетилів|решетилов|opishn|опішн|опошн|myrhorod|миргород|lubny|лубн/i, "Poltava"],
  [/podil|поділ|подол|vinnyts|вінниц|винниц|khmelnyt|хмельниц|kamian|кам'ян|каменец/i, "Podillia"],
  [/bukovyn|буковин|chernivts|чернівц|черновц/i, "Bukovyna"], [/kyiv|kiev|київ|киев|bila tserkv|біла церкв|cherkas|черкас/i, "Kyiv"],
  [/chernih|черніг|черниг|nizhyn|ніжин|нежин/i, "Chernihiv"],
  [/volyn|волин|волын|polis|поліс|полес|rivne|рівн|ровн|zhytomyr|житомир/i, "Volyn–Polissia"], [/boyk|бойк/i, "Boyko"], [/lemk|лемк/i, "Lemko"], [/pokut|покут/i, "Pokuttia"],
  [/zakarpat|закарпат|uzhhorod|ужгород|transcarpath/i, "Transcarpathia"], [/slobo|слобож|kharkiv|харків|харьк|sumy|суми|сумск/i, "Slobozhanshchyna"],
  [/lviv|львів|львов|galic|галич|ternopil|тернопіл|тернопол|ivano-frank|івано-франк|ивано-франк/i, "Galicia"],
  [/dnipr|дніпр|днепр|zaporiz|запоріж|запорож|kherson|херсон|odes|одес/i, "South"],
];
export function regionOf(r: { region?: string; title?: string; culture?: string }): string | undefined {
  const t = `${r.region ?? ""} ${r.title ?? ""} ${r.culture ?? ""}`;
  return REGIONS.find(([re]) => re.test(t))?.[1];
}

