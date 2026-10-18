import type {MotifProvenance} from './motif-graph';
/** Draft macro landmarks from the retained plate. Positions are source pixels, not physical measurements. */
export type VineConstructionStudy={schema:'ascend.vine-construction-study.v1';id:string;image:{width:number;height:number};crop:{x:number;y:number;width:number;height:number};
 provenance:MotifProvenance;review:'draft';spine:[number,number][];
 heads:{id:string;centre:[number,number];widthPx:number;heightPx:number;angleDeg:number;branchVertex:number;role:'dominant'|'hanging'|'cup'|'satellite'}[];
 leaves:{vertex:number;target:[number,number];lengthPx:number;angleDeg:number}[]};
export const PLATE37_VINE_STUDY:VineConstructionStudy={schema:'ascend.vine-construction-study.v1',id:'plate37-continuous-vine-macro-v1',image:{width:1280,height:465},crop:{x:195,y:25,width:945,height:410},review:'draft',
 provenance:{schema:'ascend.motif-provenance.v1',id:'samokysh-plate37-macro-study',source:'https://commons.wikimedia.org/wiki/File:Мотиви_українського_орнаменту._1902._№37._Вишивка_шовком_і_золотом.jpg',creator:'Nikolai Samokysh',community:null,culturalContext:'Ukrainian ornament, plate 37 (1902). Macro branch relationships and relative flower hierarchy studied manually; region, botanical identities and symbolic meanings not established.',retrievedAt:'2026-10-12T00:00:00Z',originalSha256:'e4b85cfafc845616091a8e03276ea7dc83d7ec9eb0498da692d3bc804c5b32b0',permission:{status:'verified',evidence:'Retained per-item reference-use assessment: 1902 publication, public domain in the US; no fresh worldwide commercial-rights determination.',purposes:['analysis','reconstruction']},access:'documented-public',confidence:.65,transformations:[{operation:'manual macro landmark annotation',evidence:'Annotated 2026-10-18 from retained image; approximate source-pixel spine, head envelopes and leaf targets; not pixel tracing, expert botanical annotation or machine digitization.'}],regionalAttribution:{status:'unassigned'}},
 spine:[[395,303],[445,345],[567,389],[675,401],[757,383],[800,347],[838,236],[885,171],[965,90],[1065,70],[1120,80]],
 heads:[{id:'radial',centre:[322,211],widthPx:250,heightPx:316,angleDeg:-15,branchVertex:0,role:'dominant'},
 {id:'hanging-left',centre:[620,173],widthPx:180,heightPx:160,angleDeg:165,branchVertex:7,role:'hanging'},
 {id:'upper-cup',centre:[838,127],widthPx:126,heightPx:162,angleDeg:0,branchVertex:6,role:'cup'},
 {id:'hanging-right',centre:[1021,310],widthPx:204,heightPx:196,angleDeg:180,branchVertex:9,role:'hanging'},
 {id:'lower-left',centre:[484,358],widthPx:103,heightPx:98,angleDeg:-20,branchVertex:2,role:'satellite'},
 {id:'lower-right',centre:[863,386],widthPx:102,heightPx:98,angleDeg:12,branchVertex:5,role:'satellite'}],
 leaves:[{vertex:0,target:[236,290],lengthPx:80,angleDeg:-55},{vertex:1,target:[384,398],lengthPx:72,angleDeg:50},
 {vertex:1,target:[434,264],lengthPx:94,angleDeg:30},{vertex:2,target:[578,328],lengthPx:82,angleDeg:40},
 {vertex:3,target:[689,330],lengthPx:76,angleDeg:15},{vertex:4,target:[744,275],lengthPx:86,angleDeg:5},
 {vertex:5,target:[802,280],lengthPx:88,angleDeg:25},{vertex:6,target:[916,205],lengthPx:98,angleDeg:65},
 {vertex:7,target:[916,143],lengthPx:75,angleDeg:30},{vertex:8,target:[945,49],lengthPx:70,angleDeg:-20},
 {vertex:9,target:[1017,104],lengthPx:69,angleDeg:145},{vertex:9,target:[1110,132],lengthPx:80,angleDeg:20},
 {vertex:10,target:[1118,234],lengthPx:76,angleDeg:130},{vertex:5,target:[767,418],lengthPx:58,angleDeg:65}]};
