import {describe,it,expect} from "vitest";
import {ASCEND_PALETTES,validatePalette} from "../src/color-system";

describe("ASCEND color system",()=>{
 it("keeps all canonical palettes internally valid",()=>{
  for(const p of Object.values(ASCEND_PALETTES))expect(validatePalette(p)).toEqual([]);
 });
 it("locks the Underdog hierarchy",()=>{
  const p=ASCEND_PALETTES["underdog-heritage"]!;
  expect(p.colors[0]?.colorId).toBe("midnight-navy");
  expect(p.colors[0]?.ratio).toBe(.75);
  expect(p.colors.filter(x=>x.role==="accent")).toHaveLength(2);
 });
});
