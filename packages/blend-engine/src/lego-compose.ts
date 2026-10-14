/**
 * Build new bands from Lego pieces and a learned grammar (scripts/train/lego.ts grammarOf).
 *
 * One repeat unit is a hero piece with its companions (chosen from the pieces the corpus places next to it, at the
 * learned offset and relative size, mirrored when the corpus mirrors) and fillers between units. The unit repeats a
 * whole number of times so the band closes into a ring. With `explore` > 0 some companions are pieces the corpus
 * never paired with the hero: new combinations of known pieces, which is where new designs come from.
 */
import { Kit } from "./folk-rich.ts";
import { BRICKS, widthOf, type BrickId, type Roles } from "./lego.ts";

export type LegoGrammar = {
  images: number;
  bricks: Record<string, { share: number; perImage: number; extent: number; colors?: string[] }>;
  pairs: Record<string, { n: number; dx: number; dy: number; ratio: number }>;
  mirrorV: number;
};
export type BandInstance={id:string;brick:BrickId|null;role:'hero'|'companion'|'filler'|'frame'|'connections';objectIds:string[]};
export type BandPlan = { hero: BrickId; companions: BrickId[]; filler: BrickId | null; units: number; mirrored: boolean; novelPairs: string[] };

const isBrick = (id: string): id is BrickId => id in BRICKS;
function rng(seed: string) {
  let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function pick<T>(items: T[], weight: (t: T) => number, r: () => number): T | undefined {
  const ws = items.map(weight), total = ws.reduce((a, b) => a + b, 0); if (!total) return undefined;
  let x = r() * total; for (let i = 0; i < items.length; i++) { x -= ws[i]!; if (x <= 0) return items[i]; } return items[items.length - 1];
}

/** Choose the pieces for one band from the grammar. */
export function planBand(g: LegoGrammar, seed: string, explore = 0.3): Omit<BandPlan, "units"> {
  const r = rng(seed), known = Object.keys(g.bricks).filter(isBrick);
  const w = (b: BrickId) => (g.bricks[b]?.share ?? 0) * (1 + Math.pow(g.bricks[b]?.perImage ?? 0, 0.3));
  // the hero is a large piece (tree, rose, lily, horns, rhomb field…); companions only lead when the corpus has no hero
  const heroes = known.filter((b) => BRICKS[b].scale === "hero");
  const hero = pick(heroes.length ? heroes : known.filter((b) => BRICKS[b].scale !== "filler"), w, r) ?? "rose";
  const partners = Object.entries(g.pairs).filter(([k]) => k.startsWith(`${hero}|`)).map(([k, v]) => ({ b: k.split("|")[1]!, n: v.n }))
    .filter((p): p is { b: BrickId; n: number } => isBrick(p.b) && p.b !== hero && BRICKS[p.b].scale !== "filler");
  const companions: BrickId[] = [], novelPairs: string[] = [];
  const first = r() < explore || !partners.length
    ? pick(known.filter((b) => b !== hero && BRICKS[b].scale === "companion"), w, r)
    : pick(partners, (p) => p.n, r)?.b;
  if (first) { companions.push(first); if (!partners.some((p) => p.b === first)) novelPairs.push(`${hero}+${first}`); }
  const filler = pick(known.filter((b) => BRICKS[b].scale === "filler" && b !== "grapes"), w, r) ?? null;
  return { hero, companions, filler, mirrored: r() < Math.max(0.35, g.mirrorV), novelPairs };
}

/** Lay the plan out as a band `length` × `height` mm. */
export function composeBand(g: LegoGrammar, o: { seed: string; length?: number; height?: number; roles: Roles; explore?: number; connectHeroes?: boolean }): { kit: Kit; plan: BandPlan; instances:BandInstance[]; connections: {fromId:string;fromPoint:{x:number;y:number};toId:string;toPoint:{x:number;y:number}}[] } {
  const L = o.length ?? 250, H = o.height ?? 60, CY = H / 2, c = o.roles;
  const p = planBand(g, o.seed, o.explore);
  const k = new Kit();
  // frame: border lines and a row of small rhombs, as the corpus bands carry them
  for (const y of [1.8, H - 1.8]) k.satin("border", c.dark, [{ x: 2, y }, { x: L-2, y }], 1.2);
  for (const y of [4.9, H - 4.9]) for (let i = 0; i < Math.floor(L / 5); i++) k.rhomb(i % 2 ? c.main : c.dark, 2.5 + i * 5, y, 1.4, 1.4, "frame");
  const inner = H - 16, GAP = 3; let S = inner * 0.9;
  const comp = p.companions[0];
  const pair = comp ? g.pairs[`${p.hero}|${comp}`] : undefined;
  const companionRatio=Math.max(0.38,Math.min(0.62,pair?.ratio??0.5)),companionCount=comp?(p.mirrored?2:1):0;
  S=Math.min(S,(L-8-companionCount*GAP)/(widthOf(p.hero,1)+(comp?companionCount*widthOf(comp,companionRatio):0)));
  const Sc = comp ? S * Math.max(0.38, Math.min(0.62, pair?.ratio ?? 0.5)) : 0;
  const Sf = Math.min(12, inner * 0.3);
  // slots: [companion] hero [companion] side by side with GAP between, the filler in what is left at the unit edge
  const wH = widthOf(p.hero, S), wC = comp ? widthOf(comp, Sc) : 0, wF = p.filler ? widthOf(p.filler, Sf) : 0;
  const group = wH + (comp ? (p.mirrored ? 2 : 1) * (wC + GAP) : 0);
  const units = Math.max(1, Math.floor(L / (group + (p.filler ? wF + 2 * GAP : GAP)))), U = L / units;
  const filler = units>1 && p.filler && U - group >= wF + 2 * GAP ? p.filler : null;
  const lift = (dy: number | undefined, size: number) => Math.max(-(inner - size) / 2, Math.min((inner - size) / 2, (dy ?? 0) * S * 0.5));
  const heroObjects: string[][] = [];
  const instances:BandInstance[]=[{id:'frame',brick:null,role:'frame',objectIds:k.objs.map(o=>o.id)}];
  for (let u = 0; u < units; u++) {
    const left = u * U + (U - group) / 2;
    const hx = left + (comp && p.mirrored ? wC + GAP : 0) + wH / 2;
    const firstObject=k.objs.length;
    BRICKS[p.hero].draw(k, hx, CY, S, c);
    const heroIds=k.objs.slice(firstObject).map(o=>o.id);heroObjects.push(heroIds);
    instances.push({id:`unit-${u}-hero`,brick:p.hero,role:'hero',objectIds:heroIds});
    if (comp) {
      const off = wH / 2 + GAP + wC / 2, y = CY + lift(pair?.dy, Sc);
      const drawCompanion=(x:number,flip:1|-1,label:string)=>{const start=k.objs.length;BRICKS[comp].draw(k,x,y,Sc,c,undefined,flip);instances.push({id:`unit-${u}-companion-${label}`,brick:comp,role:'companion',objectIds:k.objs.slice(start).map(o=>o.id)});};
      if (p.mirrored) for (const side of [-1, 1] as const)drawCompanion(hx+side*off,(-side) as 1|-1,side<0?'left':'right');
      else drawCompanion(hx+off,1,'right');
    }
    if (filler && u<units-1){const start=k.objs.length;BRICKS[filler].draw(k,(u+1)*U,CY,Sf,c);instances.push({id:`unit-${u}-filler`,brick:filler,role:'filler',objectIds:k.objs.slice(start).map(o=>o.id)});}
  }
  k.resolveGaps();
  const connections:{fromId:string;fromPoint:{x:number;y:number};toId:string;toPoint:{x:number;y:number}}[]=[];
  if(o.connectHeroes){
    const roots=heroObjects.map(ids=>{
      const objects=k.objs.filter(o=>ids.includes(o.id));
      const stem=objects.find(o=>o.kind==='satin'&&/^(trunk|stalk|stem)-/.test(o.id));
      const candidate=stem??objects.filter(o=>o.kind==='fill').sort((a,b)=>{
        return Math.max(...b.polygon.map(p=>p.y))-Math.max(...a.polygon.map(p=>p.y));
      })[0];
      if(!candidate)throw new Error('connected-band:missing-hero-root');
      const points=candidate.kind==='fill'?candidate.polygon:candidate.path;
      return {id:candidate.id,point:points.reduce((a,b)=>a.y>b.y?a:b)};
    });
    const connectionStart=k.objs.length;
    const baseline=H-8.5,ports=roots.map(r=>({x:r.point.x,y:baseline}));
    const vine=ports.flatMap((p,i)=>i?[{x:(ports[i-1]!.x+p.x)/2,y:baseline-.3},p]:[p]);
    if(vine.length===1)vine.unshift({x:Math.max(2,vine[0]!.x-8),y:baseline});
    k.satin('connected-vine',c.leaf,vine,1.2);const vineId=k.objs.at(-1)!.id;
    roots.forEach((root,i)=>{
      k.satin('root-connection',c.leaf,[{...root.point},ports[i]!],1.2);const connector=k.objs.at(-1)!;
      connections.push({fromId:root.id,fromPoint:{...root.point},toId:connector.id,toPoint:{...root.point}},
        {fromId:connector.id,fromPoint:{...ports[i]!},toId:vineId,toPoint:{...ports[i]!}});
    });
    instances.push({id:'connections',brick:null,role:'connections',objectIds:k.objs.slice(connectionStart).map(o=>o.id)});
  }
  return { kit: k, plan: { ...p, filler, units }, instances, connections };
}

/**
 * Oleksandr's signature, written as a grammar: medallions lead, star-lilies and stars accompany them, snowflakes and
 * fans fill, mirrored. Blend it into a learned grammar to put his signature into designs built from the corpus.
 */
export const SIGNATURE_GRAMMAR: LegoGrammar = {
  images: 1,
  bricks: {
    medallion: { share: 1, perImage: 9, extent: 0.12 }, "star-lily": { share: 1, perImage: 4, extent: 0.08 },
    star5: { share: 1, perImage: 6, extent: 0.02 }, snowflake: { share: 1, perImage: 6, extent: 0.02 }, fan: { share: 0.8, perImage: 4, extent: 0.03 },
  },
  pairs: {
    "medallion|star-lily": { n: 6, dx: 1.1, dy: 0, ratio: 0.55 }, "medallion|star8": { n: 3, dx: 1.2, dy: 0, ratio: 0.45 },
    "star-lily|medallion": { n: 6, dx: -1.1, dy: 0, ratio: 1.8 },
  },
  mirrorV: 0.8,
};

/** Mix two grammars: `w` is the weight of `b` (0 = only a, 1 = only b). Shares and pair counts are blended. */
export function blendGrammars(a: LegoGrammar, b: LegoGrammar, w: number): LegoGrammar {
  const bricks: LegoGrammar["bricks"] = {}, pairs: LegoGrammar["pairs"] = {};
  for (const id of new Set([...Object.keys(a.bricks), ...Object.keys(b.bricks)])) {
    const x = a.bricks[id], y = b.bricks[id];
    bricks[id] = { share: (x?.share ?? 0) * (1 - w) + (y?.share ?? 0) * w, perImage: (x?.perImage ?? 0) * (1 - w) + (y?.perImage ?? 0) * w, extent: y?.extent ?? x?.extent ?? 0.05 };
  }
  const na = Math.max(1, ...Object.values(a.pairs).map((p) => p.n)), nb = Math.max(1, ...Object.values(b.pairs).map((p) => p.n));
  for (const key of new Set([...Object.keys(a.pairs), ...Object.keys(b.pairs)])) {
    const x = a.pairs[key], y = b.pairs[key], src = (w >= 0.5 ? y ?? x : x ?? y)!;
    pairs[key] = { ...src, n: ((x?.n ?? 0) / na) * (1 - w) * 100 + ((y?.n ?? 0) / nb) * w * 100 };
  }
  return { images: a.images + b.images, bricks, pairs, mirrorV: a.mirrorV * (1 - w) + b.mirrorV * w };
}
