# ASCEND Garment Engine v0.1

## Purpose
Make the physical garment a first-class input to Tesseract. A design is generated for a real pattern and body/size state, not pasted onto a generic shirt image.

## Product hierarchy
GarmentModel 1:N FitProfile
GarmentModel 1:N PatternVariant
PatternVariant 1:N PatternPiece
PatternPiece 1:N DesignZone
DesignZone 1:N SurfaceMeasurement
GarmentConfiguration 1:1 SizeProfile
GarmentConfiguration 1:N ComponentChoice
GarmentConfiguration 1:N MaterialChoice
GarmentConfiguration 1:N DesignIntent
DesignIntent 1:N TesseractCandidate
TesseractCandidate 1:N ManufacturingProjection

## Customer controls
1. Garment: traditional shirt / buttoned shirt / overshirt / tunic / later jacket.
2. Body: standard size or measurements.
3. Fit: fitted / regular / relaxed plus garment length.
4. Construction: collar, sleeve, cuff, placket, yoke, hem, closure.
5. Material: substrate, weight, color.
6. Meaning: ASCEND concepts.
7. Heritage influence: evidence-bound structural grammars, not copied motifs.
8. Character: restrained ↔ expressive, ordered ↔ organic, sparse ↔ intricate.
9. Placement: collar / placket / chest / shoulder / sleeve / cuff / yoke / hem / wrap.
10. Preview and production validation.

## Engine-only state
Pattern-piece dimensions, seam allowance, ease, shrinkage, grain, circumference, taper, seam location, editable/no-go zones, embroidery envelope, registration points, minimum stroke/gap, density, hoop segmentation and manufacturing confidence.

## Improvements over a standard option constructor
### Constraint-aware configuration
Invalid combinations are prevented before checkout. Component compatibility is a graph, not a flat dropdown list.

### Body-aware sizing
Standard size is only a starting state. Measurements resolve to ease-aware pattern dimensions. The system should explain which measurements changed the base size.

### Design follows construction
Tesseract receives pattern topology. It can cross a seam deliberately, wrap a sleeve, compress into a cuff, or stop before a placket instead of placing a flat ornament over a rendered garment.

### Semantic composition
The customer chooses an outcome/meaning. Tesseract composes a garment narrative across zones instead of merely selecting an ornament.

### Multi-scale composition
S1 stitch/particle -> S2 glyph -> S3 compound -> S4 passage/band -> S5 garment field. A design must remain legible at multiple viewing distances.

### Manufacturing-aware preview
Preview states must distinguish visual estimate from manufacturable, sample-validated and production-approved states.

### Live price and feasibility
Configuration changes can update material consumption, embroidery area/stitch estimate, segmentation, labor class, price and expected production range.

### Saved design genome
A customer can save a semantic design identity and re-project it onto another size, garment or medium without simply scaling artwork.

### Explainable provenance
Every cultural contribution carries source, abstraction distance, confidence and access status. Sacred/restricted sources never become automatic commercial design assets.

### Better UX
Progressive disclosure: customer sees Garment -> Fit -> Construction -> Material -> Meaning -> Design -> Review. Expert controls remain optional. A 3D/2D preview should expose garment zones and warn when a requested composition is impossible.

## Required invariants
- Canonical ASCEND source geometry is immutable.
- Meaning and topology precede visual styling.
- Size changes reflow/adapt composition; they do not blindly scale it.
- Cultural evidence informs grammar; it does not license copying.
- No production approval without physical validation.
