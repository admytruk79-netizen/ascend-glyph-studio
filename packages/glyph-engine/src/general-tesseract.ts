import{buildMeaningGraph,allProjections,ProjectionKind,TesseractMeaningGraph}from"./tesseract-meta-grammar";
import{buildMultiscaleField,renderMultiscaleSvg,MultiscaleField}from"./multiscale-floral";
export type SubstrateKind="diary"|"garment"|"stationery"|"emblem"|"packaging"|"digital";
export interface SubstrateProfile{kind:SubstrateKind;width:number;height:number;minFeature:number;maxDensity:number;preferredProjections:ProjectionKind[]}
export interface GeneralTesseractArtifact{schema:"ascend.tesseract-artifact.v1";seed:string;substrate:SubstrateProfile;graph:TesseractMeaningGraph;field:MultiscaleField;svg:string;projectionKinds:ProjectionKind[]}
export const DEFAULT_SUBSTRATES:Record<SubstrateKind,SubstrateProfile>={
 diary:{kind:"diary",width:148,height:210,minFeature:.3,maxDensity:.72,preferredProjections:["vertical-journey","layered-field","linear-band"]},
 garment:{kind:"garment",width:300,height:400,minFeature:.8,maxDensity:.6,preferredProjections:["linear-band","vertical-journey","macro-emblem"]},
 stationery:{kind:"stationery",width:148,height:210,minFeature:.25,maxDensity:.65,preferredProjections:["linear-band","layered-field"]},
 emblem:{kind:"emblem",width:60,height:60,minFeature:.4,maxDensity:.68,preferredProjections:["macro-emblem","radial-field"]},
 packaging:{kind:"packaging",width:200,height:300,minFeature:.35,maxDensity:.65,preferredProjections:["layered-field","linear-band","macro-emblem"]},
 digital:{kind:"digital",width:100,height:100,minFeature:.1,maxDensity:.85,preferredProjections:["radial-field","layered-field","vertical-journey"]}
};
export function generateTesseractArtifact(seed:string,substrate:SubstrateKind|SubstrateProfile,microPerNode=24):GeneralTesseractArtifact{
 const profile=typeof substrate==="string"?DEFAULT_SUBSTRATES[substrate]:substrate;
 const graph=buildMeaningGraph(seed),field=buildMultiscaleField(graph,microPerNode),available=allProjections(graph);
 const projectionKinds=profile.preferredProjections.filter(k=>available.some(p=>p.kind===k));
 return{schema:"ascend.tesseract-artifact.v1",seed,substrate:profile,graph,field,svg:renderMultiscaleSvg(field),projectionKinds};
}
