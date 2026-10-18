import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {composeDetailedMotifParts,type MotifPartLibrary} from '../src/motif-part-composer';
import {ACTIVE_VINE_STUDY,PLATE37_VINE_STUDY,vineStudyAnnotations} from '../src/vine-construction-study';
import {graphFromObservedAnnotations} from '../src/motif-observed-annotations';
import {measureMotifStructure} from '../src/motif-reconstruction';
import {measureMotifClearance} from '../src/motif-clearance';
import {createHash} from 'node:crypto';
import {NEON_MOTIF_SELECTION} from '../src/neon-motif-selection';
import {ASCEND_PRIMITIVES} from '../src/ascend-primitives';
const library:MotifPartLibrary=JSON.parse(readFileSync('../../data/research/motif-parts-v1/library.json','utf8'));
const input={widthMm:250,heightMm:80,complexity:.8,family:'floral' as const,seed:0};
it('reconstructs the annotated macro topology and detects broken relationships',()=>{
 const graph=graphFromObservedAnnotations(vineStudyAnnotations(PLATE37_VINE_STUDY),1280),structure=measureMotifStructure(graph);
 expect(structure.junctionCount).toBe(12);expect(structure.brokenJunctions).toBe(0);expect(measureMotifClearance(graph).portsOffPath).toEqual([]);
 const broken=structuredClone(graph);broken.nodes.find(n=>n.id==='element:branch-radial')!.transform.xMm=3;expect(measureMotifStructure(broken).brokenJunctions).toBeGreaterThan(0);
});
it('generates a flowing source-guided field without mutating sources or claiming original source geometry or stitches',()=>{
 const raw=JSON.stringify(library),canonical=structuredClone(ASCEND_PRIMITIVES),study=JSON.stringify(PLATE37_VINE_STUDY),r=composeDetailedMotifParts(library,input,PLATE37_VINE_STUDY);
 expect(r.constructionStudy).toBe(PLATE37_VINE_STUDY.id);expect(r.placements.filter(p=>p.id.startsWith('vine-')&&p.kind==='flower')).toHaveLength(6);
 expect(r.structure.brokenJunctions).toBe(0);expect(r.checks).toEqual({leafFlowerOverlaps:[],outsideEnvelope:0});expect(r.contourRefinement?.maskRoundtripExact).toBe(false);expect(r.contourRefinement!.removedLoops).toBeGreaterThan(100);
 expect(r.graph.provenance.some(p=>p.id===PLATE37_VINE_STUDY.provenance.id)).toBe(true);expect(r.svg.includes('contemporary red-black palette')).toBe(true);expect(r.svg).not.toMatch(/<image|data:image/);
 expect(r.stitchCount).toBeNull();expect(r.productionApproved).toBe(false);expect(JSON.stringify(library)).toBe(raw);expect(JSON.stringify(PLATE37_VINE_STUDY)).toBe(study);expect(ASCEND_PRIMITIVES).toEqual(canonical);
 const same=composeDetailedMotifParts(library,input,PLATE37_VINE_STUDY),other=composeDetailedMotifParts(library,{...input,seed:7},PLATE37_VINE_STUDY);expect(same.svg).toBe(r.svg);expect(other.svg).not.toBe(r.svg);expect(other.structure.brokenJunctions).toBe(0);expect(other.checks.outsideEnvelope).toBe(0);
});
it('rejects unsupported source studies and bad raw source ports before any refinement',()=>{
 const bad=structuredClone(PLATE37_VINE_STUDY);bad.heads[0]!.branchVertex=999;expect(()=>composeDetailedMotifParts(library,input,bad)).toThrow('vine-study:head');
 const denied=structuredClone(PLATE37_VINE_STUDY);denied.provenance.permission.status='unknown';expect(()=>composeDetailedMotifParts(library,input,denied)).toThrow('vine-study:invalid');
 const raw=structuredClone(library);raw.pieces[0]!.ports.base.point={x:-20,y:-20};expect(()=>composeDetailedMotifParts(raw,input,PLATE37_VINE_STUDY)).toThrow('port-off-path');
});

it('applies the trained descriptor selector without confusing it with artistic training',()=>{
 const report=readFileSync('../../data/research/neon-source-intake/training-run/report.json');expect(NEON_MOTIF_SELECTION.trainingReportSha256).toBe(createHash('sha256').update(report).digest('hex'));expect(NEON_MOTIF_SELECTION.sourceCount).toBeGreaterThan(2);expect(NEON_MOTIF_SELECTION.artisticQualityModelTrained).toBe(false);
 const a=structuredClone(NEON_MOTIF_SELECTION),b=structuredClone(a);for(const id of Object.keys(a.weights)){a.weights[id]=id==='flower-gold'?1e8:1e-8;b.weights[id]=id==='flower-blue'?1e8:1e-8;}
 const first=composeDetailedMotifParts(library,input,PLATE37_VINE_STUDY,a),second=composeDetailedMotifParts(library,input,PLATE37_VINE_STUDY,b);expect(first.placements[0]!.partId).toBe('flower-gold');expect(second.placements[0]!.partId).toBe('flower-blue');expect(first.svg===second.svg).toBe(false);expect(first.learnedModelApplied).toBe(true);expect(first.productionApproved).toBe(false);
 const bad=structuredClone(a);bad.weights['flower-gold']=-1;expect(()=>composeDetailedMotifParts(library,input,PLATE37_VINE_STUDY,bad)).toThrow('motif-selection:weight');
});

it('integrates all source roles in the dense plate 31 study with clean connections',()=>{
 const dense:MotifPartLibrary=JSON.parse(readFileSync('../../data/research/motif-parts-v2/library.json','utf8'));
 expect(dense.pieces).toHaveLength(24);
 const result=composeDetailedMotifParts(dense,input,ACTIVE_VINE_STUDY,NEON_MOTIF_SELECTION);
 expect(result.placements.filter(p=>p.kind==='flower')).toHaveLength(15);
 expect(result.structure.brokenJunctions).toBe(0);
 expect(result.checks).toEqual({leafFlowerOverlaps:[],outsideEnvelope:0});
 expect(new Set(result.placements.filter(p=>p.kind==='flower').map(p=>dense.pieces.find(x=>x.id===p.partId)?.structuralRole)).size).toBe(4);
 expect(result.learnedModelApplied).toBe(true);expect(result.stitchCount).toBeNull();
});
