import type {Topology} from "./topology";
import type {ConstructionEnvelope} from "./construction-envelope";

export type StitchFamily="run"|"satin"|"fill";
export type UnderlayKind="center-walk"|"contour"|"zigzag"|"fill";
export type ProductionRelation="anchor"|"nest"|"orbit"|"intersect"|"bridge"|"oppose"|"mirror"|"radiate"|"flow"|"enclose"|"repeat"|"branch"|"transform"|"terminate"|"return"|"ascend";
export type ProductionReferenceId=
 |"wilcom-object-properties"|"wilcom-auto-fabrics"|"wilcom-pull-comp"
 |"inkstitch-satin"|"inkstitch-fill"|"inkstitch-routing"
 |"brother-sew-attributes"|"clo-uv-packing"|"marvelous-uv-packing";

export interface ProductionReference{ id:ProductionReferenceId; url:string; principle:string; }
export const PRODUCTION_ENGINE_REFERENCES:readonly ProductionReference[]=[
 {id:"wilcom-object-properties",url:"https://docs.wilcom.com/embroiderystudio/28/en/OnlineHelp/Digitizing/properties/properties-2.htm",principle:"Embroidery objects retain stitch properties with object geometry."},
 {id:"wilcom-auto-fabrics",url:"https://docs.wilcom.com/embroiderystudio/28/en/OnlineHelp/Digitizing/properties/properties-9.htm",principle:"Fabric profiles alter bounded physical stitch parameters."},
 {id:"wilcom-pull-comp",url:"https://docs.wilcom.com/embroiderystudio/28/en/OnlineHelp/Release/rn-28-notes/rn-28-notes-14.htm",principle:"Pull compensation may be asymmetric by side."},
 {id:"inkstitch-satin",url:"https://inkstitch.org/docs/stitches/satin-column/",principle:"Satin columns own spacing, underlay, width and compensation."},
 {id:"inkstitch-fill",url:"https://inkstitch.org/docs/stitches/fill-stitch/",principle:"Fill objects own row spacing, angle, underlay and compensation."},
 {id:"inkstitch-routing",url:"https://inkstitch.org/docs/satin-tools/",principle:"Routing may change order while preserving object parameters."},
 {id:"brother-sew-attributes",url:"https://support.brother.com/g/s/hf/htmldoc/ped/im/ped11/en/PED11_EN/pages/16_1293378.html",principle:"Sew attributes depend on the selected stitch type."},
 {id:"clo-uv-packing",url:"https://support.clo3d.com/hc/en-us/articles/360053418574-UV-Editor",principle:"Pattern placement is constrained by piece geometry, padding and scale."},
 {id:"marvelous-uv-packing",url:"https://support.marvelousdesigner.com/hc/en-us/articles/47358235084313-UV-EDITOR-MODE-Edit-UV-location",principle:"UV/pattern-piece placement preserves scale and packing constraints."}
] as const;

export interface EmbroideryProductionProperties{
 stitchFamily:StitchFamily;
 spacingMm:number;
 underlay:readonly UnderlayKind[];
 pullCompMm:{left:number;right:number};
 pushCompMm?:{start:number;end:number};
 runLengthMm?:number;
 satinWidthMm?:number;
 fillAngleDeg?:number;
 repeats:number;
 preserveRoutingParameters:true;
}

export interface ProductionGlyphObject{
 id:string;
 conceptId:string;
 form:string;
 geometryRef:string;
 physical:{widthMm:number;heightMm:number;minScale:number;maxScale:number;clearanceMm:number;rotationDeg:number};
 placement:{zoneId?:string;seamPolicy:"avoid"|"continuous"|"resolve";canRotate:boolean;wrapAllowed:boolean;xMm?:number;yMm?:number;rotationDeg?:number};
 relations:{ports:readonly ("north"|"south"|"east"|"west"|"diag-ne"|"diag-nw"|"diag-se"|"diag-sw")[];allowed:readonly ProductionRelation[]};
 embroidery:EmbroideryProductionProperties;
 threadColor:string;
 sourceBasis:readonly ProductionReferenceId[];
}

const ALL_RELATIONS:readonly ProductionRelation[]=["anchor","nest","orbit","intersect","bridge","oppose","mirror","radiate","flow","enclose","repeat","branch","transform","terminate","return","ascend"];

