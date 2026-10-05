import {strict as assert} from "node:assert";
import {evaluateProductionGate,ProductionSpecification} from "./production-contract";

const reference:ProductionSpecification={id:"generic-a5",revision:"0",productKind:"bound-object",process:"print",sourceId:"engine-reference",state:"reference"};
const a=evaluateProductionGate(reference,false);
assert.equal(a.productionApproved,false);
assert.ok(a.blockers.includes("manufacturer-validation-required"));
assert.ok(a.blockers.includes("physical-sample-validation-required"));

const manufacturer:ProductionSpecification={...reference,id:"maker-spec-42",revision:"3",manufacturerId:"maker-1",state:"manufacturer-validated"};
const b=evaluateProductionGate(manufacturer,true);
assert.equal(b.productionApproved,false);
assert.equal(b.state,"manufacturer-validated");

const approved:ProductionSpecification={...manufacturer,state:"production-validated"};
const c=evaluateProductionGate(approved,true);
assert.equal(c.productionApproved,true);
assert.deepEqual(c.blockers,[]);
