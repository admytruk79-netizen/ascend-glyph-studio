# Floral reconstruction sources from Neon

Read-only inspection on 2026-10-12 used project `spring-mode-77399290` (`ascend-glyph-studio`), branch `br-long-truth-b44dfd3m` (`production`), database `neondb`. No database writes, migrations, model rebuilds or new training jobs were performed.

The database contains 80,073 source objects, 71,219 analysis records, 31,667 tagged images, 24 corpus-canonical records and five learned-model rows. These are table counts, not independently verified training examples or proof of successful training. Existing machine floral scores >=0.5 identify 284 records tagged Ukrainian and 413 tagged English. Cultural labels require review: the Ukrainian group includes William Morris's Rose Wreath and a Chinese embroidered screen.

The identified importer defect is concrete: Commons category/search traversal emitted `culture: COUNTRY[tradition]` and `region: COUNTRY[tradition]`, even for generic categories such as Embroidery. In Neon, both unrelated examples retained query group Ukrainian and raw culture Ukraine. The repository fix stops inventing those culture/region fields. The profile classifier also ignores the known legacy query-injected country values for Commons rows, while retaining title evidence and distinct region descriptions. Bare retrieval labels remain explicitly marked `(by query)`. This does not repair existing Neon records or recompute stored models.

The source shortlist in `data/research/motif-annotations/neon-ukrainian-floral-shortlist.json` retains 12 records explicitly titled Мотиви українського орнаменту, 1902, with stored creator Nikolai Samokysh. They were selected from the database, not introduced through an unrelated museum search. Three images were downloaded using those records' image URLs and visually inspected:

- `commons-96737753`, plate 37: continuous branching band, a large radial flower with interior petal regions, drooping bell-like flowers, buds, small rounded flowers and leaves. Useful for compound flower/connector decomposition and varied size hierarchy.
- `commons-96737646`, plate 6: two branching sprays with mixed flower forms, terminal berries/buds, herringbone/chevron-like petal interiors and pronounced stem hierarchy. Useful for separating outer envelopes from internal articulation.
- `commons-96737731`, plate 27: two vase/bouquet compositions with layered flowers and elongated leaves, plus an undulating floral border below. Useful for macro-region separation, nested centres, branch attachments and flower/leaf spacing.

These are observations, not botanical identifications, verified iconographic meanings or extracted graph geometry. Download hashes and proposed decomposition targets are retained with the shortlist. A source-only gallery is available locally at `artifacts/motif-reconstruction/neon-floral-study/source-gallery.svg`.

Neon declares the selected records public domain, and their catalogue titles state publication in 1902. Live Commons API and file-page requests returned HTTP 403, preventing independent licence-page verification in this session. Images were examined locally for this requested study; source images were not committed and no permission-verified MotifGraph fixture was admitted based solely on the database label. This is an actual Neon source study and an attribution fix, not a claim of completed historical reconstruction.

Verification: `tsx --test scripts/corpus/*.test.ts` passed all 43 corpus tests. New controls confirm that an Embroidery retrieval category cannot manufacture Ukraine as culture/region, that legacy William Morris/Chinese screen records are not classified Ukrainian, and that the explicitly titled Ukrainian ornament plates remain classified Ukrainian. Existing cultural structure-only rules are preserved. Engine geometry and manufacturing code were unchanged.

Reproduce the core shortlist with a read-only query:

```sql
SELECT o.id,o.title,o.creator,o.date_label,o.rights,o.cultural_access,
       o.source_url,o.image_url,t.tags->>'floral' AS floral_score
FROM research_corpus_object o
LEFT JOIN research_image_tag t ON t.object_id=o.id
WHERE o.title ILIKE '%Мотиви українського орнаменту%'
ORDER BY (t.tags->>'floral')::numeric DESC NULLS LAST,o.id
LIMIT 12;
```

Next reconstruction work should use these source-linked structures, after per-source rights verification: segment the flower and stem units, retain colour/texture layers, annotate contacts and gaps, recover the border/bouquet grammar, and compare with an independently reviewed reference. Do not substitute the contaminated tradition labels or pooled pending corpus-canonical candidates for canonical ASCEND geometry.
