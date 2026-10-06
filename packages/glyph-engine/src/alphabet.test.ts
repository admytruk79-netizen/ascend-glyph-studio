import {strict as assert} from "node:assert";
import {ASCEND_NATIVE_ALPHABET,evaluateAlphabetPromotion,promoteAlphabetPrimitive,type AlphabetPrimitive} from "./alphabet";

assert.equal(ASCEND_NATIVE_ALPHABET.length,10);
assert.deepEqual(ASCEND_NATIVE_ALPHABET.map(x=>x.id),["seed","line","axis","torus","orbit","branch","crossing","opposition","radial-emission","void"]);
assert.equal(evaluateAlphabetPromotion(ASCEND_NATIVE_ALPHABET[0]!).eligible,false);

const evidence={sourceIds:Array.from({length:12},(_,i)=>`o${i}`),sourceGroups:["museum-a","museum-b","archive-c","museum-d"],regions:["Europe","Asia","Americas"],traditions:["t1","t2","t3","t4","t5"],confidence:.86,culturalRisk:"low" as const,directMotifSimilarity:.31};
const discovered:AlphabetPrimitive={id:"enclosure",label:"Enclosure",version:1,origin:"universal-discovered",state:"evidence-qualified",morphology:"enclosure",evidence};
assert.equal(evaluateAlphabetPromotion(discovered).eligible,true);
assert.equal(promoteAlphabetPrimitive(discovered,"human-review").state,"human-approved");
assert.equal(evaluateAlphabetPromotion({...discovered,evidence:{...evidence,culturalRisk:"review"}}).eligible,false);
assert.equal(evaluateAlphabetPromotion({...discovered,evidence:{...evidence,directMotifSimilarity:.9}}).eligible,false);
const evolved:AlphabetPrimitive={...discovered,id:"evolved-001",origin:"tesseract-evolved",parentIds:[]};
assert.match(evaluateAlphabetPromotion(evolved).reasons.join(","),/evolution lineage required/);
