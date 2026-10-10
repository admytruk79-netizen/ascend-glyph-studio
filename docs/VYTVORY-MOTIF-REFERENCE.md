# Vytvory: verified reference architecture for motif learning
Reviewed 2026-10-09. https://vytvory.ua/

Vytvory is a **custom garment configurator**, not a published open-source training engine. It explicitly offers a library of historical Ukrainian shirt ornaments, adjustable garment cut, ornament, fabric and embroidery colors, and machine embroidery. We cannot claim access to its private algorithms.

## Traceable historic motif references (metadata, not licensed training images)

| Garment reference | Original collection accession | Provenance |
|---|---|---|
| https://vytvory.ua/uk/product/sorochka-zhinocha-244 | NMAG5572 | Oleksiivka, Luhansk region; National Museum of Folk Architecture and Life of Ukraine |
| https://vytvory.ua/uk/product/sorochka-zhinocha-256 | NMAG5571 | Oleksiivka, Luhansk region; National Museum of Folk Architecture and Life of Ukraine |
| https://vytvory.ua/product/sorochka-cholovicha-223 | KYD67 | Rudka, Chernihiv region; Krovets ethnographic collection |
| https://vytvory.ua/uk/product/sorochka-cholovicha-239 | KYD37 | Slobozhanshchyna; Krovets ethnographic collection |
| https://vytvory.ua/uk/product/sorochka-zhinocha-246 | KYD40 | Slobozhanshchyna; Krovets ethnographic collection |
| https://vytvory.ua/uk/product/sorochka-cholovicha-237 | KYD10 | Slobozhanshchyna; Krovets ethnographic collection |

Some Vytvory listings are alternate garment presentations of **the same underlying accession**. Deduplicate by accession before counting training examples.

## Reuse existing Tesseract implementation

- `scripts/train/learn.ts` already implements raster foreground segmentation, connected components, motif descriptors, Fourier features, k-means, and averaged prototypes.
- `scripts/train/train-motifs-from-manifest.ts` consumes **approved local images** to produce a motif codebook; do not silently train on Vytvory's website pictures.
- Study garment zones (collar, cuff, sleeve, chest) and how ornament, material, cut and color are independently configurable.
- Maintain links between each learned motif cluster and source accession/region, but output derived clusters, not copied museum objects.
- Compare generated motifs with held-out approved originals and reject near-duplicates.

## Current blocker

No approved local image manifest has been verified or executed in this session. No motif-codebook training success is claimed. Obtain rights/approved digitizations before loading source imagery.
