import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../src/motif-observed-annotations';
import {connectedMotifFixture} from '../src/motif-fixtures';
import {identityMotifTransform} from '../src/motif-graph';
import {profileMotifConstruction} from '../src/motif-construction-profile';
const fixture=(file:string)=>JSON.parse(readFileSync('../../data/research/motif-annotations/'+file,'utf8')) as ObservedMotifAnnotations;
const graph=(file:string)=>graphFromObservedAnnotations(fixture(file),1280);
describe('declared motif construction profiles',()=>{
 it('keeps the branch skeleton stable when plate 37 gains eight petal interiors',()=>{
  const before=profileMotifConstruction(graph('neon-plate37-connected-floral-v1.json'));
  const after=profileMotifConstruction(graph('neon-plate37-connected-floral-v2.json'));
  expect(after.elementCount-before.elementCount).toBe(8);
  expect(after.closedContourCount-before.closedContourCount).toBe(8);
  expect(after.unitDegrees).toEqual(before.unitDegrees);
  expect(after).toMatchObject({unitCount:9,unitEdgeCount:8,connectedUnitComponents:1,unitContactCycleRank:0,maxUnitDegree:3,terminalUnitCount:3});
 });
 it('describes the partial plate 27 bouquet with a stronger trunk and deeper nesting',()=>{
  const a=fixture('neon-plate27-bouquet-v1.json');
  expect(createHash('sha256').update(readFileSync('../../data/research/motif-references/commons-96737731/source.jpg')).digest('hex')).toBe(a.provenance.originalSha256);
  const g=graphFromObservedAnnotations(a,1280),before=structuredClone(g),profile=profileMotifConstruction(g);
  expect(profile).toMatchObject({elementCount:14,unitCount:8,unitEdgeCount:7,connectedUnitComponents:1,terminalUnitCount:4,maxUnitDegree:4,nestedRelationCount:6,maximumAssemblyNestingDepth:2,unitContactCycleRank:0});
  expect(g).toEqual(before);expect(profileMotifConstruction(g)).toEqual(profile);
  expect(profile.sourceEvidence[0].culturalContext).toContain('Ukrainian');
  expect(profile.historicalGrammarVerified).toBe(false);expect(profile.productionApproved).toBe(false);
 });
 it('rejects a broken branch and a retraced unsupported contact',()=>{
  const broken=graph('neon-plate27-bouquet-v1.json');broken.nodes.find(n=>n.id==='element:stem-centre')!.transform.xMm+=3;
  expect(()=>profileMotifConstruction(broken)).toThrow('invalid-reference');
  const g=graph('neon-plate27-bouquet-v1.json');
  // Two stems share a root. Explicitly declaring this further contact creates a
  // triangle in the unit adjacency graph; it does not create a new closed path.
  const n=g.nodes.find(n=>n.id==='element:stem-lower-left')!;
  const main=g.nodes.find(n=>n.id==='element:stem-main')!;
  n.geometry!.paths[0].unshift(...main.geometry!.paths[0].slice(0,2));n.geometry!.ports.extra={x:952,y:470};
  g.relations.push({kind:'junction',from:n.id,fromPort:'extra',to:'element:stem-centre',toPort:'base',toleranceMm:0});
  // This extra stem would retrace another element and violates clearance.
  expect(()=>profileMotifConstruction(g)).toThrow('invalid-reference');
 });
 it('counts an independently authored triangle as a unit-network cycle, not three closed contour paths',()=>{
  const g=connectedMotifFixture();g.nodes=g.nodes.slice(0,2);g.negativeSpace=[];g.relations=[];g.minGapMm=0;
  const paths=[[{x:10,y:10},{x:20,y:10}],[{x:20,y:10},{x:15,y:20}],[{x:15,y:20},{x:10,y:10}]];
  paths.forEach((path,i)=>{const base={provenanceId:g.provenance[0].id,confidence:1,evidence:['authored triangle network control'],transform:identityMotifTransform()};
   g.nodes.push({...structuredClone(base),id:`unit${i}`,kind:'assembly',parentId:'field'},
    {...structuredClone(base),id:`edge${i}`,kind:'element',parentId:`unit${i}`,geometry:{namespace:'reference',paths:[path],ports:{start:path[0],end:path[1]}}});
   g.relations.push({kind:'junction',from:`edge${i}`,fromPort:'end',to:`edge${(i+1)%3}`,toPort:'start',toleranceMm:0});
  });
  g.provenance[0].source='fixture://unit-triangle-v1';g.provenance[0].originalSha256=createHash('sha256').update(JSON.stringify(g.nodes)).digest('hex');
  expect(profileMotifConstruction(g)).toMatchObject({unitCount:3,unitEdgeCount:3,connectedUnitComponents:1,unitContactCycleRank:1,closedContourCount:0,terminalUnitCount:0});
 });

});
