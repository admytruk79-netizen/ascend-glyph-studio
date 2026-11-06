import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReviewQueue} from '../scripts/corpus/prepare-ukrainian-review-queue.mjs';
const row = (id,override={}) => ({id,source_key:'commons',tradition:'Ukrainian',split:'train',title:'Embroidery',rights:'Public domain',cultural_access:'open',source_url:`https://example.org/${id}`,image_url:`https://images.example.org/${id}`,kind:'field',...override});
test('catalog public domain and open access never grant approval',()=>{
 const q=buildReviewQueue([row('a')]);
 assert.equal(q.status,'review-only-not-admitted');
 assert.equal(q.records[0].approvedForTraining,false);
 assert.equal(q.records[0].review.rights,'pending');
 assert.equal(q.records[0].review.cultural,'pending');
 assert.equal(q.records[0].review.attribution,'pending');
 assert.ok(q.records[0].flags.includes('independent-ukrainian-attribution-required'));
});
test('validation and holdout are rejected from the training queue',()=>{
 const q=buildReviewQueue([row('a',{split:'validation'}),row('b',{split:'holdout'}),row('c')]);
 assert.deepEqual(q.records.map(x=>x.objectId),['c']);
 assert.equal(q.counts.rejected,2);
});
test('ambiguous metadata is flagged, never silently accepted',()=>{
 const q=buildReviewQueue([row('b',{source_url:'',image_url:'http://example.org/image',rights:'',cultural_access:'restricted'})]);
 const flags=q.records[0].flags;
 for(const name of ['missing-or-non-https-source-url','missing-or-non-https-image-url','catalog-access-not-open','catalog-rights-unrecorded']) assert.ok(flags.includes(name));
});
test('duplicate IDs are rejected and repeated URLs are flagged',()=>{
 const q=buildReviewQueue([row('a'),row('b',{source_url:'https://example.org/a'}),row('a')]);
 assert.equal(q.counts.rejected,1);
 assert.ok(q.records.find(x=>x.objectId==='b').flags.includes('duplicate-source-url:a'));
});
test('unrelated tradition is excluded and ordering deterministic',()=>{
 const q=buildReviewQueue([row('z'),row('x',{tradition:'Erzyan'}),row('a')]);
 assert.deepEqual(q.records.map(x=>x.objectId),['a','z']);
});
