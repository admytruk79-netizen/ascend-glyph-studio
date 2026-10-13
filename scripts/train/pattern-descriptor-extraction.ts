import sharp from 'sharp';
import {learnImage,featureOf} from '../../packages/tesseract-engine/src/raster-features';
/** Existing engine descriptors, with explicit fragment fallback. Never a
 * semantic segmentation or stitch extractor. */
export async function extractPatternDescriptors(image:Buffer){
 const {data,info}=await sharp(image).rotate().resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const learned=learnImage({data,width:info.width,height:info.height}),features=learned.elements.map(featureOf);
 let extraction='whole-image-components';
 if(!features.length){
  extraction='4x4-tile-fragments';
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
   const left=Math.floor(x*info.width/4),top=Math.floor(y*info.height/4),width=Math.floor((x+1)*info.width/4)-left,height=Math.floor((y+1)*info.height/4)-top;
   if(width<2||height<2)continue;
   const tile=await sharp(data,{raw:{width:info.width,height:info.height,channels:3}}).extract({left,top,width,height}).raw().toBuffer();
   features.push(...learnImage({data:tile,width,height}).elements.map(featureOf));
  }
 }
 if(!features.length||features.some(v=>v.some(x=>!Number.isFinite(x))))throw new Error('training:invalid-descriptors');
 return {features,extraction,density:learned.density};
}
