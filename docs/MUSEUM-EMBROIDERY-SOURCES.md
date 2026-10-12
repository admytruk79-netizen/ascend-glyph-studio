# Museum embroidery sources — checked 2026-10-12

These sources provide museum catalogues, historical attribution and object
images. Six newly reviewed Cleveland images and nine object records are
retained under `data/research/museum-embroidery-sources/`. This research did not
train a model or reconstruct these new objects.

## Ukrainian embroidery

| Museum and direct source | Useful material | Reuse status |
| --- | --- | --- |
| [Ivan Honchar Museum: clothing](https://honchar.org.ua/collections/view/odag), [rushnyky](https://honchar.org.ua/collections/view/rusniki), [embroidery and cutting charts](https://honchar.org.ua/to-learn) | Ukrainian shirts, towels, regional clothing and actual pattern/cut charts. Collection and chart pages returned HTTP 200. | Research reference. Earlier inspected chart PDFs expressly prohibit commercial use; no blanket training licence. |
| [Museum of Ethnography and Arts and Crafts, Lviv](https://ethnology.lviv.ua/naukovi-pidrozdili/muzei-etnografiji-ta-khudozhnogo-promislu) | Historical textiles and modern textiles collections. Official page describes about 2,400 modern-textile holdings, including embroidery, clothes and fabrics, and rushnyky from Kyiv, Zhytomyr, Chernihiv, Sumy and Poltava regions. This is a museum-reported collection count, not an available digital training dataset. | Institutional source and catalogue lead; downloadable object images and training rights not established. |
| [V&A: Ukrainian wedding shirt and apron, T.7&A-1964](https://collections.vam.ac.uk/item/O364307/) | Detailed catalogue account of linked diamonds, shield/flower motifs, red/black satin and cross stitches, two sleeve bands, scattered floral motifs, cuffs, collar and bobbin-lace edging. National attribution Ukraine; no smaller region inferred. | Images explicitly © V&A; not admitted for training. |
| [V&A: Ukrainian child's jacket and apron, T.70-1951](https://collections.vam.ac.uk/item/O364308/) | Embroidered cotton bands and lace, multiple object images and garment measurements. Date display is “1800s”; preserve that display rather than deriving an exact year. | Images explicitly © V&A; not admitted for training. |

The Hutsul and Pokuttia museum URL `https://hutsul.museum/` returned HTTP 429.
The old decorative-art museum domain `https://www.mundm.kiev.ua/` returned an
empty body. Neither is presented as a newly examined object catalogue.

## Six directly examined CC0 objects

Cleveland's official API supplied `share_license_status: CC0` for every object
below; the [museum's Open Access policy](https://www.clevelandart.org/open-access)
also returned successfully. Catalogue culture and technique strings are retained
verbatim. Web images were downloaded and visually examined; larger print-image
URLs are saved for later detailed annotation.

| Object | Museum attribution and date | Construction lessons visible in the image |
| --- | --- | --- |
| [Embroidered Blouse Front, 1937.582](https://clevelandart.org/art/1937.582) | Palestine, 19th century; silk on linen | Neck opening and placket constraints; vertical narrow repeats; large lower diamond/chevron; scale changes between border and field. |
| [Embroidery sampler (chelliga/shelliga), 1929.831](https://clevelandart.org/art/1929.831) | Morocco, c. 1700s; cotton, silk, dye | Multi-field sampler; dense angular repeats; narrow separator bands; branching geometric forms. No specific city or language inferred. |
| [Embroidery with Birds, 1994.96](https://clevelandart.org/art/1994.96) | China, Tang dynasty, 700s–800s; silk embroidery | Bird spacing and orientations; distinction between embroidered subjects and separately patterned woven ground. No bird species assigned. |
| [Altar Cloth, 1948.352](https://clevelandart.org/art/1948.352) | Germany, Altenberg convent, c. 1350; linen embroidery | White-on-white segmentation, framed medallions, repeated geometric boundaries and internal figures. This is not evidence of cutwork. |
| [Rumal with Rama and Krishna scenes, 1996.349](https://clevelandart.org/art/1996.349) | Northern India, Pahari Kingdom of Chamba, 1700s | Humans, animals, trees, flowers, narrative groups and perimeter ornament. Preserve its specific religious/narrative attribution. |
| [Embroidery from a Cloud Collar: Ocean, Rocks, and Peonies, 1993.10](https://clevelandart.org/art/1993.10) | China, Yuan–early Ming, 1300s; needleloop embroidery | Branch hierarchy, peony forms identified by the catalogue, decorative lower landscape and placement inside a garment-shaped silhouette. |

These add actual non-floral source material: birds, animals and people,
whitework, geometric samplers and garment placement. CC0 enables copyright
reuse; it does not establish cultural review, annotated ground truth, image
calibration or manufacturing feasibility.

## Further museum sources

- [V&A: Bethlehem dress, T.250-1923](https://collections.vam.ac.uk/item/O364469/):
  Palestine, Bethlehem, 1890–1920. The museum explicitly describes tatreez,
  regional diversity, an unembroidered chest-panel centre and surrounding
  border stitches. The full record was read; images remain copyrighted V&A.
- [Art Institute of Chicago: Polly Bedford's Sampler, 1791](https://www.artic.edu/artworks/107913):
  official API records back, chain, Cretan, running, Roman, satin and stem
  stitches, laid work and couching; `is_public_domain=true`, image available.
- [Art Institute of Chicago: Mourning Sampler](https://www.artic.edu/artworks/36076):
  about 1810; catalogue distinguishes split, surface satin and stem stitches,
  couching and human hair; public-domain image flag true.
- [Art Institute of Chicago: Fragment of Embroidery](https://www.artic.edu/artworks/150153):
  China, Yuan dynasty, 14th century; knot and open-chain stitches over
  gold-leaf-over-lacquered-paper strips; public-domain image flag true.
  These three AIC records were inspected as API catalogue text, not visually
  reviewed. [API licensing documentation](https://api.artic.edu/docs/#licenses)
  was fetched; object image flags and separate metadata licences must remain
  distinct. Some other embroidery search hits have public-domain flag false.
- [Met: blackwork, ca. 1590](https://www.metmuseum.org/art/collection/search/239343):
  source image and prior manual leaf/stem annotation already retained in the
  repo; country/region remains unassigned because the culture field is empty.
- [Met: Sibmacher's Newes Modelbuch, 1604](https://www.metmuseum.org/art/collection/search/357206):
  pattern-book source previously examined; geometric/floral counted bands and
  multiple pages. [Met Open Access policy](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access)
  was rechecked, but the fresh broad API search returned HTTP 410; no new
  comprehensive Met search result is claimed.

## Next use in the engine

Prioritise the CC0 Palestinian front and Moroccan sampler for geometric
field/border annotations, Chinese birds for silhouette and orientation labels,
and the German whitework for foreground/ground separation. Annotate the Chamba
figures as an independently attributed narrative source, not synthetic Ukrainian
motifs. Use Honchar, Lviv and the V&A Ukrainian catalogue to guide region and
garment-placement review; their public availability is not a training licence.

The retrieved museum photos do not yield stitch counts, calibrated fabric grids
or machine routes without additional evidence. New sources are research assets,
not automatically inserted into a training manifest.
