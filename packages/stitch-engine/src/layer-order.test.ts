import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plan,orderIndependentLayers,type DesignObject} from './plan.js';
import {recipes} from './recipes.js';
test('opt-in layer order preserves repeated colour passes and object order',()=>{
 const objects:DesignObject[]=[{kind:'fill',id:'foundation',color:'#a32235',polygon:[{x:0,y:0},{x:12,y:0},{x:12,y:12},{x:0,y:12}]},{kind:'fill',id:'petal',color:'#cf665c',polygon:[{x:2,y:2},{x:10,y:2},{x:10,y:10},{x:2,y:10}]},{kind:'fill',id:'inner',color:'#a32235',polygon:[{x:4,y:4},{x:8,y:4},{x:8,y:8},{x:4,y:8}]}];
 const recipe=recipes['linen-180-prewashed']!;
 const ordered=plan(objects,recipe,{preserveObjectOrder:true});assert.deepEqual(ordered.blocks.map(b=>b.objectId),objects.map(o=>o.id));assert.deepEqual(ordered.colors,['#a32235','#cf665c','#a32235']);assert.equal(ordered.commands.filter(c=>c.cmd==='color').length,2);
 const legacy=plan(objects,recipe);assert.deepEqual(legacy.colors,['#a32235','#cf665c']);assert.deepEqual(legacy.blocks.map(b=>b.objectId),['foundation','inner','petal']);
});

test('independent-layer scheduling keeps every overlapping pair in paint order',()=>{
 const objects:DesignObject[]=Array.from({length:3},(_,i)=>[{kind:'fill' as const,id:`base-${i}`,color:'red',polygon:[{x:i*20,y:0},{x:i*20+10,y:0},{x:i*20+10,y:10},{x:i*20,y:10}]},{kind:'fill' as const,id:`core-${i}`,color:'gold',polygon:[{x:i*20+3,y:3},{x:i*20+7,y:3},{x:i*20+7,y:7},{x:i*20+3,y:7}]}]).flat();
 const before=structuredClone(objects),ordered=orderIndependentLayers(objects),ids=ordered.map(o=>o.id);
 for(let i=0;i<3;i++)assert.ok(ids.indexOf(`base-${i}`)<ids.indexOf(`core-${i}`));
 assert.deepEqual(ordered.map(o=>o.color),['red','red','red','gold','gold','gold']);assert.deepEqual(objects,before);
});
