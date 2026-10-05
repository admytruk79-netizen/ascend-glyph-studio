import{buildMeaningGraph,allProjections,ProjectionKind,TesseractMeaningGraph}from"./tesseract-meta-grammar";
import{buildMultiscaleField,renderMultiscaleSvg,MultiscaleField}from"./multiscale-floral";
import{applyGeometryConstraints,ConstraintResult,ManufacturingMode}from"./substrate-constraints";
export type SubstrateKind="diary"|"garment"|"stationery"|"emblem"|"packaging"|"digital";
export interface SubstrateProfile{kind:SubstrateKind;width:number;height:number;minFeature:number;maxDensity:number;preferredProjections:ProjectionKind[];mode?:ManufacturingMode}
export interface GeneralTesseractArtifact{schema:"ascend.tesseract-artifact.v1";seed:string;substrate:SubstrateProfile;graph:TesseractMeaningGraph;field:MultiscaleField;constraints:ConstraintResult;svg:string;projectionKinds:ProjectionKind[]}
export const DEFAULT_SUBSTRATES:Record<SubstrateKind,SubstrateProfile>={
 diary:{kind:"diary",width:148,height:210,minFeature:.3,maxDensity:.72,mode:"print",preferredProjections:["vertical-journey","layered-field","linear-band"]},
 garment:{kind:"garment",width:300,height:400,minFeature:.8,maxDensity:.6,mode:"embroidery",preferredProjections:["linear-band","vertical-journey","macro-emblem"]},
 stationery:{kind:"stationery",width:148,height:210,minFeature:.25,maxDensity:.65,mode:"print",preferredProjections:["linear-band","layered-field"]},
 emblem:{kind:"emblem",width:60,height:60,minFeature:.4,maxDensity:.68,mode:"embroidery",preferredProjections:["macro-emblem","radial-field"]},
 packaging:{kind:"packaging",width:200,height:300,minFeature:.35,maxDensity:.65,mode:"print",preferredProjections:["layered-field","linear-band","macro-emblem"]},
 digital:{kind:"digital",width:100,height:100,minFeature:.1,maxDensity:.85,mode:"digital",preferredProjections:["radial-field","layered-field","vertical-journey"]}
};
export function generateTesseractArtifact(seed:string,substrate:SubstrateKind|SubstrateProfile,microPerNode=24):GeneralTesseractArtifact{
 const profile=typeof substrate==="string"?DEFAULT_SUBSTRATES[substrate]:substrate,graph=buildMeaningGraph(seed),raw=buildMultiscaleField(graph,microPerNode);
 const constraints=applyGeometryConstraints(raw,{widthMm:profile.width,heightMm:profile.height,minFeatureMm:profile.minFeature,maxDensity:profile.maxDensity,mode:profile.mode??"print"});
 const available=allProjections(graph),projectionKinds=profile.preferredProjections.filter(k=>available.some(p=>p.kind===k));
 return{schema:"ascend.tesseract-artifact.v1",seed,substrate:profile,graph,field:constraints.field,constraints,svg:renderMultiscaleSvg(constraints.field),projectionKinds};
}
