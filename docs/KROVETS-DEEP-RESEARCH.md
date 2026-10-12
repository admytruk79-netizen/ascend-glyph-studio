# Krovets: motif construction and stitch treatment

Examined nine additional object records and their public title previews: six embroidered towels from Middle Dnieper, Chernihiv Polissia and Eastern Podillia, and three shirts from Hutsulshchyna, Pokuttia and Eastern Podillia. This is a purposeful small sample, not a representative survey of these regions or all 3,840 advertised objects. Previous study of three Poltava towels remains separate. Detailed subscriber photos were not accessed. Record/preview hashes, catalogue fields, visual hypotheses and restrictions are retained in data/research/motif-annotations/krovets-deep-research.json; images stay outside the repository.

## Object-specific findings

| Object | Documented attribution and technique | Visible construction; interpretation remains provisional |
| --- | --- | --- |
| [KYD324](https://krovets.ua/item/kro-606) | Middle Dnieper; plant ornament; rushnyk stitches | Tiered stem with paired branches, large rounded outlined terminals and tiny dot-like terminals. Side border has its own linked-unit repeat. |
| [KYD329](https://krovets.ua/item/kro-611) | Middle Dnieper; plant/tree-of-life ornament; rushnyk stitches and satin stitch | Axial stack, vessel-like forms, curled branches and differently sized flowers. Main field and small side repeat serve different roles. |
| [KYD332](https://krovets.ua/item/kro-614) | Chernihiv Polissia; plant/tree-of-life ornament; chain stitch | Compact end clusters beneath a large quiet field. Record explicitly identifies factory lace at the ends: a separate trim, not an embroidery repeat. |
| [KYD338](https://krovets.ua/item/kro-620) | Chernihiv Polissia; plant/tree-of-life ornament; chain stitch | A vessel-like base, branching stem, radial flower-like units and small terminals. Bird-like silhouettes and inscriptions have separate roles; no species or symbolic identification is established. |
| [KYD315](https://krovets.ua/item/kro-597) | Eastern Podillia; geometric ornament; oblique satin stitch, kachalochka and cross stitch | Angular branches, star-like units, stepped multicolour regions and rectangular framing. Two towel-end fragments are sewn together: their adjacency cannot establish original repeat grammar. |
| [KYD2001](https://krovets.ua/item/kro-2283) | Eastern Podillia; geometric ornament; kachalochka and shtapivka | Upright tree-like forms with angled coloured offshoots. Visual botanical resemblance does not change the record's geometric classification. |
| [KYD464](https://krovets.ua/item/kro-746) | Hutsulshchyna, Verbovets, Kosiv district; geometric ornament; several named stitches | Dense diagonal red/blue sleeve field, a distinct shoulder band and narrow neck/chest detail. The preview cannot establish individual stitch routes. |
| [KYD490](https://krovets.ua/item/kro-772) | Pokuttia, Hankivtsi, Sniatyn district; creator: Dovhaniuky family; geometric ornament, including openwork techniques | White-on-white angular/star-like sleeve units, visible openwork, small coloured cuff/collar accents. Openings, joins and gathers cannot be represented as coloured contour fills alone. |
| [KYD2835](https://krovets.ua/item/kro-3117) | Eastern Podillia, Kryzhopil district; geometric ornament, lyshtva and joining techniques | Dense upper sleeves transition to narrow falling ornament columns; the chest has a different diamond-like chain. A shared palette does not imply a shared arrangement rule. |

These findings describe individual objects. They do not establish exclusive regional rules, exact petal counts, botanical species, mathematical fractals, physical stitch density or machine settings.

## What the engine should learn from this

1. **Separate motif form from technique.** A flower-like or tree-like silhouette can have geometric construction. Catalogue ornament class, visual hypothesis, counted-grid structure and stitch technique need distinct fields. A generic floral tag cannot select a production fill.
2. **Describe branch roles, not just repeated tiles.** Track dominant axis, branch tiers, paired/unpaired branches, large terminals, small terminals and their attachment ports. The existing MotifGraph can hold these relations, but the present partial Neon fixtures do not reconstruct these Krovets networks.
3. **Use different rules for field and border.** Side vines, narrow chains, terminal bands and a branching main plant should have different repeat units and density. The recent three composition prototypes only tile existing partial units; they do not yet reproduce continuous vines, growth hierarchy or varied flower constructions.
4. **Decompose flower and leaf interiors.** Distinguish envelope, petal/lobe groups, centre, veins and stitch-specific interior fields. Closed-contour count alone is a poor measure of sophistication. The blackwork study demonstrates a separate pixel-level interior sample, not a finished semantic fill or calibrated stitch plan.
5. **Treat fabric operations separately.** Whitework, drawn-thread/openwork, seams, lace and gathering cannot safely become one run-stitch path. The Pokuttia example exposes an important missing representation; present reference contours do not encode those operations or certify their machine feasibility.
6. **Recognise repairs and incomplete sources.** Fragment joins, fading and missing parts can masquerade as symmetry or repeat. Source condition must qualify inferred relations; a source-derived repeat needs independently checked correspondences, not adjacency alone.

## Evidence needed for reconstruction

The public [Krovets-PRO digitization page](https://krovets.ua/digi-standard) describes consistent category-specific base views and additional views for unusual/detail features, with completeness and reliable comparison as goals. It explicitly does not regulate technical image quality and points to other imaging guidelines. Only this public overview was read; the linked detailed DS1 document and its example folder were not examined.

For our pipeline, the next useful inputs are permitted, sufficiently detailed views of a motif, front/reverse stitch treatment, fabric grain/density and boundaries with adjacent motifs, accompanied by object-specific attribution and condition evidence. This is our reconstruction requirement, not a claim that those exact shots or measurements were obtained from Krovets.

The first concrete reconstruction target should have one branching main plant, independently annotated attachments, two or more distinct terminal constructions and a different border unit. Compare reconstructed geometry against those independent annotations and assess spacing after stitch digitization. More copied tiles or a higher contour count alone would not meet this target. Geometricised plants and whitework should have separate targets rather than being pooled into a single floral grammar.

## Rights and verification

Examined title images are labelled CC BY-NC-ND; other photographs are restricted to personal/noncommercial use. They remain research references and are not traced, trained on, redistributed or admitted as reconstruction fixtures. Their attribution applies to those particular objects and cannot be transferred to existing Neon motifs. No permission requests or messages were sent.

Verified all nine retained record/preview hashes, unique source IDs and restricted-source flags. This is a research/data increment; no engine code changed, so engine tests were not repeated. No complete historical decomposition, model training, machine stitch count, production approval or deployment success is claimed.
