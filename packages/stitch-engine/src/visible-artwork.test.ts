import {test} from 'node:test';import assert from 'node:assert/strict';import {prepareEmbroideryArtwork,digitizeArtworkPixels,tracePenroseEdges} from './visible-artwork.js';import {readDst} from './dst.js';
test('embroidery omits shaded tile fills but retains their edges and foreground',()=>{
 const svg='<svg><rect fill="#ffffff"/><polygon data-object="penrose:tile:0" fill="#aaaaaa"/><polyline data-object="penrose:edge:0" stroke="#bbbbbb"/><polygon data-object="flower" fill="#cc0000"/></svg>';
 const p=prepareEmbroideryArtwork(svg,[{kind:'fill',id:'penrose:tile:0',color:'#aaaaaa',polygon:[]},{kind:'run',id:'penrose:edge:0',color:'#bbbbbb',path:[]},{kind:'fill',id:'flower',color:'#cc0000',polygon:[]}]);
 assert.ok(!p.artwork.includes('penrose:tile'));assert.ok(!p.artwork.includes('<rect'));assert.ok(p.artwork.includes('penrose:edge'));assert.deepEqual(p.colors,['#bbbbbb','#cc0000']);assert.match(p.kindArtwork,/stroke="#000000"/);
});
test('resolved pixels remove hidden colour and produce independently decodable commands',()=>{
 const cols=30,rows=30,data=new Uint8Array(cols*rows*4),kind=new Uint8Array(data.length);
 for(let i=0;i<cols*rows;i++){data[i*4]=200;data[i*4+3]=255;kind[i*4]=255;kind[i*4+1]=255;kind[i*4+2]=255;kind[i*4+3]=255;}
 const p=digitizeArtworkPixels(data,kind,cols,rows,.2,['#c80000','#0000ff'],[]);assert.deepEqual(p.colors,['#c80000']);assert.equal(p.report.threadColors,1);assert.equal(p.report.stitchCount,readDst(p.dst).commands.filter(c=>c.cmd==='stitch').length);assert.ok(p.report.stitchedBoundsMm.width<=6);assert.equal(p.report.backgroundTilesSewn,false);
 assert.throws(()=>digitizeArtworkPixels(data,kind.subarray(4),cols,rows,.2,['#c80000'],[]));
});

test('shared Penrose edges become one traced network instead of duplicate triangle seams',()=>{
 const a={x:0,y:0},b={x:10,y:0},c={x:10,y:10},d={x:0,y:10};const traced=tracePenroseEdges([{kind:'run',id:'penrose:edge:0',color:'#a00',path:[a,b,c,a]},{kind:'run',id:'penrose:edge:1',color:'#a00',path:[a,c,d,a]}]);
 const keys:string[]=[];for(const o of traced){if(o.kind==='fill')throw Error();for(let i=1;i<o.path.length;i++)keys.push([JSON.stringify(o.path[i-1]),JSON.stringify(o.path[i])].sort().join('|'));}assert.equal(keys.length,5);assert.equal(new Set(keys).size,5);
});
