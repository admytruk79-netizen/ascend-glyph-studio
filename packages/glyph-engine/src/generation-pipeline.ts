import{generateTesseractArtifact,SubstrateKind}from"./general-tesseract";
import{generateSleevePair,SleeveProjection}from"./sleeve-projection";
import{toPersistenceBundle,TesseractPersistenceBundle}from"./tesseract-persistence";
export interface GenerationEnvelope{schema:"ascend.generation-envelope.v1";seed:string;substrate:SubstrateKind;artifact:ReturnType<typeof generateTesseractArtifact>;persistence:TesseractPersistenceBundle}
export function generateForPersistence(seed:string,substrate:SubstrateKind,microPerNode=24,sleeveMode:SleeveProjection["mode"]="complement"):GenerationEnvelope{
 const artifact=generateTesseractArtifact(seed,substrate,microPerNode);
 const sleeves=substrate==="garment"?generateSleevePair(seed,sleeveMode):undefined;
 const persistence=toPersistenceBundle(artifact,sleeves?[sleeves.left,sleeves.right]:undefined);
 return{schema:"ascend.generation-envelope.v1",seed,substrate,artifact,persistence};
}
