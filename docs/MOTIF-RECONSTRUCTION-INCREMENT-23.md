# Increment 23: exact user imagery and Honchar historical source

The reuploaded screenshots are now available. Six clean photograph crops were
retained: floral sleeve bands, branching border, scroll/vine arrangement,
mixed diamond sleeve band, geometric sleeve panel and angular figure field.
Phone interface and result captions were excluded. Original screenshot hashes,
crop rectangles and resulting JPEG hashes are in
`data/research/user-imagery-examples/provenance.json`.

The development studio now opens on **Your imagery**, showing the actual floral
sleeve photograph by default. Selecting another example changes the main image.
The source gallery contains these six crops plus the previous three retained
references. Draft motif layouts and canonical glyph studies remain separate
views. This does not convert a screenshot into a generated design or stitch file.
Original creators and item-level regional attribution remain unverified; the
visible Chernihiv Polissia caption is not promoted to verified provenance.

## Honchar article

The supplied museum URL was fetched successfully. It is an article by Kateryna
Kachur, published 2012-08-30, describing a 2012 exhibition of approximately one
hundred authentic shirts from museum holdings. That is an exhibition count,
not an available licensed training-dataset count or a current event.

Eleven original-photo URLs were extracted from actual page links. Four originals
were downloaded locally and visually examined; each measures 800×533 pixels.
Two are exhibition/context photographs; two are close-ups showing compound
red/black angular bands and dark floral clusters. Their visible watermark credits
the museum and photographer BOHDAN POSHYVAILO. Full URLs, checked dimensions,
visual observations, article hash and evidence boundaries are retained in
`data/research/honchar-exhibition-2012/review.json`. Museum photographs themselves
were not redistributed or admitted to training in this increment.

Useful construction-study leads: distinct sleeve/inset/hem versus collar/chest/
cuff decoration; keeping white cloth ground in the colour/negative-space system;
and retaining garment use, period and locality with placement/palette evidence.
The placement comparisons are attributed interview observations, not universal
regional rules or labels inferred for uncatalogued images. Unsupported radiation-
protection claims and racial/esoteric explanations are excluded from factual
engine guidance.

The article is linked directly in the imagery view. Its photographs have no
verified open training licence; a visible image credit is not permission to train.
User-supplied crops remain explicitly bounded local reference-study assets,
without an ownership, CC0 or production-library assertion.

## Verification and limits

Six input/crop hashes and extraction rectangles verified; web TypeScript/Vite
production build passed. Browser checks verified the actual uploaded photo is
the default, example selection changes the photo, nine gallery images load,
the Honchar URL is correct, no page errors and no 390-pixel mobile overflow.
Screenshots/results are retained under
`data/research/motif-benchmarks/user-imagery-v1/`.

No engine geometry changed, so the earlier engine suite was not rerun or claimed
as a new check. No new model fitting, segmentation, stitch count, machine export,
Neon write, production deployment or sew-out approval occurred.
