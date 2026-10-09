# Ukrainian research corpus: additional verified sources

Checked 2026-10-09. These are research candidates, **not imported training images**.
Do not download or train on protected images without verifying rights and allowed uses.

## Sloboda Ukraine Code (priority)
- Catalog: https://slobocode.art/collection
- Museum partnership: https://museum.kh.ua/osvita/sloboda-ukraine-code.html
- Project reports 500 digitized embroidered artefacts (shirts, rushnyks, specimens).
- Catalog includes accession identifiers; record each accession, object URL, date, place, techniques and image rights.
- Rights holder identified as CLIO HUB: https://heritageukraine.omeka.net/items/show/53
- **Status: research metadata only; request rights approval for any image analysis or commercial model training.**
- Example Poltava Governorate rushnyk: https://slobocode.art/en-US/collection/499
- Deduplicate by museum accession before any import.

## Poltava Museum of Local Lore
- Digital museum: https://www.pkm.poltava.ua/en/digital-museum
- 60 digitized 2D/3D exhibits, not necessarily all embroidery.
- **Status: inspect item-level rights, do not count all 60 as training samples.**

## Regional audit vocabulary
Ukraine, Ukrainian, Poltava, Reshetylivka, Borshchiv, Bukovyna,
Hutsulshchyna, Pokuttia, Slobozhanshchyna, Chernihiv, Volyn, Polissia.
Use regional terms to **surface review candidates**, never as automatic proof
of a particular cultural attribution.

## Learning requirements
1. Run scripts/corpus/ukrainian-corpus-audit.sql read-only.
2. Review object provenance and rights for newly surfaced candidates.
3. Deduplicate by accession/image hash, maintain leakage-safe train/validation/holdout.
4. Learn symmetry, repeat, layout, scale hierarchy, spacing, garment zones;
   do not copy museum motif geometry or treat cultural/sacred motifs as free assets.
5. Keep source-specific and Ukrainian-regional metrics separate from Global/Other.
6. Measure change in held-out pattern quality and physical production compliance.
