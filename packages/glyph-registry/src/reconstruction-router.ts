export type ReconstructionMethod="silhouette"|"centerline"|"compound-path"|"primitives"|"hybrid";
export type ReconstructionPlan={id:string;method:ReconstructionMethod;reason:string;manualReview:true};

const P=(ids:string[],method:ReconstructionMethod,reason:string):ReconstructionPlan[]=>ids.map(id=>({id,method,reason,manualReview:true}));

export const reconstructionPlan:ReconstructionPlan[]=[
 ...P(["earth-01","earth-02","earth-03","earth-04","earth-05","earth-06","earth-07","earth-08","earth-09"],"primitives","regular anchored geometry; preserve exact angles, gaps and symmetry/asymmetry from source"),
 ...P(["water-01","water-02","water-04","water-05"],"centerline","predominantly flowing/open stroke language; reconstruct stroke skeleton then fit width to source silhouette"),
 ...P(["water-03"],"hybrid","mixed flow/closed topology requires stroke plus compound regions"),
 ...P(["fire-01","fire-02","fire-04","fire-06"],"primitives","rays/chevrons/linear structures are best represented as controlled geometric paths"),
 ...P(["fire-03","fire-05"],"hybrid","central/ascending forms combine closed and stroke-like geometry"),
 ...P(["air-01","air-02","air-04"],"centerline","open directional line structures; outline tracing creates false filled topology"),
 ...P(["air-03","air-05","air-06"],"hybrid","mixed open grid/directional geometry"),
 ...P(["spirit-01","spirit-03","spirit-04","spirit-06"],"compound-path","orbital/closed forms require preserved holes and nested boundaries"),
 ...P(["spirit-02","spirit-05"],"hybrid","orbital geometry plus intersecting axes/marks")
];

export function planFor(id:string){return reconstructionPlan.find(x=>x.id===id)}
