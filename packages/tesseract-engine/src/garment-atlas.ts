import type {GarmentConfiguration,GarmentZone} from "./garment";

export type AtlasRect={x:number;y:number;width:number;height:number;rotationDeg:number};
export type AtlasZone={zone:GarmentZone;rect:AtlasRect};
export type SeamTransform={fromZoneId:string;toZoneId:string;fromEdge:"top"|"right"|"bottom"|"left";toEdge:"top"|"right"|"bottom"|"left";flip:boolean};
export type GarmentAtlas={width:number;height:number;zones:AtlasZone[];seams:SeamTransform[]};

const order=["collar","yoke","shoulder","chest","placket","sleeve","cuff","back","hem"];
function dims(z:GarmentZone){return {w:Math.max(60,z.circumferenceMm??z.widthMm??220),h:Math.max(50,z.heightMm??180)}}
export function buildGarmentAtlas(g:GarmentConfiguration):GarmentAtlas{
 const zs=g.zones.filter(z=>z.editable).slice().sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind));
 let x=30,y=30,rowH=0,maxX=0;const width=1800,zones:AtlasZone[]=[];
 for(const z of zs){const d=dims(z);if(x+d.w>width-30){x=30;y+=rowH+60;rowH=0}zones.push({zone:z,rect:{x,y,width:d.w,height:d.h,rotationDeg:0}});x+=d.w+60;rowH=Math.max(rowH,d.h);maxX=Math.max(maxX,x)}
 const byKind=(k:string)=>zones.filter(a=>a.zone.kind===k);
 const pairs:[string,string][]=[["chest","shoulder"],["shoulder","sleeve"],["sleeve","cuff"],["collar","placket"],["yoke","shoulder"],["back","yoke"],["placket","hem"]];
 const seams:SeamTransform[]=[];for(const [a,b] of pairs)for(const aa of byKind(a))for(const bb of byKind(b))seams.push({fromZoneId:aa.zone.id,toZoneId:bb.zone.id,fromEdge:"bottom",toEdge:"top",flip:false});
 return {width:Math.max(width,maxX),height:y+rowH+30,zones,seams};
}
export function atlasPoint(a:GarmentAtlas,zoneId:string,x01:number,y01:number){const z=a.zones.find(v=>v.zone.id===zoneId);if(!z)return null;return {x:z.rect.x+x01*z.rect.width,y:z.rect.y+y01*z.rect.height}}
