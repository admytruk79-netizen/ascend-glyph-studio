/** Starting material recipes from docs/EMBROIDERY-PRODUCTION-ENGINE.md §4. Unvalidated until a sew-out stores measured values. */
export interface StitchRecipe {
  id: string;
  material: string;
  needle: string;
  stabilizer: string;
  topping?: string;
  speedSpm: number;
  fillRowSpacing: number;
  /** Densest allowed fill row spacing (mm); denser fills fail the gate. */
  minFillRowSpacing: number;
  satinSpacing: number;
  pullComp: number;
  minStitch: number;
  maxSatinWidth: number;
  minSatinWidth: number;
  minGap: number;
  /** Fill takeup along the band (fraction) and wash shrinkage per axis (0 when pre-washed). */
  takeup: number;
  shrinkageX: number;
  shrinkageY: number;
  validated: false | { sewOutId: string; date: string };
}

const base = { minStitch: 1.0, maxSatinWidth: 8, minSatinWidth: 1, minGap: 0.8, shrinkageX: 0, shrinkageY: 0, validated: false as const };

export const recipes: Record<string, StitchRecipe> = {
  "linen-180-prewashed": { ...base, id: "linen-180-prewashed", material: "Linen ~180 GSM, pre-washed", needle: "75/11 sharp", stabilizer: "medium cut-away or mesh", speedSpm: 700, fillRowSpacing: 0.43, minFillRowSpacing: 0.4, satinSpacing: 0.4, pullComp: 0.25, takeup: 0.015 },
  "cotton-shirting": { ...base, id: "cotton-shirting", material: "Cotton shirting", needle: "75/11 sharp", stabilizer: "tear-away or light cut-away", speedSpm: 800, fillRowSpacing: 0.42, minFillRowSpacing: 0.38, satinSpacing: 0.4, pullComp: 0.2, takeup: 0.01 },
  "knit-jersey": { ...base, id: "knit-jersey", material: "Knit / jersey", needle: "75/11 ballpoint", stabilizer: "cut-away (always)", speedSpm: 700, fillRowSpacing: 0.45, minFillRowSpacing: 0.42, satinSpacing: 0.42, pullComp: 0.4, takeup: 0.02 },
  "terry-towel": { ...base, id: "terry-towel", material: "Towel / terry", needle: "80/12", stabilizer: "tear-away", topping: "water-soluble", speedSpm: 700, fillRowSpacing: 0.4, minFillRowSpacing: 0.36, satinSpacing: 0.38, pullComp: 0.3, takeup: 0.015 },
  "leather-boot": { ...base, id: "leather-boot", material: "Leather boot shaft panel", needle: "leather/wedge 90/14", stabilizer: "tear-away or none; clamp, no hoop", speedSpm: 500, fillRowSpacing: 0.8, minFillRowSpacing: 0.7, satinSpacing: 0.6, pullComp: 0, minStitch: 2.5, takeup: 0 },
};
