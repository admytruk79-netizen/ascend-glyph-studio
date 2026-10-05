import {createReadStream} from "node:fs";
import {createInterface} from "node:readline";
import pg from "pg";
const {Pool}=pg;
const url=process.env.DATABASE_URL;
if(!url)throw new Error("DATABASE_URL required");
const input=process.env.CORPUS_IN??"data/research/corpus.ndjson";
const batchSize=Math.max(1,Number(process.env.CORPUS_DB_BATCH??250));
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false}});
type Row={id:string;source:string;tradition?:string;culturalAccess?:string;title?:string;creator?:string;date?:string;region?:string;material?:string;technique?:string;objectURL?:string;image?:string;rights?:string;accession?:string;reliability?:number;raw?:Record<string,unknown>};
async function write(rows:Row[]){if(!rows.length)return;const client=await pool.connect();try{await client.query("begin");for(const r of rows){await client.query(`insert into research_corpus_object(id,source_key,tradition,cultural_access,title,creator,date_label,region,material,technique,source_url,image_url,rights,accession,reliability,raw)
values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)
on conflict(id) do update set source_key=excluded.source_key,tradition=excluded.tradition,cultural_access=excluded.cultural_access,title=excluded.title,creator=excluded.creator,date_label=excluded.date_label,region=excluded.region,material=excluded.material,technique=excluded.technique,source_url=excluded.source_url,image_url=excluded.image_url,rights=excluded.rights,accession=excluded.accession,reliability=excluded.reliability,raw=excluded.raw`,[r.id,r.source,r.tradition??null,r.culturalAccess??"uncertain",r.title??r.id,r.creator??null,r.date??null,r.region??null,r.material??null,r.technique??null,r.objectURL??null,r.image??null,r.rights??null,r.accession??null,r.reliability??.5,JSON.stringify(r.raw??{})]);}await client.query("commit")}catch(e){await client.query("rollback");throw e}finally{client.release()}}
async function main(){const rl=createInterface({input:createReadStream(input),crlfDelay:Infinity});let batch:Row[]=[],n=0;for await(const line of rl){if(!line.trim())continue;batch.push(JSON.parse(line));if(batch.length>=batchSize){await write(batch);n+=batch.length;batch=[];console.log(JSON.stringify({imported:n}))}}await write(batch);n+=batch.length;const q=await pool.query("select * from research_integrity_summary");console.log(JSON.stringify({imported:n,integrity:q.rows[0]}));await pool.end()}
main().catch(async e=>{console.error(e);await pool.end();process.exitCode=1});