export function assertVineConstructionStudy(s:VineConstructionStudy){
 if(s.schema!=='ascend.vine-construction-study.v1'||s.review!=='draft'||!s.id||s.spine.length<3||s.heads.length<3||s.provenance.permission.status!=='verified'||!s.provenance.permission.purposes.includes('analysis'))throw Error('vine-study:invalid');
 const c=s.crop;if(![s.image.width,s.image.height,c.x,c.y,c.width,c.height].every(Number.isFinite)||c.x<0||c.y<0||c.width<=0||c.height<=0||c.x+c.width>s.image.width||c.y+c.height>s.image.height)throw Error('vine-study:crop');
 const point=(p:[number,number])=>p.length===2&&p.every(Number.isFinite)&&p[0]>=c.x&&p[0]<=c.x+c.width&&p[1]>=c.y&&p[1]<=c.y+c.height;
 const ids=new Set<string>();
 for(const p of s.spine)if(!point(p))throw Error('vine-study:point');
 for(const h of s.heads){if(!/^[a-z][a-z0-9-]*$/.test(h.id)||ids.has(h.id)||!point(h.centre)||![h.widthPx,h.heightPx,h.angleDeg].every(Number.isFinite)||h.widthPx<=0||h.heightPx<=0||!Number.isInteger(h.branchVertex)||h.branchVertex<0||h.branchVertex>=s.spine.length)throw Error('vine-study:head');ids.add(h.id);}
 for(const l of s.leaves)if(!point(l.target)||!Number.isFinite(l.lengthPx)||l.lengthPx<=0||!Number.isFinite(l.angleDeg)||!Number.isInteger(l.vertex)||l.vertex<0||l.vertex>=s.spine.length)throw Error('vine-study:leaf');
}

import type {ObservedMotifAnnotations} from './motif-observed-annotations';
/** Macro reconstruction only: envelopes and connectivity, not traced petals or stitch objects. */
export function vineStudyAnnotations(study:VineConstructionStudy):ObservedMotifAnnotations{
 assertVineConstructionStudy(study);
 const elements:ObservedMotifAnnotations['elements']=[{id:'spine',hypothesis:'continuous main vine axis',confidence:.65,paths:[structuredClone(study.spine)],parentElementId:null,evidence:'Manual source-pixel macro axis; not a pixel-exact traced stem.',ports:Object.fromEntries(study.spine.map((p,i)=>[`branch-${i}`,p]))}];
 const connections:NonNullable<ObservedMotifAnnotations['connections']>=[];
 for(const head of study.heads){
  const [cx,cy]=head.centre,base:[number,number]=[cx,cy+head.heightPx/2],ring=Array.from({length:32},(_,i)=>{const a=i*Math.PI/16;return [cx+Math.cos(a)*head.widthPx/2,cy+Math.sin(a)*head.heightPx/2] as [number,number];});ring.push([...ring[0]!] as [number,number]);
  elements.push({id:head.id,hypothesis:`${head.role} head envelope`,confidence:.6,paths:[ring],parentElementId:null,evidence:'Approximate observed flower envelope; not petal anatomy.',ports:{base}},
   {id:`branch-${head.id}`,hypothesis:'head-to-vine relationship',confidence:.55,paths:[[study.spine[head.branchVertex]!,base]],parentElementId:null,evidence:'Draft macro relationship; connector path is schematic, not a traced historical stem.',ports:{root:study.spine[head.branchVertex]!,head:base}});
  connections.push({from:'spine',fromPort:`branch-${head.branchVertex}`,to:`branch-${head.id}`,toPort:'root',tolerancePx:1e-7,evidence:'Same annotated macro junction.'},{from:`branch-${head.id}`,fromPort:'head',to:head.id,toPort:'base',tolerancePx:1e-7,evidence:'Envelope base and schematic head branch coincide.'});
 }
 return {schema:'ascend.observed-motif-annotations.v1',id:study.id,image:study.image,provenance:structuredClone(study.provenance),review:{status:'draft',method:'Manual macro decomposition: one continuous spine, six head envelopes and explicit head connections.',limitations:['Partial macro reconstruction only; no petal-level or full-image accuracy claimed.','Envelope dimensions and branch associations are draft visual annotations.','No physical calibration, neural training or manufacturing approval.']},elements,connections};
}

