# Embroidery machine specifications and ASCEND exports

Manufacturer pages/manuals checked 10 October 2026. This is a researched compatibility registry, not an exhaustive worldwide inventory, stock check or a claim that every model in each manufacturer's catalogue is supported. Fourteen model profiles cover ten brands. Unknown capabilities stay unknown in the Studio and reports.

| Model | Manufacturer maximum field (mm; axes may require rotation) | Needles | Maximum embroidery speed (spm) | Input formats verified in examined source | Per-design stitch limit verified |
|---|---:|---:|---:|---|---|
| [Brother PR1055X](https://download.brother.com/welcome/doch101931/884t15-16_om03_en.pdf) | 360 × 200 | 10 | 1,000 | PES, PHC, PHX, DST | 500,000; manual troubleshooting p.188 and specifications p.190 |
| [Brother PR680W](https://www.brother-usa.com/p/embroidery/PR680W) | 300 × 200 | 6 | 1,000 | Not verified in fetched product page | Unknown |
| [Baby Lock Venture](https://babylock.com/venture) | 355.6 × 200; converted from 14 × 7⅞ inches, short side nominally 200 | 10 | 1,000 | PEN, PES, PHC, DST | Unknown |
| [Janome MB-7](https://www.janome.com/product/mb-7/) | 238 × 200 | 7 | 800 | JEF+, JEF, DST | Unknown |
| [Tajima TMEZ-SC](https://www.tajima.com/product/tmez-sc/) | 500 × 360 | 15 | 1,200; caps up to 1,000 | Not verified in fetched product page | Unknown |
| [ZSK SPRINT 7](https://www.zsk.de/en/embroidery-machines/sprint.php) | 460 × 310 | 18 | 1,200 | Not verified in fetched product page | Unknown |
| [ZSK SPRINT 7 L](https://www.zsk.de/en/embroidery-machines/sprint.php) | 600 × 400 | 18 | 1,200 series figure | Not verified in fetched product page | Unknown |
| [ZSK SPRINT 6 XL](https://www.zsk.de/en/embroidery-machines/sprint.php) | 1,200 × 280 | 12 | 1,200 series figure | Not verified in fetched product page | Unknown |
| [Melco BRAVO](https://melco.com/melco-bravo-embroidery-machine/) | Not verified in fetched page | 16 | 1,000 | Not verified in fetched page | Unknown |
| [BERNINA 700 PRO](https://www.bernina.com/en-US/Machines-US/Series-Overview/BERNINA-7-Series/BERNINA-700-PRO) | 400 × 210 | 1 | 1,000 | Not verified in fetched page | Unknown |
| [Ricoma EM-1010](https://ricoma.com/products/10-needle-easy-to-use-embroidery-machine-for-beginners-with-10-1-touchscreen-panel) | 309.88 × 210.82; converted from 12.2 × 8.3 inches | 10 | 1,000 | DST | Unknown; 100 million stitches is aggregate memory, not a per-design limit |
| [Ricoma Marquee 15](https://ricoma.com/products/marquee-15-needle-commercial-embroidery-machine-with-10-1-touchscreen-panel) | 500.38 × 360.68; converted from 19.7 × 14.2 inches | 15 | 1,200 | DST | Unknown; 100 million stitches is aggregate memory |
| [Husqvarna Viking DESIGNER EPIC 3](https://www.singer.com/products/husqvarnaviking-designer-epic-3-sewing-embroidery-machine) | 460 × 450 advertised maximum; included hoops differ | 1 | 1,000 | Page says multiformat but does not enumerate formats; unverified | Unknown |
| [PFAFF creative icon 2](https://www.singer.com/products/pfaff-creative-icon-2-sewing-and-embroidery-machine) | 350 × 360 | 1 | Unknown from examined page; 1,050 figure is sewing, not established embroidery speed | Not verified in fetched page | Unknown |

The registry deliberately does not copy generic brand-format assumptions into verified model capabilities. For example, industrial DST usage is widespread, but the examined Tajima and ZSK pages did not enumerate input formats. Actual controller documentation is still needed. The Barudan single-head page was read and describes 15-needle heads and up to 1,300 spm on flats, but it covers multiple configurations and did not establish a specific field/profile. Older Ricoma and BERNINA links returned 404; current manufacturer links above were found and read instead. An attempted SWF domain resolved to a domain-sale page and was rejected as specification evidence. A Happy model link returned 404. These do not establish model compatibility.

## What the generated files contain

The real Tesseract generatePatterns route supplies millimetre geometry. The stitch engine resolves visible colours at 0.2 mm, generates tatami rows 0.43 mm apart with row stitches at most 2.5 mm, and uses running stitches up to 1.5 mm for selected fine veins and Penrose edges. Shade-filled Penrose tiles and fabric background are omitted. Background-edge segments hidden behind foreground shapes are not embroidered. Shared Penrose triangle edges are deduplicated and joined into 74 edge walks before visibility clipping, so shared seams are sewn once. Regions remain separate across cut-outs; adjacent rows connect only through verified same-colour mask paths. Regional ordering reduces travel, with trim requests for travel above 7 mm and at colour changes. Commands are centred on the physical panel and quantised to DST's 0.1 mm units.

DST contains needle movements, jumps, colour stops and three-jump trim conventions, not named thread colours. The JSON report supplies the thread sequence. Independent pyembroidery 1.5.1 reading checks counts and bounds. PES version 6 conversion restores thread colours; reading the converted PES verifies identical stitch and colour-change counts. The produced PES files are additional portable candidates for the models with verified PES support; they have not been loaded on physical hardware.

| Export, seed machine-reviewed-20261010 | Needle penetrations, including locks | Colours | Colour changes | Trim requests |
|---|---:|---:|---:|---:|
| Illuminated garden, crimson/linen | 118,692 | 6 | 5 | 884 |
| Illuminated garden, dark ground | 98,688 | 5 | 4 | 634 |
| Illuminated guardians, crimson/linen | 126,807 | 7 | 6 | 967 |
| Illuminated guardians, dark ground | 110,801 | 7 | 6 | 758 |

Counts are measured from the final DST command records, not geometry object counts or area estimates. Studio variations and browser rasterisation can produce different counts; each download includes its own report. Trim requests are not a guarantee that a controller recognises every trim. Jump record counts include encoded trim jumps and split travel moves.

All four reference exports have a nominal 180 × 250 mm panel and a measured stitched extent of approximately 166.2 × 237.4 mm. The MB-7 can accommodate that stitch extent within its advertised maximum field, but with only 0.6 mm remaining along the long axis. This is not adequate evidence of fit in an installed hoop. Many machine fields are landscape; the report records when rotation is required relative to the listed axes. No automatic splitting, rehooping or blind scaling of a machine file is performed.

At 1,000 spm, the crimson garden's needle count alone requires about 119 minutes; actual time is longer because of travel, trims, acceleration, colour changes and thread service. Having fewer needles than thread colours requires manual thread changes; it is not automatically an incompatible design.

## Remaining production inputs

The user has not selected a machine, installed hoop or fabric. Files are downloadable sew-out prototypes, with productionRelease=false. This digitiser does not yet supply fabric-specific underlay, pull compensation, needle/thread selection, density calibration or measured shrinkage. Sampling can omit sub-resolution fragments and it is not a stitch-by-stitch vector reproduction. Test-sew a motif or representative crop before committing a complete garment. A successful binary decode and advertised field fit do not establish physical sewability.

The existing compileProductionIr material/validation pipeline remains available separately. It is not silently marked validated here: its current global colour sorter can reorder visible stacked layers. These exports instead digitise the resolved visible surface. The known source-overlap problem is therefore not carried into a stack of full hidden fills.
