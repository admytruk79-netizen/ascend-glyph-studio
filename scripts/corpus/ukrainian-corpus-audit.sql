-- Read-only audit. Never infer ethnicity from a motif or a filename alone.
-- Finds Ukrainian provenance in both the object and analysis layers.
WITH candidates AS (
 SELECT o.id,o.source_key,o.title,o.region,o.tradition AS object_tradition,
        a.tradition AS analysis_tradition,a.split,a.deconstruction IS NOT NULL AS deconstructed,
        o.rights,o.cultural_access,
        CASE
          WHEN lower(coalesce(o.tradition,'')) IN ('ukraine','ukrainian') OR lower(coalesce(a.tradition,'')) IN ('ukraine','ukrainian') THEN 'explicit-tradition'
          WHEN lower(coalesce(o.region,'')) LIKE '%ukrain%' OR lower(coalesce(o.region,'')) LIKE '%poltav%' OR lower(coalesce(o.region,'')) LIKE '%bukov%' OR lower(coalesce(o.region,'')) LIKE '%hutsul%' OR lower(coalesce(o.region,'')) LIKE '%pokutt%' OR lower(coalesce(o.region,'')) LIKE '%slobozh%' OR lower(coalesce(o.region,'')) LIKE '%borshch%' THEN 'regional-review'
          WHEN lower(coalesce(o.title,'')) LIKE '%ukrain%' OR lower(coalesce(o.title,'')) LIKE '%vyshyv%' OR lower(coalesce(o.title,'')) LIKE '%rushnyk%' THEN 'title-review'
          ELSE NULL END AS evidence
 FROM research_corpus_object o
 LEFT JOIN research_corpus_analysis a ON a.id=o.id
)
SELECT evidence,source_key,coalesce(object_tradition,analysis_tradition,'unattributed') AS label,
       count(*) AS objects,
       count(*) FILTER (WHERE deconstructed) AS analyzed,
       count(*) FILTER (WHERE split='train' AND deconstructed) AS train,
       count(*) FILTER (WHERE split='validation' AND deconstructed) AS validation,
       count(*) FILTER (WHERE split='holdout' AND deconstructed) AS holdout
FROM candidates WHERE evidence IS NOT NULL
GROUP BY evidence,source_key,coalesce(object_tradition,analysis_tradition,'unattributed')
ORDER BY objects DESC;
