import type {ImageObservation} from "./image-corpus";

/**
 * Cross-cultural structural reference corpus.
 * IMPORTANT:
 * - Train composition/material/grammar, not motif copying.
 * - Indigenous records remain Nation/People-specific; never flatten into "Native style".
 * - Museum image reuse restrictions still apply. Store metadata/source references, not copied assets.
 */
export const CROSS_CULTURAL_REFERENCE_CORPUS:ImageObservation[]=[
 {
  id:"nmai-dine-third-phase-textile-1880-1890",
  sourceRef:"https://americanindian.si.edu/collections-search/object/NMAI_243800",
  class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"composition",
  features:{scaleLevels:5,dominantDirection:["horizontal","field"],operations:["repeat","alternate","layer","interrupt"],zones:["blanket-field"],materials:["wool"],techniques:["woven"]},
  notes:["Diné (Navajo), 1880-1890. Use for large-field proportion, stepped scale changes, band hierarchy and woven rhythm only.","Do not extract or commercialize community-specific motifs as generic Native ornament."],
  provenance:"National Museum of the American Indian, catalog 22/9190; Diné (Navajo), Arizona/New Mexico, 1880-1890."
 },
 {
  id:"nmai-dine-blanket-c1865",
  sourceRef:"https://americanindian.si.edu/collections-search/object/NMAI_270871",
  class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"composition",
  features:{scaleLevels:4,dominantDirection:["horizontal","field"],operations:["repeat","alternate","interrupt"],zones:["blanket-field"],materials:["wool"],techniques:["woven"]},
  notes:["Diné blanket, c.1865. Structural reference for broad fields, disciplined spacing and repeated horizontal organization.","No direct motif copying."],
  provenance:"National Museum of the American Indian, catalog 25/5005; Diné (Navajo), Arizona/New Mexico, c.1865."
 },
 {
  id:"nmai-sicangu-lakota-dress-c1890",
  sourceRef:"https://americanindian.si.edu/collections-search/object/NMAI_173730",
  class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"composition",
  features:{scaleLevels:5,dominantDirection:["horizontal","field"],operations:["repeat","layer","interrupt"],zones:["yoke","body","edge"],materials:["hide","glass-beads"],techniques:["sewn","lazy-lane-stitch-beadwork"]},
  notes:["Sicangu Lakota (Brulé Sioux) girl's dress, c.1890. Useful for yoke/body hierarchy, bead-density contrast and material boundary logic.","Keep People-specific provenance; never use as pan-Indigenous style source."],
  provenance:"National Museum of the American Indian, catalog 16/2323; Sicangu Lakota (Brulé Sioux), South Dakota, c.1890."
 },
 {
  id:"nmai-lakota-yoke-1850-1880",
  sourceRef:"https://americanindian.si.edu/collections-search/object/NMAI_11935",
  class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"composition",
  features:{scaleLevels:4,dominantDirection:["horizontal","field"],operations:["repeat","layer","alternate"],zones:["yoke"],materials:["hide","glass-beads"],techniques:["lazy-lane-stitch-beadwork"]},
  notes:["Probably Lakota dress yoke, 1850-1880. Structural reference for a dense decorated territory carried by a quiet garment field.","Attribution is museum-qualified as probably Lakota; preserve that uncertainty."],
  provenance:"National Museum of the American Indian, catalog 1/1109; probably Lakota (Teton/Western Sioux), North/South Dakota, 1850-1880."
 },
 {
  id:"cowboy-working-gear-gallery",
  sourceRef:"https://nationalcowboymuseum.org/collections/galleries/american-cowboy/",
  class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"material",
  features:{scaleLevels:4,dominantDirection:["horizontal","vertical","wrap"],operations:["repeat","border","interrupt","layer"],zones:["saddle","chaps","rope","hardware"],materials:["leather","rawhide","metal"],techniques:["saddlery","braiding","tooling"]},
  notes:["Working-cowboy equipment corpus with documented regional evolution of saddles, bits and spurs.","Extract construction logic, edge treatment, load-bearing zones, tooling density and material transitions—not cowboy clip-art."],
  provenance:"National Cowboy & Western Heritage Museum, Jack and Phoebe Cooke American Cowboy Gallery."
 },
 {
  id:"cowboy-saddlery-catalog-corpus",
  sourceRef:"https://nationalcowboymuseum.org/explore/saddlery-cowboy-gear-catalogs-ephemera/",
  class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"material",
  features:{scaleLevels:4,dominantDirection:["horizontal","vertical","wrap"],operations:["repeat","border","layer"],zones:["saddle","belt","strap","hardware"],materials:["leather","metal","rawhide"],techniques:["saddlery","tooling","braiding"]},
  notes:["Archive of 375+ saddlery/cowboy-gear catalog and ephemera items from 100+ makers/distributors.","Useful for period/regional construction vocabularies and how ornament follows functional leather zones."],
  provenance:"National Cowboy & Western Heritage Museum, Saddlery & Cowboy Gear Catalogs & Ephemera collection."
 },
 {
  id:"english-coverlet-1725-1750",
  sourceRef:"https://www.metmuseum.org/art/collection/search/854577",
  class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"composition",
  features:{symmetry:.62,density:.72,voidRatio:.3,scaleLevels:6,dominantDirection:["field"],operations:["repeat","branch","mirror","layer","interrupt"],zones:["textile-field","corners","ground"],materials:["silk"],techniques:["embroidery"]},
  notes:["English embroidered coverlet, c.1725-1750. Strong reference for subtle symmetry, naturalistic branching, corner hierarchy and small repeat over a field.","Use compositional intelligence; do not copy floral forms."],
  provenance:"The Metropolitan Museum of Art, English coverlet, ca.1725-50, silk embroidered with silk."
 },
 {
  id:"english-tudor-stuart-embroidery-grammar",
  sourceRef:"https://www.metmuseum.org/essays/english-embroidery-of-the-late-tudor-and-stuart-eras",
  class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"composition",
  features:{scaleLevels:6,dominantDirection:["field","vertical","horizontal"],operations:["branch","layer","repeat","interrupt"],zones:["garment","bag","cabinet","furnishing"],materials:["silk","metal-thread","linen"],techniques:["embroidery","raised-work","couching","detached-buttonhole"]},
  notes:["Institutional survey of late Tudor/Stuart English embroidery; documents flora/fauna, narrative fields, pattern-book transfer and raised-work dimensionality.","Useful for dimensional hierarchy, narrative field construction and material relief."],
  provenance:"The Metropolitan Museum of Art, Heilbrunn Timeline of Art History, English Embroidery of the Late Tudor and Stuart Eras."
 },
 {
  id:"english-raised-work-material-grammar",
  sourceRef:"https://www.metmuseum.org/essays/the-materials-and-techniques-of-english-embroidery-of-the-late-tudor-and-stuart-eras",
  class:"real-historical",evidenceTier:"A",verifiedReal:true,trainingUse:"material",
  features:{scaleLevels:6,dominantDirection:["field"],operations:["layer","branch","interrupt"],zones:["surface","detached-detail","raised-field"],materials:["silk","linen","wool","wire","paper"],techniques:["raised-work","padding","detached-needle-lace","couching"]},
  notes:["Structural reference for relief, padding, detached elements and multi-material surface depth.","Translate into ASCEND depth/relief logic rather than reproducing period motifs."],
  provenance:"The Metropolitan Museum of Art, materials and techniques of late Tudor/Stuart English embroidery."
 }
];
