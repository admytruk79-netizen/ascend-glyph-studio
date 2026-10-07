/**
 * Structure priors per tradition, used until the corpus style profiles are available (or when a profile
 * is provisional). Sources: Nykorak, Herus & Kutsyr 2022 (sash composition), the first master-corpus
 * frieze statistics, and docs/BLEND-ENGINE.md. Replaced by measured profiles as the corpus grows.
 */
import type { FriezeGroup } from "./symmetry.js";

export interface Prior { frieze: Partial<Record<FriezeGroup, number>>; aspect: number; event: number; palette: string[] }

export const PRIORS: Record<string, Prior> = {
  // static, measured, symmetric about vertical and short horizontal axes; close-hue red/black
  Ukrainian: { frieze: { p2mm: 0.45, p1m1: 0.35, p2mg: 0.1, p1: 0.1 }, aspect: 1, event: 0.8, palette: ["#9b1c1c", "#1a1a1a"] },
  Belarusian: { frieze: { p1m1: 0.5, p2mm: 0.4, p1: 0.1 }, aspect: 1, event: 0.9, palette: ["#b01e23", "#b01e23"] },
  // dynamic: diagonal axes, S-motifs, rotation without mirror; dark on light
  Lithuanian: { frieze: { p2: 0.35, p2mg: 0.25, p11g: 0.2, p1: 0.2 }, aspect: 0.8, event: 0.4, palette: ["#2b2f6b", "#7a1f2b"] },
  "English (16th–19th c.)": { frieze: { p1: 0.4, p1m1: 0.4, p11m: 0.2 }, aspect: 1.4, event: 0.3, palette: ["#2f5233", "#7a3b2e"] },
  // boot stitching and saddle carving: mirrored pairs across the shaft, parallel rows
  "Western / cowboy material culture": { frieze: { p1m1: 0.5, p2mm: 0.3, p1: 0.2 }, aspect: 1.2, event: 0.6, palette: ["#6b3e1f", "#1d2a4d"] },
  // structure only: symmetry statistics, never motifs or palette
  "Native American (structure only)": { frieze: { p2mg: 0.35, p2mm: 0.35, p1m1: 0.2, p2: 0.1 }, aspect: 0.9, event: 0.5, palette: [] },
};