export const PLATE31_VINE_STUDY:VineConstructionStudy={
  "schema": "ascend.vine-construction-study.v1",
  "id": "plate31-dense-vine-macro-v1",
  "image": {
    "width": 1280,
    "height": 745
  },
  "crop": {
    "x": 0,
    "y": 100,
    "width": 1280,
    "height": 530
  },
  "review": "draft",
  "provenance": {
    "schema": "ascend.motif-provenance.v1",
    "id": "samokysh-plate31-macro-study",
    "source": "https://commons.wikimedia.org/wiki/File:%D0%9C%D0%BE%D1%82%D0%B8%D0%B2%D0%B8_%D1%83%D0%BA%D1%80%D0%B0%D1%97%D0%BD%D1%81%D1%8C%D0%BA%D0%BE%D0%B3%D0%BE_%D0%BE%D1%80%D0%BD%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%D1%83._1902._%E2%84%9631._%D0%92%D0%B8%D1%88%D0%B8%D0%B2%D0%BA%D0%B0_%D1%88%D0%BE%D0%B2%D0%BA%D0%BE%D0%BC,_%D0%B7%D0%BE%D0%BB%D0%BE%D1%82%D0%BE%D0%BC_%D1%96_%D1%81%D1%80%D1%96%D0%B1%D0%BB%D0%BE%D0%BC.jpg",
    "creator": "Nikolai Samokysh",
    "community": null,
    "culturalContext": "Мотиви українського орнаменту. 1902. №31. Вишивка шовком, золотом і сріблом; Ukrainian ornament illustration. Botanical identities and regional community are not established.",
    "retrievedAt": "2026-10-18T00:00:00Z",
    "originalSha256": "bdb765d9d973c06c53ca8c75c23f5a0fd1c6ece77ce711bc3a2b5d8be8c9fda1",
    "permission": {
      "status": "verified",
      "evidence": "Retained Neon per-item declaration Public domain; identified 1902 publication, supporting the existing US pre-1931 reference-use assessment. Download hash verified; no fresh worldwide commercial-rights determination.",
      "purposes": [
        "analysis",
        "reconstruction"
      ]
    },
    "access": "documented-public",
    "confidence": 0.6,
    "transformations": [
      {
        "operation": "manual macro landmark annotation",
        "evidence": "Draft source-pixel axis, varied head envelopes and leaf targets annotated 2026-10-18; not full-image tracing or expert botanical segmentation."
      }
    ],
    "regionalAttribution": {
      "status": "unassigned"
    }
  },
  "spine": [
    [
      15,
      410
    ],
    [
      160,
      315
    ],
    [
      290,
      300
    ],
    [
      395,
      268
    ],
    [
      463,
      264
    ],
    [
      594,
      268
    ],
    [
      699,
      274
    ],
    [
      753,
      318
    ],
    [
      815,
      375
    ],
    [
      919,
      387
    ],
    [
      994,
      302
    ],
    [
      1094,
      266
    ],
    [
      1254,
      278
    ]
  ],
  "heads": [
    {
      "id": "central-fan",
      "centre": [
        511,
        384
      ],
      "widthPx": 250,
      "heightPx": 180,
      "role": "hanging",
      "branchVertex": 5,
      "angleDeg": 0
    },
    {
      "id": "blue-rosette",
      "centre": [
        848,
        285
      ],
      "widthPx": 181,
      "heightPx": 175,
      "role": "dominant",
      "branchVertex": 8,
      "angleDeg": 0
    },
    {
      "id": "lower-green-cup",
      "centre": [
        271,
        463
      ],
      "widthPx": 177,
      "heightPx": 174,
      "role": "cup",
      "branchVertex": 2,
      "angleDeg": 0
    },
    {
      "id": "upper-red-cup",
      "centre": [
        286,
        215
      ],
      "widthPx": 190,
      "heightPx": 170,
      "role": "cup",
      "branchVertex": 2,
      "angleDeg": 0
    },
    {
      "id": "upper-small-cup",
      "centre": [
        429,
        213
      ],
      "widthPx": 115,
      "heightPx": 146,
      "role": "cup",
      "branchVertex": 4,
      "angleDeg": 0
    },
    {
      "id": "left-blue",
      "centre": [
        64,
        180
      ],
      "widthPx": 120,
      "heightPx": 139,
      "role": "satellite",
      "branchVertex": 0,
      "angleDeg": 0
    },
    {
      "id": "upper-gold-cup",
      "centre": [
        665,
        212
      ],
      "widthPx": 112,
      "heightPx": 140,
      "role": "cup",
      "branchVertex": 5,
      "angleDeg": 0
    },
    {
      "id": "right-gold-fan",
      "centre": [
        1058,
        380
      ],
      "widthPx": 245,
      "heightPx": 190,
      "role": "hanging",
      "branchVertex": 10,
      "angleDeg": 0
    },
    {
      "id": "lower-red-cup",
      "centre": [
        760,
        506
      ],
      "widthPx": 185,
      "heightPx": 139,
      "role": "cup",
      "branchVertex": 7,
      "angleDeg": 0
    },
    {
      "id": "upper-blue-accent",
      "centre": [
        1080,
        183
      ],
      "widthPx": 125,
      "heightPx": 119,
      "role": "satellite",
      "branchVertex": 11,
      "angleDeg": 0
    },
    {
      "id": "lower-blue-accent",
      "centre": [
        1016,
        545
      ],
      "widthPx": 140,
      "heightPx": 124,
      "role": "satellite",
      "branchVertex": 9,
      "angleDeg": 0
    },
    {
      "id": "lower-left-accent",
      "centre": [
        462,
        555
      ],
      "widthPx": 115,
      "heightPx": 99,
      "role": "satellite",
      "branchVertex": 5,
      "angleDeg": 0
    },
    {
      "id": "right-blue-cup",
      "centre": [
        1200,
        190
      ],
      "widthPx": 126,
      "heightPx": 133,
      "role": "cup",
      "branchVertex": 12,
      "angleDeg": 0
    },
    {
      "id": "right-lower-cup",
      "centre": [
        1146,
        529
      ],
      "widthPx": 132,
      "heightPx": 135,
      "role": "cup",
      "branchVertex": 11,
      "angleDeg": 0
    },
    {
      "id": "lower-bud-cup",
      "centre": [
        580,
        539
      ],
      "widthPx": 122,
      "heightPx": 141,
      "role": "cup",
      "branchVertex": 5,
      "angleDeg": 0
    }
  ],
  "leaves": [
    {
      "vertex": 0,
      "target": [
        73,
        260
      ],
      "lengthPx": 75,
      "angleDeg": -50
    },
    {
      "vertex": 1,
      "target": [
        90,
        509
      ],
      "lengthPx": 85,
      "angleDeg": 30
    },
    {
      "vertex": 1,
      "target": [
        150,
        390
      ],
      "lengthPx": 85,
      "angleDeg": 80
    },
    {
      "vertex": 2,
      "target": [
        210,
        367
      ],
      "lengthPx": 80,
      "angleDeg": -30
    },
    {
      "vertex": 3,
      "target": [
        350,
        401
      ],
      "lengthPx": 90,
      "angleDeg": 25
    },
    {
      "vertex": 3,
      "target": [
        351,
        182
      ],
      "lengthPx": 70,
      "angleDeg": -20
    },
    {
      "vertex": 4,
      "target": [
        487,
        154
      ],
      "lengthPx": 65,
      "angleDeg": 30
    },
    {
      "vertex": 5,
      "target": [
        559,
        293
      ],
      "lengthPx": 70,
      "angleDeg": -40
    },
    {
      "vertex": 6,
      "target": [
        680,
        371
      ],
      "lengthPx": 95,
      "angleDeg": 20
    },
    {
      "vertex": 6,
      "target": [
        649,
        417
      ],
      "lengthPx": 70,
      "angleDeg": -20
    },
    {
      "vertex": 9,
      "target": [
        888,
        466
      ],
      "lengthPx": 80,
      "angleDeg": 30
    },
    {
      "vertex": 9,
      "target": [
        898,
        533
      ],
      "lengthPx": 95,
      "angleDeg": 60
    },
    {
      "vertex": 10,
      "target": [
        932,
        205
      ],
      "lengthPx": 70,
      "angleDeg": -40
    },
    {
      "vertex": 10,
      "target": [
        1013,
        207
      ],
      "lengthPx": 75,
      "angleDeg": 60
    },
    {
      "vertex": 11,
      "target": [
        1148,
        300
      ],
      "lengthPx": 75,
      "angleDeg": 20
    },
    {
      "vertex": 12,
      "target": [
        1235,
        365
      ],
      "lengthPx": 110,
      "angleDeg": 40
    },
    {
      "vertex": 12,
      "target": [
        1235,
        510
      ],
      "lengthPx": 80,
      "angleDeg": -20
    },
    {
      "vertex": 11,
      "target": [
        1050,
        480
      ],
      "lengthPx": 70,
      "angleDeg": 20
    },
    {
      "vertex": 6,
      "target": [
        625,
        572
      ],
      "lengthPx": 80,
      "angleDeg": 100
    },
    {
      "vertex": 5,
      "target": [
        568,
        204
      ],
      "lengthPx": 60,
      "angleDeg": 20
    }
  ]
};
export const ACTIVE_VINE_STUDY=PLATE31_VINE_STUDY;
