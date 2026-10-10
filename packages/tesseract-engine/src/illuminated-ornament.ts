import type {StitchIrObject,StitchIrPoint as Point} from './production-stitch-ir';
/** Original illumination-like ornament. Finite branching geometry, not traced motifs. */
export function illuminatedOrnament(width:number,height:number,dark:boolean,tiers:number,seed:string){
 const objects:StitchIrObject[]=[],ink=dark?'#d2a455':'#862939',gold=dark?'#d2a455':'#bc8b44',leaf=dark?'#7e9678':'#6a7c60',light=dark?'#eee0b6':'#f6f0df',petal=dark?'#b95862':'#b24b53';
 let hash=0;for(const c of seed)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
 const pt=(p:Point)=>({x:p.x*width/100,y:p.y*height/140});
 function line(id:string,path:Point[],color=ink,w=.3){objects.push({kind:'satin',id:'illum:'+id,color,width:w*width/100,path:path.map(pt),spacing:.4});}
 function fill(id:string,polygon:Point[],color:string){objects.push({kind:'fill',id:'illum:'+id,color,polygon:[...polygon.map(pt),pt(polygon[0]!)],angle:45,rowSpacing:.43});}
 const polar=(x:number,y:number,r:number,a:number):Point=>({x:x+r*Math.cos(a),y:y+r*Math.sin(a)});
 function curve(id:string,a:Point,b:Point,c:Point,d:Point,color=ink,w=.3){const out=[];for(let i=0;i<=40;i++){const t=i/40,u=1-t;out.push({x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y});}line(id,out,color,w);return out;}
 function leafShape(id:string,x:number,y:number,angle:number,size:number){
  const p:Point[]=[];
  for(let i=0;i<=40;i++){const t=i/40,a=t*Math.PI*2,long=size*Math.cos(a),short=size*.43*Math.sin(a)*(1+.14*Math.cos(a*10));p.push({x:x+long*Math.cos(angle)-short*Math.sin(angle),y:y+long*Math.sin(angle)+short*Math.cos(angle)});}
  fill(id,p,leaf);line(id+':outline',p,ink,.17);
  line(id+':spine',[polar(x,y,size*.9,angle+Math.PI),polar(x,y,size*.9,angle)],light,.13);
  for(let j=-2;j<=2;j++)for(const side of [-1,1]){
   const cx=x+j*size*.25*Math.cos(angle),cy=y+j*size*.25*Math.sin(angle);
   line(id+':vein:'+j+':'+side,[{x:cx,y:cy},{x:cx+size*.2*Math.cos(angle)+side*size*.25*Math.cos(angle+Math.PI/2),y:cy+size*.2*Math.sin(angle)+side*size*.25*Math.sin(angle+Math.PI/2)}],light,.09);
  }
 }
 function rosette(id:string,x:number,y:number,r:number,petals:number){
  // A scalloped outer calyx encloses three scales of individually outlined petals.
  const rim=Array.from({length:petals*8},(_,i)=>{const a=i*Math.PI*2/(petals*8),rr=r*(1+.035*Math.cos(a*petals));return polar(x,y,rr,a);});fill(id+':calyx',rim,ink);
  for(let ring=0;ring<3;ring++){
   const length=r*[.86,.57,.31][ring]!,count=ring===2?Math.max(6,petals/2):petals,shift=ring*Math.PI/petals;
   for(let k=0;k<count;k++){
    const angle=k*Math.PI*2/count+shift,p:Point[]=[];
    for(let i=0;i<=32;i++){const t=i/32*Math.PI*2,a=length*(.50+.48*Math.cos(t)),b=length*.23*Math.sin(t)*(1+.18*Math.cos(t*4));p.push({x:x+a*Math.cos(angle)-b*Math.sin(angle),y:y+a*Math.sin(angle)+b*Math.cos(angle)});}
    const idp=id+':petal:'+ring+':'+k;fill(idp,p,ring===0?petal:ring===1?gold:leaf);line(idp+':rim',p,light,.12);
    if(ring<2)curve(idp+':vein',polar(x,y,length*.22,angle),polar(x,y,length*.45,angle+.09),polar(x,y,length*.68,angle-.09),polar(x,y,length*.88,angle),light,.08);
   }
  }
  const heart=Array.from({length:24},(_,i)=>polar(x,y,r*.12,i*Math.PI/12));fill(id+':heart',heart,ink);
  for(let k=0;k<8;k++){const a=k*Math.PI/4;line(id+':stamen:'+k,[polar(x,y,r*.08,a),polar(x,y,r*.11,a)],light,.12);}
 }
 function scroll(id:string,x:number,y:number,r:number,side:number){
  const p=Array.from({length:65},(_,i)=>{const t=i/64,a=t*Math.PI*3.1,rr=r*(1-t)+.15;return{x:x+side*rr*Math.cos(a),y:y+rr*Math.sin(a)};});line(id,p,ink,.45);line(id+':gold',p,gold,.15);rosette(id+':terminal',x,y,.65,8);
 }
 // A real two-ribbon braid with alternating overpasses at known crossings.
 for(const side of [-1,1]){
  const x=50+side*43;
  for(const ribbon of [-1,1]){
   const path=Array.from({length:241},(_,i)=>{const y=10+i*.5;return{x:x+ribbon*1.4*Math.sin((y-10)*Math.PI/12),y};});line('braid:'+side+':'+ribbon,path,ink,1.4);line('braid:core:'+side+':'+ribbon,path,gold,.7);
  }
  for(let k=1;k<10;k++){
   const y=10+k*12,ribbon=k%2?1:-1,path=Array.from({length:17},(_,i)=>{const yy=y-1+i/8;return{x:x+ribbon*1.4*Math.sin((yy-10)*Math.PI/12),y:yy};});line('braid:overpass:'+side+':'+k,path,light,1.8);line('braid:bridge:'+side+':'+k,path,ink,1.4);line('braid:bridge-core:'+side+':'+k,path,gold,.7);
  }
 }
 for(const y of [5,135]){line('frame:outer:'+y,[{x:5,y},{x:95,y}],ink,.5);line('frame:inner:'+y,[{x:5,y:y+(y===5?2:-2)},{x:95,y:y+(y===5?2:-2)}],gold,.2);for(let x=13;x<92;x+=10){rosette('frame:flower:'+x+':'+y,x,y,1.5,8);}}
 for(const x of [7,93])for(const y of [8,132])rosette('corner:'+x+':'+y,x,y,3.1,10);
 // Central architectural plant: outlined trunk, forked branches, tertiary curls.
 curve('trunk',{x:50,y:122},{x:48.5,y:94},{x:51.5,y:56},{x:50,y:24},ink,1.15);
 curve('trunk:gold',{x:50,y:122},{x:48.5,y:94},{x:51.5,y:56},{x:50,y:24},gold,.35);
 for(let i=0;i<tiers;i++)for(const side of [-1,1]){
  const y=98-i*64/(tiers-1),reach=21+(i%2)*5+(hash%3),end={x:50+side*reach,y:y-7};
  const p=curve('branch:'+i+':'+side,{x:50,y:y+10},{x:50+side*12,y:y+2},{x:end.x+side*7,y:y-18},end,ink,.85);line('branch:gold:'+i+':'+side,p,gold,.25);
  rosette('flower:'+i+':'+side,end.x,end.y,5.1+(i%2)*1.0,10+(i%2)*2);
  for(let j=0;j<3;j++){
   const q=p[11+j*7]!;leafShape('branch:leaf:'+i+':'+side+':'+j,q.x-side*1.2,q.y+1.5,-side*(.8+j*.2),2.6+j*.25);
  }
  const cx=50+side*(11+(i%2)*2),cy=y-5;
  curve('fork:'+i+':'+side,{x:50,y:y+7},{x:50+side*4,y:y-4},{x:cx+side*6,y:cy+6},{x:cx+side*4.3,y:cy},ink,.45);scroll('scroll:'+i+':'+side,cx,cy,4.3,side);
  leafShape('scroll:leaf:'+i+':'+side,cx-side*1.8,cy+5,-side*.65,2.8);
  // Different flower scale and a curling tendril on the outside of each branch.
  const sx=50+side*33,sy=y+3;
  curve('outer:sprig:'+i+':'+side,{x:sx,y:sy+8},{x:sx-side*5,y:sy+3},{x:sx+side*5,y:sy-4},{x:sx,y:sy-5},ink,.3);
  rosette('outer:bud:'+i+':'+side,sx,sy-5,2.1,8);leafShape('outer:leaf:'+i+':'+side,sx-side*1.5,sy+2,side*.8,2.4);
 }
 rosette('crown',50,21,7.8,16);
 for(let y=44;y<109;y+=21)rosette('axis:'+y,50,y,1.8,8);
 // A scalloped decorated vase, not a solid trapezoid.
 const vase:Point[]=[{x:43,y:119},{x:57,y:119},{x:55,y:123},{x:57,y:126},{x:53,y:131},{x:47,y:131},{x:43,y:126},{x:45,y:123}];fill('vase',vase,ink);line('vase:rim',[{x:43,y:120},{x:57,y:120}],gold,.6);rosette('vase:medallion',50,126,2.4,8);
 for(const side of [-1,1])curve('vase:handle:'+side,{x:50+side*6,y:121},{x:50+side*11,y:120},{x:50+side*11,y:126},{x:50+side*5,y:127},ink,.55);
 return objects;
}
