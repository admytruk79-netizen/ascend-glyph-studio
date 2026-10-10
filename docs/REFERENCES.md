# Reference sources (not harvested)

These sites are studied as **product and domain references**. Their content is not harvested, copied or used as training data. Use them for product thinking, taxonomy and partnership; never as pattern vocabulary.

## Vytvory: online vyshyvanka constructor

- **Site:** https://vytvory.ua/
- **What it is:** a customer-facing constructor for embroidered shirts.
  - A regional ornament library; its present size was not independently verified on 9 October 2026.
  - The customer picks ornaments, fabric and size, and the shirt is made to order.
  - The public project description presents regional libraries and custom compositions; enforcement of a single-region selection rule was not verified.
- **Why it matters:** it's the closest existing product to the ASCEND Glyph Studio customer flow (choose product → choose elements → preview → order).

**How we use it**
- **Product benchmark:** study the ordering flow, how ornaments are chosen, the fabric and size steps, preview quality and order fulfilment.
- **Coherence rule:** its "everything stays within one regional style" rule maps to an ASCEND rule. A design stays within one grammar or palette family, and regional character ("Carpathian structure", "Poltava structure") comes from structure learned from our own analysed museum corpus.
- **Regional taxonomy:** regional attribution can inform how the Ukrainian part of the structure library is grouped; the previously cited style and region counts remain unverified. It's filled only with our own corpus data.
- **Possible partner:** it already produces custom embroidered shirts to order, so it's a candidate for production knowledge or manufacturing partnership.

**How we don't use it**
- Its ornament collection is its own curated, reconstructed catalogue. It's never harvested, traced, vectorised or used as input to Tesseract.
- Access rules are checked by the read-only probe (`scripts/corpus/probe-sources.mts`) for the record only.

## krovets.ua: online museum of traditional Ukrainian art

- **Site:** https://krovets.ua/
- **Status: excluded from collection.** Its terms of use (§2.12) grant site content for **personal non-commercial use only**. They also forbid using the exhibits' designs to make items for sale or for mass production. Its robots.txt also blocks the data interface (`/api/`).
- **How we use it:** as a human reference for browsing regional Ukrainian material, for example while forming the regional taxonomy. No images, designs or data are harvested, traced or used as Tesseract input.

## Reading list: scholarly sources on meaning

These are read by people. Facts from them go into `data/semantics/motif-semantics.v1.json` with an evidence grade. Copies of copyrighted books stay private and are never committed.

### Read and recorded

