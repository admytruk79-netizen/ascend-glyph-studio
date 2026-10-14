import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {it,expect} from 'vitest';
import {graphFromObservedAnnotations,type ObservedMotifAnnotations} from '../src/motif-observed-annotations';
import {profileMotifConstruction} from '../src/motif-construction-profile';
it('reconstructs a permitted serrated leaf with a spatially nested vein and no invented region',()=>{
 const a:ObservedMotifAnnotations=JSON.parse(readFileSync('../../data/research/motif-annotations/met-239343-leaf-v1.json','utf8'));
 const raw=readFileSync('../../data/research/motif-references/met-239343/source-original.jpg');
 expect(createHash('sha256').update(raw).digest('hex')).toBe(a.provenance.originalSha256);
 const p=profileMotifConstruction(graphFromObservedAnnotations(a,a.image.width));
 expect(p).toMatchObject({elementCount:2,closedContourCount:1,nestedRelationCount:1,declaredContactCount:0,unitCount:1,productionApproved:false});
 expect(p.sourceEvidence[0].regionalAttribution).toEqual({status:'unassigned'});
});
it('keeps the separate-source leaf/stem training attachment geometrically supported',()=>{
 const a:ObservedMotifAnnotations=JSON.parse(readFileSync('../../data/research/motif-annotations/met-239343-connected-leaf-v2.json','utf8'));
 const p=profileMotifConstruction(graphFromObservedAnnotations(a,a.image.width));
 expect(p).toMatchObject({elementCount:3,nestedRelationCount:1,declaredContactCount:1,unitCount:2,unitEdgeCount:1,connectedUnitComponents:1,productionApproved:false});
});
