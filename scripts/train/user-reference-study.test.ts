import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertUserReferenceStudy,type UserReferenceStudy} from './user-reference-study';
const fixture=():UserReferenceStudy=>JSON.parse(readFileSync('data/research/training/user-reference-study-v1.json','utf8'));
test('keeps source screenshots in one explicit group with bounded, identified crops',()=>{
 const s=fixture(),before=structuredClone(s);assert.doesNotThrow(()=>assertUserReferenceStudy(s));assert.deepEqual(s,before);
 assert.equal(s.sources.length,5);assert.equal(s.crops.length,9);
});
test('rejects missing authorization, unknown sources, duplicate crop IDs and out-of-image crops',()=>{
 for(const mutate of [(s:UserReferenceStudy)=>s.authorizationEvidence='',(s:UserReferenceStudy)=>s.crops[0].sourceId='unknown',
  (s:UserReferenceStudy)=>s.crops[1].id=s.crops[0].id,(s:UserReferenceStudy)=>s.crops[0].box.width=10000]){
  const s=fixture();mutate(s);assert.throws(()=>assertUserReferenceStudy(s),/invalid-manifest/);
 }
});
