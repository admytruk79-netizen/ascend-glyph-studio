# Generation Pipeline

The general engine now emits a persistence-ready envelope in the same operation that generates an artifact.

`generateForPersistence(seed, substrate, microPerNode, sleeveMode)`:
1. builds the canonical meaning graph;
2. creates the substrate-specific Tesseract artifact;
3. creates paired sleeve projections for garments;
4. serializes graph, multiscale field, SVG, projection metadata and sleeve records into the database persistence contract.

This removes the architectural gap between generation and persistence. A database adapter can write the returned bundle transactionally once the target schema is confirmed.

Neon application remains blocked only by unavailable live database access in the current session; migration 007 remains staged and must not be represented as applied.
