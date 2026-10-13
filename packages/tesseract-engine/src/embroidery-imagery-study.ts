/** Authored ornamental imagery from observed construction approaches. Separate
 * from canonical ASCEND glyphs, learned weights and manufacturing stitch IR. */
export function embroideryImageryStudy(input:{widthMm:number;heightMm:number;complexity:number;family:'geometric'|'floral';seed:number}){
 const {widthMm:w,heightMm:h,complexity:c}=input;
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<80||w>600||h<40||h>160||!Number.isFinite(c)||c<0||c>1||(!Number.isSafeInteger(input.seed)||input.seed<0)||!['geometric','floral'].includes(input.family))throw new Error('imagery-study:invalid-input');
 const ink='#25201e',red='#a32032',paper='#f4efe4';
 type Pixel=[number,number,string];
 const star:Pixel[]=[],diamond:Pixel[]=[],flower:Pixel[]=[];
 for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++){
  const ax=Math.abs(x),ay=Math.abs(y);
  const inside=(xx:number,yy:number)=>{const a=Math.abs(xx),b=Math.abs(yy);return a+b<=6||a<=1&&b<=7||b<=1&&a<=7||Math.abs(a-b)<=1&&Math.max(a,b)<=5;};
  if(inside(x,y)){const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!inside(x+dx,y+dy));star.push([x+7,y+7,edge||ax+ay<=1?ink:red]);}
  const d=ax+ay;
  if(d===7||d===6||d<=1||d===4||ax<=1&&ay<=3||ay<=1&&ax<=3)diamond.push([x+7,y+7,d>=6||d===4?ink:red]);
 }
 for(let y=0;y<21;y++)for(let x=0;x<21;x++){
  const petals=[[7,6],[13,6],[10,3],[10,9],[10,6]];
  const floral=petals.some(([cx,cy])=>(x-cx)**2+(y-cy)**2<=8);
  const stem=x===10&&y>=11&&y<=20;
  const leaves=(y>=13&&y<=16&&Math.abs(x-6)+(Math.abs(y-14))<=3)||(y>=16&&y<=19&&Math.abs(x-14)+Math.abs(y-17)<=3);
  const branches=y>=12&&y<=17&&(x===10-(y-12)||x===10+(y-14));
  if(floral||stem||leaves||branches)flower.push([x,y,stem||leaves||branches||Math.abs(x-10)+Math.abs(y-6)<=1?ink:red]);
 }
 const symbol=(id:string,p:Pixel[])=>`<g id="${id}">${p.map(([x,y,col])=>`<rect x="${x}" y="${y}" width=".88" height=".88" fill="${col}"/>`).join('')}</g>`;
 const W=1000,H=1000*h/w,columns=Math.max(3,Math.min(12,4+Math.round(c*6))),step=W/columns;
 const use=(id:string,x:number,y:number,size:number,grid=15)=>`<use href="#${id}" transform="translate(${x-size/2} ${y-size/2}) scale(${size/grid})"/>`;
 let body='';
 const mainSize=Math.min(step*.84,H*.43);
 for(let i=0;i<columns;i++){
  const x=(i+.5)*step;
  body+=use(input.family==='floral'&&i%2===input.seed%2?'flower':i%2===input.seed%2?'star':'diamond',x,H*.5,mainSize,input.family==='floral'&&i%2===input.seed%2?21:15);
 }
 for(const y of [H*.10,H*.90])for(let i=0;i<columns*2;i++)body+=use('star',(i+.5)*W/(columns*2),y,Math.min(step*.28,H*.15));
 for(const y of [H*.23,H*.77]){
  body+=`<path d="M0 ${y}H1000 M0 ${y+3}H1000" stroke="${red}" stroke-width="1.5"/>`;
  for(let i=0;i<columns*4;i++)body+=use('diamond',(i+.5)*W/(columns*4),y+(y<H/2?10:-10),Math.min(step*.12,H*.065));
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${w}mm" height="${h}mm" data-design-state="reference-imagery"><metadata>Authored ornamental image study; not canonical ASCEND geometry, trained model output or a machine stitch file.</metadata><defs>${symbol('star',star)}${symbol('diamond',diamond)}${symbol('flower',flower)}</defs><rect width="1000" height="${H}" fill="${paper}"/>${body}</svg>`;
 return {svg,state:'REFERENCE' as const,geometryNamespace:'ornament-study' as const,canonicalGeometryChanged:false,trainedModelApplied:false,stitchCount:null,productionApproved:false as const};
}
