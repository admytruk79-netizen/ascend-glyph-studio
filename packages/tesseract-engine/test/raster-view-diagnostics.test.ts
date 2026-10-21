import {describe,it,expect,vi} from "vitest";
import {compareRasterViews,gatingRasterSvg,gatingRasterView} from "../src/raster-view-diagnostics";

const verdict={coverage:.08,clutter:.01,emptyColumns:.05,balance:.95,quality:.9,survive:true,flags:[]};

describe("paired raster-view diagnostics",()=>{
 it("gates sleeve embroidery on stitch IR and evaluates concept only as alternate",async()=>{
  const p={svg:"<svg id='stitches'/>",conceptSvg:"<svg id='concept'/>"};
  const critic=vi.fn(async()=>verdict);
  expect(gatingRasterView("sleeve",p)).toBe("canonical-stitch-ir");
  expect(gatingRasterSvg("sleeve",p)).toBe(p.svg);
  const result=await compareRasterViews("sleeve",p,critic);
  expect(critic).toHaveBeenCalledExactlyOnceWith(p.conceptSvg);
  expect(result).toMatchObject({gatingView:"canonical-stitch-ir",alternateView:"concept-preview",status:"ok",alternateRaster:verdict});
 });
 it("gates field artwork on concept and compares stitch view",async()=>{
  const p={svg:"<svg id='stitches'/>",conceptSvg:"<svg id='concept'/>"};
  const critic=vi.fn(async()=>verdict);
  expect(gatingRasterSvg("field",p)).toBe(p.conceptSvg);
  expect((await compareRasterViews("field",p,critic)).alternateView).toBe("canonical-stitch-ir");
  expect(critic).toHaveBeenCalledWith(p.svg);
 });
 it("labels field fallback accurately when concept is absent",async()=>{
  const p={svg:"<svg/>"};
  const critic=vi.fn(async()=>verdict);
  expect(gatingRasterView("field",p)).toBe("canonical-stitch-ir");
  expect(await compareRasterViews("field",p,critic)).toMatchObject({status:"missing",alternateView:"concept-preview"});
  expect(critic).not.toHaveBeenCalled();
 });
 it("does not re-render identical views",async()=>{
  const p={svg:"<svg/>",conceptSvg:"<svg/>"};
  const critic=vi.fn(async()=>verdict);
  expect((await compareRasterViews("sleeve",p,critic)).status).toBe("identical");
  expect(critic).not.toHaveBeenCalled();
 });
 it("records alternate rendering failure without claiming it passed",async()=>{
  const p={svg:"<svg id='stitches'/>",conceptSvg:"<svg id='concept'/>"};
  const result=await compareRasterViews("sleeve",p,async()=>{throw Error("render unavailable")});
  expect(result).toMatchObject({status:"error",error:"render unavailable"});
  expect(result.alternateRaster).toBeUndefined();
 });
 it("rejects invalid alternate metrics and fails closed on missing primary SVG",async()=>{
  const p={svg:"<svg id='stitches'/>",conceptSvg:"<svg id='concept'/>"};
  const result=await compareRasterViews("sleeve",p,async()=>({...verdict,quality:NaN}));
  expect(result.status).toBe("error");
  expect(()=>gatingRasterSvg("sleeve",{svg:""})).toThrow("Missing gating raster SVG");
 });
});
