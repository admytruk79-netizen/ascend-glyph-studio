import {describe,it,expect} from "vitest";
import {reserveBranchLeafDiagnosticCandidates} from "../src/experimental-candidate-sampling";
type Candidate={id:string;score:number;productionObjects:{branchLeaf?:{role:"stem"|"leaf"}}[]};
const plain=(id:string,score:number):Candidate=>({id,score,productionObjects:[{}]});
const cluster=(id:string,score:number):Candidate=>({id,score,
 productionObjects:[{branchLeaf:{role:"stem"}}]});
describe("opt-in branch leaf diagnostic sampling",()=>{
 it("replaces the lowest scored non-cluster candidates without changing scores",()=>{
  const selected=[plain("a",9),plain("b",8),plain("c",7),plain("d",6)];
  const pool=[...selected,cluster("e",2),cluster("f",3)];
  const result=reserveBranchLeafDiagnosticCandidates(selected,pool,4,2);
  expect(result.map(x=>x.id)).toEqual(["a","b","f","e"]);
  expect(result.filter(x=>x.productionObjects.some(o=>o.branchLeaf)).length).toBe(2);
  expect(result.find(x=>x.id==="e")?.score).toBe(2);
  expect(selected.map(x=>x.id)).toEqual(["a","b","c","d"]);
 });
 it("does not invent clusters or duplicate already selected designs",()=>{
  const selected=[cluster("a",4),plain("b",3)];
  expect(reserveBranchLeafDiagnosticCandidates(selected,selected,2,2)).toEqual(selected);
  expect(reserveBranchLeafDiagnosticCandidates([plain("x",1)],[plain("x",1)],1)).toEqual([plain("x",1)]);
  expect(reserveBranchLeafDiagnosticCandidates(selected,selected,0)).toEqual([]);
 });
 it("only admits structurally valid supplied candidates, not arbitrary artwork",()=>{
  const selected=[plain("a",10),plain("b",9)];
  const valid=[...selected,cluster("c",1)];
  const result=reserveBranchLeafDiagnosticCandidates(selected,valid,2,2);
  expect(result.map(x=>x.id)).toEqual(["a","c"]);
  expect(result.every(x=>valid.some(y=>y.id===x.id))).toBe(true);
 });
});
