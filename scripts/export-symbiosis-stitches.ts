import {mkdirSync,writeFileSync} from 'node:fs';import sharp from 'sharp';
import {generatePatterns} from '../packages/tesseract-engine/src/pattern-generator';
import {prepareEmbroideryArtwork,digitizeArtworkPixels} from '../packages/stitch-engine/src/visible-artwork';import {previewSvg} from '../packages/stitch-engine/src/preview';
async function main(){
 const dir=process.env.TESSERACT_OUTPUT_DIR??'artifacts/symbiosis-stitches';mkdirSync(dir,{recursive:true});
 for(const kind of ['illuminated-garden','illuminated-ibex'] as const)for(const palette of ['red-cream','garden-dark'] as const){
  const design=generatePatterns({seed:'machine-reviewed-20261010',concepts:[],compositionStyle:'ukrainian-symbiosis',symbiosisKind:kind,botanicalPalette:palette,medium:'embroidery',variations:1})[0]!;
  const width=180,height=250,mm=.2,cols=900,rows=1250,objects=design.stitchObjects!,prepared=prepareEmbroideryArtwork(design.svg,objects);
  const raster=async(svg:string)=>sharp(Buffer.from(svg)).resize(cols,rows,{fit:'fill'}).ensureAlpha().raw().toBuffer();
  const [data,kindData]=await Promise.all([raster(prepared.artwork),raster(prepared.kindArtwork)]);
  const p=digitizeArtworkPixels(data,kindData,cols,rows,mm,prepared.colors,objects),name=kind+'-'+palette;
  writeFileSync(dir+'/'+name+'.dst',p.dst);writeFileSync(dir+'/'+name+'-stitches.svg',previewSvg(p.commands,p.colors,{thread:.3}));writeFileSync(dir+'/'+name+'-artwork.svg',design.svg);
  writeFileSync(dir+'/'+name+'-report.json',JSON.stringify({...p.report,physicalSizeMm:{width,height},threadSequence:p.colors,groundFabricColor:palette==='garden-dark'?'#202822':'#f6f0df',sourceEvidence:design.sourceEvidence,productionRelease:false,reason:'Machine/hoop and fabric not yet selected; no physical sew-out; visible-mask tatami without underlay or pull compensation.'},null,2));
  console.log(name,JSON.stringify(p.report));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
