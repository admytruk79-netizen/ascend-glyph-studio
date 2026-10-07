import type {PatternPiece,Point} from "./pattern";
import type {PieceProjectionPlan,SeamTransfer} from "./pattern-projector";

const pts=(p:Point[])=>p.map(x=>`${x.x},${x.y}`).join(" ");
const xml=(value:string)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

export function productionPieceSvg(piece:PatternPiece,plan:PieceProjectionPlan,transfers:SeamTransfer[]=[]):string{
 const minX=Math.min(...piece.outline.map(p=>p.x)),maxX=Math.max(...piece.outline.map(p=>p.x));
 const minY=Math.min(...piece.outline.map(p=>p.y)),maxY=Math.max(...piece.outline.map(p=>p.y));
 const w=maxX-minX,h=maxY-minY;
 const ng=piece.noGoZones.map(z=>`<polygon points="${pts(z.polygon)}" fill="none" stroke="currentColor" stroke-dasharray="4 3" data-no-go="${xml(z.id)}"><title>${xml(z.reason)}</title></polygon>`).join("");
 const maskNoGo=piece.noGoZones.map(z=>`<polygon points="${pts(z.polygon)}" fill="black" stroke="black" stroke-width="${z.clearanceMm*2}" stroke-linejoin="round" data-no-go-mask="${xml(z.id)}"/>`).join("");
 const seams=transfers.filter(t=>t.fromPiece===piece.id||t.toPiece===piece.id).map((t,i)=>{
  const from=t.fromPiece===piece.id,path=from?t.fromEdgePath:t.toEdgePath,anchors=from?t.fromRegistrationAnchors:t.toRegistrationAnchors;
  const p=from?t.fromPoint:t.toPoint;
  const edge=path?.length?`<polyline points="${pts(path)}" fill="none" stroke="currentColor" stroke-dasharray="2 2" data-seam-edge="${i}"/>`:"";
  const marks=anchors?.length?anchors.map((a,j)=>`<circle cx="${a.x}" cy="${a.y}" r="3" fill="none" stroke="currentColor" data-registration="${i}:${j}"/>`).join(""):`<circle cx="${p.x}" cy="${p.y}" r="3" fill="none" stroke="currentColor" data-registration="${i}"/>`;
  return edge+marks;
 }).join("");
 const u=plan.usableBounds;
 const clipId=`piece-clip-${piece.id.replace(/[^a-z0-9_-]/gi,"_")}`,maskId=`design-mask-${piece.id.replace(/[^a-z0-9_-]/gi,"_")}`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="${minX} ${minY} ${w} ${h}" data-piece="${xml(piece.id)}">
 <defs>
  <clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><polygon points="${pts(piece.outline)}"/></clipPath>
  <mask id="${maskId}" maskUnits="userSpaceOnUse" x="${minX}" y="${minY}" width="${w}" height="${h}">
   <rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="black"/>
   <rect x="${u.x}" y="${u.y}" width="${u.width}" height="${u.height}" fill="white"/>
   ${maskNoGo}
  </mask>
 </defs>
 <g id="cut-line"><polygon points="${pts(piece.outline)}" fill="none" stroke="currentColor"/></g>
 <g id="designable-area"><rect x="${u.x}" y="${u.y}" width="${u.width}" height="${u.height}" fill="none" stroke="currentColor" stroke-dasharray="8 4"/></g>
 <g id="no-go-zones">${ng}</g><g id="registration">${seams}</g>
 <g id="ascend-artwork" clip-path="url(#${clipId})" mask="url(#${maskId})" data-construction-clipped="true" data-placeholder="true"></g>
 </svg>`;
}
