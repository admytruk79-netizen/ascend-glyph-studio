/**
 * Stream analyzed research from Neon to the existing provenance-aware NDJSON
 * exporter. Read-only, bounded batches; no image bytes or original motifs.
 *
 * DATABASE_URL=... npx tsx scripts/corpus/export-visual-learning-from-neon.ts
 * Then: CORPUS_MASTER_IN=data/research/neon-analysis.ndjson
 *       npx tsx scripts/corpus/export-visual-learning.ts
 */
import {Client} from "pg";
import {createWriteStream,mkdirSync} from "node:fs";
import {once} from "node:events";

const out=process.env.CORPUS_NEON_OUT??"data/research/neon-analysis.ndjson";
const batchSize=500;
async function main(){
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL required");
 mkdirSync(out.slice(0,out.lastIndexOf("/"))||".",{recursive:true});
 const db=new Client({connectionString:process.env.DATABASE_URL});
 await db.connect();
 const stream=createWriteStream(out,{flags:"w"});
 let cursor="",total=0;
 try{
  while(true){
   const result=await db.query(`
    SELECT a.id,a.source_key AS source,a.source_url AS "objectURL",
      a.image_url AS image,a.tradition,a.dhash,a.features,
      a.deconstruction,a.analyzer_version AS "analyzerVersion",
      a.split,o.accession,o.cultural_access AS "culturalAccess",
      o.rights,o.source_url AS "objectSourceURL"
    FROM research_corpus_analysis a
    INNER JOIN research_corpus_object o ON o.id=a.id
    WHERE a.id>$1 AND a.features IS NOT NULL
      AND a.deconstruction IS NOT NULL
      AND a.dhash IS NOT NULL AND a.analyzer_version IS NOT NULL
      AND a.image_url IS NOT NULL
      AND a.split IN ('train','validation','holdout')
      AND COALESCE(lower(o.cultural_access),'') NOT IN
       ('review','restricted','structure-excluded','no-access','sacred','ceremonial','funerary')
    ORDER BY a.id LIMIT $2`,[cursor,batchSize]);
   if(!result.rows.length)break;
   for(const row of result.rows){
    // Only retain rows with independent provenance and a source URL.
    if(!row.objectURL||!row.objectSourceURL)continue;
    if(!stream.write(JSON.stringify(row)+"\n"))await once(stream,"drain");
    total++;
   }
   cursor=result.rows[result.rows.length-1].id;
  }
  stream.end();await once(stream,"finish");
  console.log(JSON.stringify({exported:total,path:out}));
 }finally{await db.end();if(!stream.writableEnded)stream.destroy();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