| Source | What it gives Tesseract |
|---|---|
| O. Nykorak, L. Herus, T. Kutsyr, "Узорноткані пояси Західної України і Литви: техніки, орнаментика, функції", *Народознавчі зошити* 5 (167), 2022, pp. 1147–1163, [DOI 10.15407/nz2022.05.1147](https://doi.org/10.15407/nz2022.05.1147) | Folk names of sash motifs (UA and LT), ethnographic sash functions (protection by enclosure, life passages), composition rules (1/3/5/7-part symmetry), woven-text precedent |
| L. Dmytruk, "Сакралізація народного одягу в Україні як приклад сучасного міфотворення", *Культура і сучасність* 2, 2016, pp. 101–105 | Shows that "magic code" and "protective amulet" readings of the vyshyvanka are largely **modern myth-making**, built on oral retellings and undocumented sources (examples: a Vogue UA claim about unpicking a rhomb to "deactivate" fertility; *Скриня. Речі сили*; the film *Спадок нації*). Supports Tesseract's evidence grading and the rule that ASCEND makes no magical-protection claims. |

### To get (from both articles' bibliographies)

| Work | Why | Where |
|---|---|---|
| M. Selivachov, *Лексикон української орнаментики*, 2005 / 2nd ed. 2009 / 3rd ed. 2013 | Folk names matched to pattern graphics: the main upgrade for evidence grades | Print; US via interlibrary loan or WorldCat |
| V. Tumėnas, *Lietuvių tradicinių rinktinių juostų ornamentas: tipologija ir semantika*, 2002 | Lithuanian sash typology and semantics | [lituanistika.lt record](https://www.lituanistika.lt/content/7008); author's papers: [academia.edu](https://istorija.academia.edu/VytautasTumėnas); English article: [Lituanus 2014/4](https://old.lituanus.org/2014/14_4_04Tumenas.html); *Sign Systems Studies* 2014 (open access): [DOAJ](https://doaj.org/article/b0cf80b2539645be818933627fe362f8) |
| A. & A. Tamošaitis, *Lithuanian Sashes*, Toronto 1988 (English, 100+ colour diagrams) | Sash structures and diagrams | [LTFAI eBook](https://ltfai.org/?p=9264) (members' PDF) |
| T. Volkovicher, *Вербальні тексти у народній вишивці* (verbal texts in folk embroidery) | Embroidered words: precedent for the secure-glyph code | [chtyvo PDF](https://shron1.chtyvo.org.ua/Volkovicher_Tetiana/Verbalni_teksty_u_narodnii_vyshyvtsi_kintsia___pershoi_polovyny__st_geneza_semantyka_prahmatyka.pdf) |
| R. Zakharchuk-Chuhai, *Українська народна вишивка. Західні області УРСР*, 1988 | Regional embroidery of the West | Print |
| T. Kara-Vasylieva, A. Chornomorets, *Українська вишивка*, 2002 | Survey and regional styles | Print |
| O. Bosyi, *Священне ремесло Мокоші*, 2011 | Textiles in ritual (ethnographic grade) | Print |
| M. Biliashivskyi, "Про український орнамент", 1908 | Early ornament study; public domain | Library scans (not found online yet) |
| F. Vovk, *Студії з української етнографії та антропології*, 2015 ed. | Classic ethnography | Print |
| Yu. Melnychuk, "Семантика українських вишитих рушників", *Народне мистецтво* 3–4, 2004 | Towel semantics | Journal |
| Ye. Prychepii, interview "Подільський рушник подібний до мандали" | Cosmological reading of Podillia towels (scholarly-interpretive; Dmytruk treats it as myth-making) | [honchar.org.ua](http://honchar.org.ua/p/podilskyj-rushnyk-podibnyj-do-mandaly-evhen-prychepij/) |
| *Українська вишивка: хрестоматія* (UDPU) | Collected readings | [UDPU PDF](https://dspace.udpu.edu.ua/bitstream/123456789/16475/1/Ukrainska_vyshyvka_Khrestomatiia.pdf) |

## Licence decision: share-alike images (2026-10-06)

The owner decided that **CC BY-SA** images (mainly Wikimedia Commons) are accepted into the research corpus. The conditions:
- Tesseract stores only structural measurements and a link to the source, never the image.
- No design copies any single image.
- Source, author and licence stay in each design's lineage.

Non-commercial (NC) and no-derivatives (ND) licences still go to review. Set by `COMMONS_ACCEPT_SHAREALIKE=1` in the corpus workflow.


## Vytvory approach adopted for ASCEND (2026-10-09)

The owner explicitly requested Vytvory as an approach reference. Its public [homepage](https://vytvory.ua/) and [project description](https://vytvory.ua/uk/about) support a curated-library → coherent-composition → product-configuration approach. The linked interactive constructor exceeded the browsing tool response limit, so its complete behaviour was not tested.

For ASCEND, develop a small author-approved vocabulary from the original drawings, with explicit motif/separator/border roles, compatible scale classes, repeat cells and colourways. Use historical evidence for attributed arrangement rules. Customer controls should select product and placement, author family, coherent layout, colours and bounded repeat/scale variations. Save the exact geometry and specification for review; visual acceptance must remain separate from manufacturing approval.

Start with Seed and Current: the coloured pencil sheet’s nested concave stars above a continuous flowing branch separator. Preserve concavity, extended vertical axis, small warm centre and distinct halo; assess the full repeat and seam at physical cuff and panel scales. Horizon and Orbit (illustration 06) and Root and Peak (illustration 05) follow as separate families. This is the owner’s original style library, not a pooled catalogue of interchangeable historical motifs. It addresses the current generated bands’ scattered, schematic glyph character without merely raising automated scores.
