import {test} from 'node:test';import assert from 'node:assert/strict';import {digitizeVisibleMask} from './visible-mask.js';import {readDst} from './dst.js';
test('visible mask stitches only the assigned colour and never bridges a cut-out',()=>{
 const cols=60,rows=40,mm=.2,mask=new Int16Array(cols*rows).fill(0);for(let y=0;y<rows;y++)for(let x=24;x<36;x++)mask[y*cols+x]=-1;
 const p=digitizeVisibleMask(mask,cols,rows,mm,['#a00']);assert.ok(p.report.stitchCount>100);assert.equal(p.report.stitchCount,readDst(p.dst).commands.filter(c=>c.cmd==='stitch').length);
 for(const block of p.blocks)for(const run of block.runs)for(let i=1;i<run.length;i++){const a=run[i-1]!,b=run[i]!;assert.ok(!(Math.min(a.x,b.x)<4.8&&Math.max(a.x,b.x)>7.2));assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<=2.5+1e-8);}
});
test('mask rejects invalid indices and exposes genuine colour stops',()=>{
 assert.throws(()=>digitizeVisibleMask(new Int16Array([3]),1,1,.2,['#a00']));const m=new Int16Array(400);for(let i=200;i<400;i++)m[i]=1;const p=digitizeVisibleMask(m,20,20,.2,['#a00','#0a0']);assert.equal(p.report.colorChanges,1);assert.equal(p.report.threadColors,2);
});
