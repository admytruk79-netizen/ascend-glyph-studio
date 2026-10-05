# Manufacturing profiles

Diary geometry is derived from physical product inputs before glyph synthesis.

The first reference profile is KDP paperback A5, cream paper, 160 pages. It encodes the useful manufacturing principles rather than making KDP the domain model: trim, bleed, page-count/paper-derived spine, safe area, fold variance, barcode exclusion, minimum reproducible line, and spine-text eligibility.

KDP reference values used by this profile:
- cover bleed: 3.2 mm;
- cream-paper spine caliper: 0.0635 mm per page;
- minimum line: 0.3 mm;
- spine text only at 79+ pages;
- 1.6 mm clearance on either side of spine text/fold boundary.

Barcode dimensions are an ASCEND conservative exclusion-box default and are not represented as a KDP canonical measurement. Manufacturer profiles may override it.

This layer must remain manufacturer-independent: future printers get separate profiles and formulas rather than changes to glyph semantics or canonical geometry.
