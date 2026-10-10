/** Manufacturer pages/manual inspected 2026-10-10. Null is unverified, never an unlimited capability. */
export const machineProfiles=[
 {id:'brother-pr1055x',name:'Brother PR1055X',fieldMm:[360,200],needles:10,maxSpm:1000,formats:['pes','phc','phx','dst'],maxStitches:500000,source:'https://download.brother.com/welcome/doch101931/884t15-16_om03_en.pdf'},
 {id:'brother-pr680w',name:'Brother PR680W',fieldMm:[300,200],needles:6,maxSpm:1000,formats:[],maxStitches:null,source:'https://www.brother-usa.com/p/embroidery/PR680W'},
 {id:'babylock-venture',name:'Baby Lock Venture',fieldMm:[355.6,200],needles:10,maxSpm:1000,formats:['pen','pes','phc','dst'],maxStitches:null,source:'https://babylock.com/venture'},
 {id:'janome-mb7',name:'Janome MB-7',fieldMm:[238,200],needles:7,maxSpm:800,formats:['jef+','jef','dst'],maxStitches:null,source:'https://www.janome.com/product/mb-7/'},
 {id:'tajima-tmez-sc',name:'Tajima TMEZ-SC',fieldMm:[500,360],needles:15,maxSpm:1200,formats:[],maxStitches:null,source:'https://www.tajima.com/product/tmez-sc/'},
 {id:'zsk-sprint7',name:'ZSK SPRINT 7',fieldMm:[460,310],needles:18,maxSpm:1200,formats:[],maxStitches:null,source:'https://www.zsk.de/en/embroidery-machines/sprint.php'},
 {id:'zsk-sprint7l',name:'ZSK SPRINT 7 L',fieldMm:[600,400],needles:18,maxSpm:1200,formats:[],maxStitches:null,source:'https://www.zsk.de/en/embroidery-machines/sprint.php'},
 {id:'zsk-sprint6xl',name:'ZSK SPRINT 6 XL',fieldMm:[1200,280],needles:12,maxSpm:1200,formats:[],maxStitches:null,source:'https://www.zsk.de/en/embroidery-machines/sprint.php'},
 {id:'melco-bravo',name:'Melco BRAVO',fieldMm:null,needles:16,maxSpm:1000,formats:[],maxStitches:null,source:'https://melco.com/melco-bravo-embroidery-machine/'},
 {id:'bernina-700pro',name:'BERNINA 700 PRO',fieldMm:[400,210],needles:1,maxSpm:1000,formats:[],maxStitches:null,source:'https://www.bernina.com/en-US/Machines-US/Series-Overview/BERNINA-7-Series/BERNINA-700-PRO'},
 {id:'ricoma-em1010',name:'Ricoma EM-1010',fieldMm:[309.88,210.82],needles:10,maxSpm:1000,formats:['dst'],maxStitches:null,source:'https://ricoma.com/products/10-needle-easy-to-use-embroidery-machine-for-beginners-with-10-1-touchscreen-panel'},
 {id:'ricoma-marquee15',name:'Ricoma Marquee 15',fieldMm:[500.38,360.68],needles:15,maxSpm:1200,formats:['dst'],maxStitches:null,source:'https://ricoma.com/products/marquee-15-needle-commercial-embroidery-machine-with-10-1-touchscreen-panel'},
 {id:'husqvarna-epic3',name:'Husqvarna Viking DESIGNER EPIC 3',fieldMm:[460,450],needles:1,maxSpm:1000,formats:[],maxStitches:null,source:'https://www.singer.com/products/husqvarnaviking-designer-epic-3-sewing-embroidery-machine'},
 {id:'pfaff-icon2',name:'PFAFF creative icon 2',fieldMm:[350,360],needles:1,maxSpm:null,formats:[],maxStitches:null,source:'https://www.singer.com/products/pfaff-creative-icon-2-sewing-and-embroidery-machine'}
] as const;
export function checkMachineFit(id:string,width:number,height:number,stitches:number,hoop?:{width:number;height:number}){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||!Number.isInteger(stitches)||stitches<0)throw Error('Invalid physical design or stitch count');
 const p=machineProfiles.find(p=>p.id===id);if(!p)throw Error('Unknown machine profile');
 const fits=(a:number,b:number)=>width<=a&&height<=b||width<=b&&height<=a;
 return {machine:p.name,fieldFit:p.fieldMm?fits(p.fieldMm[0],p.fieldMm[1]):null,rotationRequiredForListedAxes:p.fieldMm?(width>p.fieldMm[0]||height>p.fieldMm[1])&&fits(p.fieldMm[0],p.fieldMm[1]):null,selectedHoopFit:hoop?fits(hoop.width,hoop.height):null,dstSupport:p.formats.includes('dst' as never)?true:null,stitchBudgetFit:p.maxStitches!==null?stitches<=p.maxStitches:null,productionRelease:false};
}
