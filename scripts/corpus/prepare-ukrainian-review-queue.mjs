/**
 * Build a non-admitting human review queue from a read-only Neon metadata export.
 * Catalog rights/access and a Ukrainian search label are never approval evidence.
 * No network access, image fetching, training or database writes.
 *
 * CORPUS_REVIEW_IN=/path/to/metadata.ndjson
 * CORPUS_REVIEW_OUT=/path/to/review-queue.json
 * node scripts/corpus/prepare-ukrainian-review-queue.mjs
 */
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const str = value => typeof value === 'string' ? value.trim() : '';
const stable = (a,b) => a.sourceKey.localeCompare(b.sourceKey) || a.objectId.localeCompare(b.objectId);

export function buildReviewQueue(rawRecords) {
  if (!Array.isArray(rawRecords)) throw Error('Expected metadata records array');
  const seenIds = new Set(), sourceUrls = new Map(), imageUrls = new Map();
  const records = [], rejected = [];
  for (const [index,raw] of rawRecords.entries()) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      rejected.push({line:index+1,reason:'invalid-record'}); continue;
    }
    const objectId = str(raw.id), sourceKey = str(raw.source_key);
    if (!objectId || !sourceKey) {
      rejected.push({line:index+1,reason:'missing-object-id-or-source-key'}); continue;
    }
    if (seenIds.has(objectId)) {
      rejected.push({line:index+1,objectId,reason:'duplicate-object-id'}); continue;
    }
    seenIds.add(objectId);
    // Validation/holdout are never included in a train-split review queue.
    if (raw.split !== 'train') {
      rejected.push({line:index+1,objectId,reason:'not-train-split'}); continue;
    }
    const tradition = str(raw.tradition);
    if (!/ukrain/i.test(tradition)) {
      rejected.push({line:index+1,objectId,reason:'outside-ukrainian-attributed-search'}); continue;
    }
    const sourceUrl = str(raw.source_url), imageUrl = str(raw.image_url);
    const flags = ['independent-ukrainian-attribution-required',
      'independent-rights-review-required', 'independent-cultural-review-required',
      'image-subject-review-required', 'object-family-and-image-hash-check-required'];
    if (!/^https:\/\//i.test(sourceUrl)) flags.push('missing-or-non-https-source-url');
    if (!/^https:\/\//i.test(imageUrl)) flags.push('missing-or-non-https-image-url');
    if (str(raw.cultural_access).toLowerCase() !== 'open') flags.push('catalog-access-not-open');
    if (!str(raw.rights)) flags.push('catalog-rights-unrecorded');
    const normalizedSource = sourceUrl.toLowerCase();
    const normalizedImage = imageUrl.toLowerCase();
    if (sourceUrl && sourceUrls.has(normalizedSource)) flags.push('duplicate-source-url:'+sourceUrls.get(normalizedSource));
    if (imageUrl && imageUrls.has(normalizedImage)) flags.push('duplicate-image-url:'+imageUrls.get(normalizedImage));
    if (sourceUrl && !sourceUrls.has(normalizedSource)) sourceUrls.set(normalizedSource,objectId);
    if (imageUrl && !imageUrls.has(normalizedImage)) imageUrls.set(normalizedImage,objectId);
    records.push({objectId,sourceKey,title:str(raw.title),traditionLabel:tradition,
      sourceUrl,imageUrl,catalogRightsLabel:str(raw.rights),catalogCulturalAccess:str(raw.cultural_access),
      analysisKind:str(raw.kind),split:'train',flags,
      review:{attribution:'pending',rights:'pending',cultural:'pending',imageSubject:'pending',
        reviewer:null,reviewedAt:null,objectFamilyId:null,imageSha256:null,evidenceNotes:null},
      approvedForTraining:false});
  }
  records.sort(stable);
  return {schema:'ascend.corpus-human-review-queue.v1',status:'review-only-not-admitted',
    manufacturerValidated:false,physicallyValidated:false,
    warning:'Catalog labels, search attribution and image analysis do not establish independent rights, Ukrainian attribution or cultural approval.',
    counts:{input:rawRecords.length,queued:records.length,rejected:rejected.length},records,rejected};
}

async function main() {
  const input = process.env.CORPUS_REVIEW_IN;
  if (!input) throw Error('Set CORPUS_REVIEW_IN to a read-only metadata NDJSON export');
  const output = resolve(process.env.CORPUS_REVIEW_OUT ?? 'data/research/ukrainian-review-queue.json');
  const max = Number(process.env.CORPUS_REVIEW_LIMIT ?? 10000);
  if (!Number.isInteger(max) || max < 1 || max > 100000) throw Error('Invalid CORPUS_REVIEW_LIMIT');
  const rows = [];
  for await (const line of createInterface({input:createReadStream(input),crlfDelay:Infinity})) {
    if (!line.trim()) continue;
    if (rows.length >= max) throw Error('Metadata export exceeds CORPUS_REVIEW_LIMIT');
    rows.push(JSON.parse(line));
  }
  const queue = buildReviewQueue(rows);
  await mkdir(dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify(queue,null,2)+'\n');
  console.log(JSON.stringify({output,counts:queue.counts,status:queue.status}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error=>{console.error(error);process.exitCode=1});
}
