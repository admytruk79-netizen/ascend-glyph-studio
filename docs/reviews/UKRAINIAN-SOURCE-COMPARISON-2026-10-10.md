# Ukrainian source comparison and execution evidence

The user selected Vytvory.ua as the reference and explicitly rejected the sparse author-star design direction. This review compares the source material with actual Tesseract output; it does not claim the generated designs already meet that request.

## Examined Neon records

Read from research_corpus_analysis in project spring-mode-77399290. There are 3,785 records labelled Ukraine. This is a metadata count, not a count of verified embroidery designs. A portrait and a vyshyvanka parade photograph appeared among title-matching results: filtering on country or embroidery words alone is insufficient.

Visually inspected commons-23697961, «Гуцульська вишивка», from the image URL recorded in Neon:
https://commons.wikimedia.org/wiki/File:Гуцульська_вишивка.jpg

The plate contains multiple independent examples. The left column shows counted-grid bands with large nested diamonds, stepped cross-like centres, alternating dark/light cells, narrow separator strips and edge teeth. Red is prominent, with black, yellow and green used in different rows. The right column includes linked diamond chains, looped repeats, red/white reversals and narrow worked bands. These are observations of this plate, not universal Ukrainian motif meanings or established regional rules for every item.

The useful construction hierarchy is border → main repeat → internal cell structure → separator. A design needs a coherent repeat and subordinate borders; scattering unrelated marks across a field does not preserve that hierarchy.

## Automatic analysis limitations

For commons-23697961, deconstruct/0.2 reports one horizontal band at rows 235–256, period 33.26 analysis pixels, periodicity .553 and p1 translation. That single detected band does not describe the plate's several major pattern rows. Its ABCDEFFF sequence has no named figure annotations. It is not a semantic inventory of diamonds or crosses.

For commons-150899942, «Техніка вишивки “Городоцький шов”», the stored report assigns p1 to a strip at rows 331–360, period 20.97 pixels, and an ABCDEFFGHIJKLMNOOPQQR sequence; it also reports no overall repeat. This record was read, but its source image was not visually verified in this review. Do not treat the detected strip as a complete construction grammar.

The next corpus conditioning step must select actual textile/pattern images, crop individual bands, and validate repeat segmentation against the images before deriving motif and border rules. Analysis pixels must not be presented as physical stitch dimensions.

## Actual execution and visual mismatch

Executed the checked-out engine at 6a185858df3da6f9a8805306e7afc71f669ea5af locally. Typecheck, 62 tests and compilation passed. The CLI produced 40 pattern SVGs, plus separately authored compound geometry examples. The web application build also passed.

The bundled worldPatternGraph resolves only one object for ukraine and zero for the requested arabic, arab, native-american and indigenous-north-america identifiers. The CLI does not query Neon and therefore is not conditioned on all 3,785 Ukrainian records. No successful run should be called verified tri-cultural learning on that evidence.

The original CLI applied composeCompoundTextileSvg after generatePatterns, adding hand-authored flowers and borders. That layer was removed from the reported pattern outputs. The separate compound samples remain explicitly labelled as hand-authored examples. Pattern SVGs now contain the generator output without that decoration.

The examined generated field has isolated small symbols, long straight connections and substantial empty space. It does not match the plate's dense, structured embroidery bands. Automated tests verify execution and geometry contracts; they do not establish visual acceptance or manufacturing readiness.

## Deployment failure and repair

The tri-culture workflow failed at npm ci because the repository has no npm lockfile. Its install step now uses npm install --no-audit --no-fund, consistent with the other passing workflows. The repaired run 38021510323 succeeded and uploaded tri-culture-svg, artifact 11658053162. Cloudflare's build for the install-fix commit also succeeded. The subsequent unmodified-SVG export commit requires its own workflow result.
