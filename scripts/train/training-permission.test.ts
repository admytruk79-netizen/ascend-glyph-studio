import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingPermissions,requireTrainingSource,trainingRecordEligible,type TrainingPermissionManifest} from './training-permission.ts';
import {traditionOf} from '../corpus/profiles.ts';
const manifest=():TrainingPermissionManifest=>({schema:'ascend.training-permission-manifest.v1',entries:[{id:'x',source:'fixture://x',sourceGroup:'author-x',imageSha256:'a'.repeat(64),permission:{status:'approved',scope:'local-reference-model-experiment',basis:'owned-authorized',evidence:'Repository-authored control'}}]});
test('training requires explicit permission, bounded scope and the approved image hash',()=>{
 const p=trainingPermissions(manifest());assert.equal(requireTrainingSource(p,'x','a'.repeat(64)).sourceGroup,'author-x');
 assert.throws(()=>requireTrainingSource(p,'unknown'),/not-approved/);assert.throws(()=>requireTrainingSource(p,'x','b'.repeat(64)),/hash-mismatch/);
 for(const alter of [(m:any)=>m.entries[0].permission.status='unknown',(m:any)=>m.entries[0].permission.scope='production',(m:any)=>m.entries[0].permission.evidence=' ']){
  const m=manifest();alter(m);assert.throws(()=>trainingPermissions(m),/permission-entry/);
 }
});
test('missing source/access/split cannot become open training data and legacy attribution stays filtered',()=>{
 const p=trainingPermissions(manifest());
 const r={id:'x',source:'commons',culturalAccess:'open',split:'train',tradition:'Ukrainian',culture:'Ukraine',region:'Ukraine',title:'Rose Wreath (Cooper Hewitt)'};
 assert.equal(trainingRecordEligible(r,p),true);assert.equal(traditionOf(r),'Other');
 for(const patch of [{source:undefined},{culturalAccess:undefined},{split:undefined},{split:'holdout'},{id:'unapproved'}])assert.equal(trainingRecordEligible({...r,...patch},p),false);
});
test('duplicate source IDs are rejected and caller mutation cannot change the approved map',()=>{
 const m=manifest(),p=trainingPermissions(m);m.entries[0].imageSha256='b'.repeat(64);assert.equal(requireTrainingSource(p,'x').imageSha256,'a'.repeat(64));
 const duplicate=manifest();duplicate.entries.push(duplicate.entries[0]);assert.throws(()=>trainingPermissions(duplicate),/permission-entry/);
});