function familyFor(form:string):StitchFamily{
 if(form==="enclosure"||form==="seed"||form==="mutation")return "satin";
 return "run";
}
function portsFor(form:string):ProductionGlyphObject["relations"]["ports"]{
 if(form==="axis")return ["north","south"];
 if(form==="bifurcation")return ["south","diag-ne","diag-nw"];
 if(form==="crossing")return ["north","south","east","west"];
 if(form==="enclosure")return ["north","south","east","west"];
 return ["east","west"];
}
function embroideryFor(family:StitchFamily,scale:number,minFeature:number):EmbroideryProductionProperties{
 if(family==="satin"){
  const width=Math.max(1,Math.min(8,minFeature*2.2*scale));
  return {stitchFamily:"satin",spacingMm:.4,underlay:width<2?["center-walk"]:width<5?["center-walk","contour"]:["center-walk","contour","zigzag"],pullCompMm:{left:.25,right:.25},pushCompMm:{start:0,end:0},satinWidthMm:width,repeats:1,preserveRoutingParameters:true};
 }
 if(family==="fill")return {stitchFamily:"fill",spacingMm:.43,underlay:["fill"],pullCompMm:{left:.25,right:.25},fillAngleDeg:45,repeats:1,preserveRoutingParameters:true};
 return {stitchFamily:"run",spacingMm:2.5,underlay:[],pullCompMm:{left:0,right:0},runLengthMm:2.5,repeats:1,preserveRoutingParameters:true};
}

export function productionObjectsFromTopology(
 topology:Topology,
 envelope:ConstructionEnvelope,
 options:{zoneId?:string;seamPolicy?:"avoid"|"continuous"|"resolve";wrapAllowed?:boolean}={}
):ProductionGlyphObject[]{
 if(topology.nodes.length>envelope.maxNodes)throw new Error(`topology exceeds physical node capacity: ${topology.nodes.length} > ${envelope.maxNodes}`);
 return topology.nodes.map(node=>{
  if(node.form==="crossing"&&!envelope.supportsCrossing)throw new Error("crossing form unsupported by selected production envelope");
  const family=familyFor(node.form);
  const scale=Math.max(.5,Math.min(envelope.maxScaleLevels,node.scale));
  const base=Math.max(8,envelope.minFeatureMm*8);
  const basis:ProductionReferenceId[]=family==="satin"
   ?["wilcom-object-properties","wilcom-auto-fabrics","wilcom-pull-comp","inkstitch-satin","inkstitch-routing","brother-sew-attributes","clo-uv-packing"]
   :family==="fill"
    ?["wilcom-object-properties","wilcom-auto-fabrics","inkstitch-fill","brother-sew-attributes","clo-uv-packing"]
    :["wilcom-object-properties","wilcom-auto-fabrics","brother-sew-attributes","clo-uv-packing"];
  return {
   id:node.id,conceptId:node.conceptId,form:node.form,geometryRef:`ascend:${node.form}`,
   physical:{widthMm:base*scale,heightMm:base*scale,minScale:.5,maxScale:envelope.maxScaleLevels,clearanceMm:envelope.minGapMm,rotationDeg:0},
   placement:{zoneId:options.zoneId,seamPolicy:options.seamPolicy??envelope.seamPolicy,canRotate:true,wrapAllowed:!!options.wrapAllowed},
   relations:{ports:portsFor(node.form),allowed:ALL_RELATIONS.filter(r=>r!=="intersect"||envelope.supportsCrossing)},
   embroidery:embroideryFor(family,scale,envelope.minFeatureMm),threadColor:"#111111",sourceBasis:basis
  };
 });
}

export function assertProductionRelations(topology:Topology,objects:ProductionGlyphObject[]):void{
 const byId=new Map(objects.map(o=>[o.id,o]));
 for(const e of topology.edges){
  const a=byId.get(e.from),b=byId.get(e.to);
  if(!a||!b)throw new Error(`missing production object for relation ${e.from}->${e.to}`);
  if(!a.relations.allowed.includes(e.relation as ProductionRelation)||!b.relations.allowed.includes(e.relation as ProductionRelation))
   throw new Error(`production relation not allowed: ${e.relation}`);
 }
}


export function placeProductionObjects(
 objects:ProductionGlyphObject[],
 points:Record<string,{x:number;y:number;angleDeg:number}>
):ProductionGlyphObject[]{
 return objects.map(o=>{
  const p=points[o.id];
  return p?{...o,physical:{...o.physical,rotationDeg:p.angleDeg},placement:{...o.placement,xMm:p.x,yMm:p.y,rotationDeg:p.angleDeg}}:o;
 });
}
