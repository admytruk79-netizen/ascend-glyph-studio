/** Connect decoded, provenance-reviewed image frames to structural evidence.
 * The caller is responsible for image decoding and independent rights review.
 */
import {analyzeEmbroideryPixels,type PixelFrame,type ImageStructure} from "./embroidery-image-analysis";
import {extractStructuralRules,type ReferenceEvidence,type ExtractionResult} from "./reference-structural-rules";
export type ReviewedImage={reference:Omit<ReferenceEvidence,"operations"|"structuralFeaturesVersion">;frame:PixelFrame;backgroundRgb:[number,number,number];threshold?:number};
export type AnalyzedReference={reference:ReferenceEvidence;imageStructure:ImageStructure};
export type AnalysisBatch={analyzed:AnalyzedReference[];extraction:ExtractionResult;errors:{objectId:string;reason:string}[]};
export function analyzeReviewedReferences(inputs:readonly ReviewedImage[]):AnalysisBatch{
 const analyzed:AnalyzedReference[]=[],errors:{objectId:string;reason:string}[]=[];
 for(const input of inputs){
  const ref=input.reference;
  if(ref.rightsStatus!=="approved"||ref.culturalReview!=="approved"){
   errors.push({objectId:ref.objectId,reason:"rights-or-cultural-review-not-approved"});continue;
  }
  try{
   const imageStructure=analyzeEmbroideryPixels(input.frame,input.backgroundRgb,input.threshold);
   analyzed.push({reference:{...ref,structuralFeaturesVersion:imageStructure.schema,operations:imageStructure.operations},imageStructure});
  }catch(e){errors.push({objectId:ref.objectId,reason:e instanceof Error?e.message:"analysis-failed"});}
 }
 return {analyzed,extraction:extractStructuralRules(analyzed.map(x=>x.reference)),errors};
}
