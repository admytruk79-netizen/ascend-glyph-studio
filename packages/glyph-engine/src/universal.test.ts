import test from "node:test";import assert from "node:assert/strict";
import {synthesizeUniversal} from "./universal";import {DEFAULT_GRAMMAR} from "./grammar";import type {SynthesisIntent} from "./core";
const base:SynthesisIntent={seed:"ascend-lineage-001",meanings:["lineage","guardian","ascent"],principleIds:["p-1","p-2"],density:"balanced",symmetry:"bilateral"};
test("universal synthesis is deterministic",()=>{const a=synthesizeUniversal(base,DEFAULT_GRAMMAR),b=synthesizeUniversal(base,DEFAULT_GRAMMAR);assert.equal(a.svg,b.svg);assert.deepEqual(a.recipe,b.recipe);assert.equal(a.viewBox,"0 0 1000 1000");});
test("universal synthesis is product independent",()=>{const a=synthesizeUniversal(base,DEFAULT_GRAMMAR);assert.ok(!("product" in a.recipe));assert.ok(!a.svg.includes("mm"));});
test("seed changes deterministic candidate",()=>{const a=synthesizeUniversal(base,DEFAULT_GRAMMAR),b=synthesizeUniversal({...base,seed:"ascend-lineage-002"},DEFAULT_GRAMMAR);assert.notEqual(a.id,b.id);});
test("recipe preserves evidence trace",()=>{const a=synthesizeUniversal(base,DEFAULT_GRAMMAR);assert.deepEqual(a.recipe.principleIds,base.principleIds);assert.ok(a.recipe.ruleIds.length>0);for(const x of a.features)assert.ok(x.ruleId);});
