/**
 * Sew-out calibration strip (docs/EMBROIDERY-PRODUCTION-ENGINE.md §9). One file stitched on the target
 * fabric, stabilizer and thread; measuring it turns a starting recipe into a validated one.
 *
 * Rows, top to bottom (all labelled in the run sheet, left to right):
 *  A. satin columns 0.8, 1, 1.5, 2, 3, 4, 6, 8 mm wide, 20 mm long — pull-in and the narrowest clean satin
 *  B. fill squares 15 mm at row spacing 0.35 … 0.50 mm — density, puckering, coverage
 *  C. running / triple-run lines at 1.5, 2, 2.5, 3, 4 mm stitch length — smallest clean stitch, line weight
 *  D. 50 mm reference lines along X and Y — take-up and shrinkage after wash
 *  E. secure-code channel: satin patches at 0°, 45°, 90°, 135° — sheen contrast under a phone light
 *  F. gap test: pairs of 2 mm satins at gaps 0.5, 0.8, 1.0, 1.5 mm — the minimum gap that stays open
 */
import type { DesignObject } from "./plan.js";
import type { Pt } from "./geometry.js";

export interface CalibrationItem { id: string; row: string; parameter: string; value: number; unit: string; measure: string }

export function calibrationStrip(colors = { a: "#1d2a4d", b: "#8b1a1a" }): { objects: DesignObject[]; items: CalibrationItem[] } {
  const objects: DesignObject[] = [];
  const items: CalibrationItem[] = [];
  const item = (i: CalibrationItem) => items.push(i);
  let y = 0;

  // A. satin widths
  [0.8, 1, 1.5, 2, 3, 4, 6, 8].forEach((w, i) => {
    const x = i * 14;
    const id = `A${i + 1}`;
    objects.push({ kind: "satin", id, color: colors.a, path: [{ x: x + 4, y }, { x: x + 4, y: y + 20 }], width: w });
    item({ id, row: "A", parameter: "satin width", value: w, unit: "mm", measure: "measured width (pull-in = design − measured), clean edges yes/no" });
  });
  y += 30;

  // B. fill densities
  [0.35, 0.38, 0.4, 0.42, 0.45, 0.5].forEach((rs, i) => {
    const x = i * 19;
    const id = `B${i + 1}`;
    const sq: Pt[] = [{ x, y }, { x: x + 15, y }, { x: x + 15, y: y + 15 }, { x, y: y + 15 }];
    objects.push({ kind: "fill", id, color: colors.b, polygon: sq, angle: 45, rowSpacing: rs });
    item({ id, row: "B", parameter: "fill row spacing", value: rs, unit: "mm", measure: "fabric showing through yes/no, puckering 0–3, stiffness 0–3, size after unhooping" });
  });
  y += 25;

  // C. stitch lengths (single and triple run)
  [1.5, 2, 2.5, 3, 4].forEach((len, i) => {
    const x = i * 22;
    objects.push({ kind: "run", id: `C${i + 1}`, color: colors.a, path: [{ x, y }, { x: x + 18, y: y + 3 }, { x, y: y + 6 }], length: len });
    objects.push({ kind: "run", id: `C${i + 1}t`, color: colors.a, path: [{ x, y: y + 10 }, { x: x + 18, y: y + 13 }, { x, y: y + 16 }], length: len, triple: true });
    item({ id: `C${i + 1}`, row: "C", parameter: "run stitch length (single / triple below)", value: len, unit: "mm", measure: "stitches lie flat on curves yes/no, line reads at arm's length yes/no" });
  });
  y += 26;

  // D. reference lines for take-up and shrinkage
  objects.push({ kind: "satin", id: "D-x", color: colors.b, path: [{ x: 0, y }, { x: 50, y }], width: 1.2 });
  objects.push({ kind: "satin", id: "D-y", color: colors.b, path: [{ x: 60, y }, { x: 60, y: y + 50 }], width: 1.2 });
  item({ id: "D-x", row: "D", parameter: "reference length along band (X)", value: 50, unit: "mm", measure: "length after unhooping and after the specified wash → takeup / shrinkage X" });
  item({ id: "D-y", row: "D", parameter: "reference length across band (Y)", value: 50, unit: "mm", measure: "length after unhooping and after wash → shrinkage Y" });

  // E. stitch-angle channel: 12 mm satin patches as filled squares at four angles
  [0, 45, 90, 135].forEach((a, i) => {
    const x = 75 + i * 16;
    const id = `E${i + 1}`;
    objects.push({ kind: "fill", id, color: colors.a, polygon: [{ x, y }, { x: x + 12, y }, { x: x + 12, y: y + 12 }, { x, y: y + 12 }], angle: a, rowSpacing: 0.4 });
    item({ id, row: "E", parameter: "stitch angle (secure-code sheen channel)", value: a, unit: "°", measure: "phone photo under flash at 3 sweep positions; mean brightness per patch" });
  });

  // F. gap test
  [0.5, 0.8, 1.0, 1.5].forEach((g, i) => {
    const x = 75 + i * 16, yy = y + 20;
    objects.push({ kind: "satin", id: `F${i + 1}a`, color: colors.b, path: [{ x: x + 2, y: yy }, { x: x + 2, y: yy + 15 }], width: 2 });
    objects.push({ kind: "satin", id: `F${i + 1}b`, color: colors.b, path: [{ x: x + 4 + g, y: yy }, { x: x + 4 + g, y: yy + 15 }], width: 2 });
    item({ id: `F${i + 1}`, row: "F", parameter: "gap between columns", value: g, unit: "mm", measure: "gap stays open after stitching yes/no" });
  });

  return { objects, items };
}
