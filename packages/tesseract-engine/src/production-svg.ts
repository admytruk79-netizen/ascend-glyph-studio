import type {PatternPiece,Point} from "./pattern";
import type {PieceProjectionPlan,SeamTransfer} from "./pattern-projector";

const pts=(p:Point[])=>p.map(x=>`${x.x},${x.y}`).join(" ");

export function productionPieceSvg(piece:PatternPiece,plan:PieceProjectionPlan,transfers:SeamTransfer[]=[]):string{
 const all=piece.outline.flatMap(p=>[p.x,p.y]),w=Math.max(...piece.outline.map(p=>p.x))-Math.min(...piece.outline.map(p=>p.x)),h=Math.max(...piece.outline.map(p=>p.y))-Math.min(...piece.outline.map(p=>p.y));
 const ng=piece.noGoZones.map(z=>`<polygon points="${pts(z.polygon)}" fill="none" stroke="currentColor" stroke-dasharray="4 3" data-no-go="${z.id}"><title>${z.reason}</title></polygon>`).join("");
 const seams=transfers.filter(t=>t.fromPiece===piece.id||t.toPiece===piece.id).map((t,i)=>{const p=t.fromPiece===piece.id?t.fromPoint:t.toPoint;return `<circle cx="${p.x}" cy="${p.y}" r="3" fill="none" stroke="currentColor" data-registration="${i}"/>`}).join("");
 const u=plan.usableBounds;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" data-piece="${piece.id}">
 <g id="cut-line"><polygon points="${pts(piece.outline)}" fill="none" stroke="currentColor"/></g>
 <g id="designable-area"><rect x="${u.x}" y="${u.y}" width="${u.width}" height="${u.height}" fill="none" stroke="currentColor" stroke-dasharray="8 4"/></g>
 <g id="no-go-zones">${ng}</g><g id="registration">${seams}</g>
 <g id="ascend-artwork" data-placeholder="true"></g>
 </svg>`;
}
