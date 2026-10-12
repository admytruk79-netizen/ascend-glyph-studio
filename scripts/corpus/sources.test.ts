import test from 'node:test';
import assert from 'node:assert/strict';
import {ADAPTERS} from './sources.ts';
import {traditionOf} from './profiles.ts';
test('Commons category traversal does not manufacture country attribution',async()=>{
 const adapter=ADAPTERS.find(a=>a.source==='commons')!;
 const fetchJson=async()=>({query:{pages:{'1':{pageid:1,ns:6,title:'File:Chinese embroidery.jpg',imageinfo:[{mime:'image/jpeg',url:'https://example.org/reference.jpg',width:1200,height:1200,extmetadata:{ObjectName:{value:'Chinese embroidered screen'},LicenseShortName:{value:'Public domain'}}}]}}}});
 const rows=[];for await(const r of adapter.search({q:'Embroidery',tradition:'Ukrainian'},fetchJson))rows.push(r);
 assert.equal(rows.length,1);assert.equal(rows[0].culture,undefined);assert.equal(rows[0].region,undefined);
 assert.equal(rows[0].tradition,'Ukrainian'); // Retained retrieval hint, not catalogue attribution.
 assert.equal(traditionOf(rows[0]),'Other');
});
