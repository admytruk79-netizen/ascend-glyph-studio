/**
 * Metadata-stage acceptance gates for research-corpus candidates.
 *
 * These gates run before any image is downloaded or analyzed. A record that
 * passes is a *metadata-accepted candidate*; it only becomes an accepted,
 * analyzed instance after the image-analysis stage succeeds.
 */

export type RightsStatus = "open" | "review" | "unknown";
export type CulturalAccess = "open" | "review";

export type Candidate = {
  id: string;
  institution: string;
  source: string;
  query: string;
  tradition?: string;
  title?: string;
  creator?: string;
  date?: string;
  region?: string;
  culture?: string;
  material?: string;
  technique?: string;
  objectType?: string;
  objectURL?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  rights?: string;
  rightsStatus: RightsStatus;
  accession?: string;
  reliability: number;
  description?: string;
};

export type GateResult =
  | { accepted: true; culturalAccess: CulturalAccess; relevance: string[] }
  | { accepted: false; reason: RejectReason; culturalAccess: CulturalAccess };

export type RejectReason =
  | "no-image"
  | "image-too-small"
  | "missing-provenance"
  | "rights-unresolved"
  | "cultural-review"
  | "not-structurally-relevant"
  | "duplicate";

// Material/technique vocabulary that indicates an object carries pattern structure.
const RELEVANCE: Record<string, RegExp> = {
  textile: /\b(textile|fabric|cloth|embroider\w*|weav\w*|woven|tapestr\w*|brocade|damask|lace|needlework|sampler|quilt\w*|appliqu\w*|kilim|rug|carpet|ikat|batik|jacquard|velvet|silk|linen|cotton|wool|rushnyk\w*|vyshyvank\w*|shawl|scarf|sash|costume|garment|dress|shirt|coat|tunic|robe|apron|towel)\b/i,
  ornament: /\b(ornament\w*|pattern\w*|motif|decorat\w*|border|frieze|interlace|arabesque|scroll\w*|rosette|geometric|lattice|guilloche|meander|knot\w*)\b/i,
  ceramic: /\b(ceramic|pottery|porcelain|earthenware|stoneware|faience|maiolica|tile|tiles|glaze\w*)\b/i,
  metal: /\b(metalwork|silver|gold|bronze|brass|iron|copper|enamel\w*|filigree|engrav\w*|chas\w*|repouss\w*|damascen\w*)\b/i,
  leather: /\b(leather\w*|saddle\w*|tooled|tack|bridle|holster|belt|boot\w*)\b/i,
  wood: /\b(carv\w*|inlay|marquetry|intarsia|woodwork)\b/i,
  print: /\b(woodblock|block.print\w*|pattern book|ornament print|design for|wallpaper)\b/i,
  bead: /\b(bead\w*|quillwork)\b/i,
};

// Nation-specific Indigenous North American provenance always goes to human review:
// provenance, community specificity, access restrictions and commercial-use risk
// must be recorded before any structural learning.
const INDIGENOUS_NA = /\b(native american|american indian|first nations?|indigenous|inuit|m[eé]tis|lakota|dakota|nakota|sioux|din[eé]|navajo|hopi|zuni|pueblo|apache|cheyenne|arapaho|crow|blackfoot|kiowa|comanche|osage|pawnee|shoshone|ute|paiute|haida|tlingit|tsimshian|kwakwaka.wakw|kwakiutl|nuu.chah.nulth|salish|ojibw?e|anishinaabe|chippewa|cree|haudenosaunee|iroquois|mohawk|seneca|onondaga|oneida|cayuga|tuscarora|cherokee|choctaw|chickasaw|muscogee|creek|seminole|potawatomi|menominee|ho.chunk|winnebago|mi.kmaq|abenaki|wampanoag|tlicho|dene|yup.ik|inupiaq|aleut|unangan|plains|great lakes|northwest coast|eastern woodlands|southwest)\b/i;

// Sacred, ceremonial or funerary context goes to human review regardless of culture.
const RESTRICTED_CONTEXT = /\b(sacred|ceremonial|ceremony|ritual|medicine bundle|medicine bag|funerary|burial|grave|shrine|altar|reliquary|shaman\w*|spirit mask|kachina|katsina|wampum|sun ?dance|ghost dance|potlatch|totem)\b/i;

const MIN_IMAGE_EDGE = 600;

function text(c: Candidate): string {
  return [c.title, c.material, c.technique, c.objectType, c.description].filter(Boolean).join(" ");
}

function provenanceText(c: Candidate): string {
  return [c.culture, c.region, c.tradition, c.title, c.description].filter(Boolean).join(" ");
}

export function relevanceOf(c: Candidate): string[] {
  const t = text(c);
  return Object.entries(RELEVANCE).filter(([, re]) => re.test(t)).map(([k]) => k);
}

export function culturalAccessOf(c: Candidate): CulturalAccess {
  if (INDIGENOUS_NA.test(provenanceText(c))) return "review";
  if (RESTRICTED_CONTEXT.test(text(c))) return "review";
  return "open";
}

export function gate(c: Candidate): GateResult {
  const culturalAccess = culturalAccessOf(c);
  if (!c.image) return { accepted: false, reason: "no-image", culturalAccess };
  if (c.imageWidth && c.imageHeight && Math.max(c.imageWidth, c.imageHeight) < MIN_IMAGE_EDGE)
    return { accepted: false, reason: "image-too-small", culturalAccess };
  if (!c.institution || !c.objectURL || !(c.accession || c.id))
    return { accepted: false, reason: "missing-provenance", culturalAccess };
  if (c.rightsStatus !== "open") return { accepted: false, reason: "rights-unresolved", culturalAccess };
  if (culturalAccess === "review") return { accepted: false, reason: "cultural-review", culturalAccess };
  const relevance = relevanceOf(c);
  if (!relevance.length) return { accepted: false, reason: "not-structurally-relevant", culturalAccess };
  return { accepted: true, culturalAccess, relevance };
}

/** Key used to drop the same object reached through different queries or image URLs. */
export function dedupeKeys(c: Candidate): string[] {
  const keys = [c.id];
  if (c.image) keys.push("img:" + c.image.replace(/[?#].*$/, "").toLowerCase());
  if (c.accession) keys.push(`acc:${c.institution}:${c.accession.trim().toLowerCase()}`);
  return keys;
}
