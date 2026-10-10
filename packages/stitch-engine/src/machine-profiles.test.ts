import {test} from 'node:test';import assert from 'node:assert/strict';import {checkMachineFit} from './machine-profiles.js';
test('machine field, actual hoop, format and budget remain separate checks',()=>{
 const actual=checkMachineFit('janome-mb7',166.2,237.4,139189);assert.equal(actual.fieldFit,true);assert.equal(actual.selectedHoopFit,null);assert.equal(actual.dstSupport,true);assert.equal(actual.stitchBudgetFit,null);assert.equal(actual.productionRelease,false);
 assert.equal(checkMachineFit('janome-mb7',180,250,139189).fieldFit,false);
 assert.equal(checkMachineFit('brother-pr1055x',166,237,500001).stitchBudgetFit,false);
 assert.equal(checkMachineFit('brother-pr1055x',166,237,139189,{width:100,height:100}).selectedHoopFit,false);
 const unknown=checkMachineFit('melco-bravo',166,237,139189);assert.equal(unknown.fieldFit,null);assert.equal(unknown.dstSupport,null);assert.throws(()=>checkMachineFit('invented',1,1,1));
});
