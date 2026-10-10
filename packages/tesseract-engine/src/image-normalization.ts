export type Point={x:number;y:number};
export type Matrix3=readonly [number,number,number,number,number,number,number,number,number];
export type NormalizationEvidence={sourceWidth:number;sourceHeight:number;orientationDeg:0|90|180|270;roi?:readonly [Point,Point,Point,Point];homography?:Matrix3;registrationResidualPx?:number;inlierRatio?:number;supportPoints?:number};
export type NormalizationDecision={applyPerspective:boolean;confidence:number;reasons:string[];forward:Matrix3;inverse:Matrix3};
export const I:Matrix3=[1,0,0,0,1,0,0,0,1];
export function invert3(m:Matrix3):Matrix3{const [a,b,c,d,e,f,g,h,i]=m,A=e*i-f*h,B=c*h-b*i,C=b*f-c*e,D=f*g-d*i,E=a*i-c*g,F=c*d-a*f,G=d*h-e*g,H=b*g-a*h,J=a*e-b*d,det=a*A+b*D+c*G;if(Math.abs(det)<1e-10)throw new Error("Singular normalization transform");return [A/det,B/det,C/det,D/det,E/det,F/det,G/det,H/det,J/det]}
export function decideNormalization(e:NormalizationEvidence):NormalizationDecision{
 if(e.sourceWidth<=0||e.sourceHeight<=0)throw new Error("Invalid source dimensions");
 const reasons:string[]=[];let confidence=1,applyPerspective=false;const h=e.homography??I;
 if(e.homography){const enough=(e.supportPoints??0)>=8,goodInliers=(e.inlierRatio??0)>=.65,goodResidual=(e.registrationResidualPx??Infinity)<=3;applyPerspective=enough&&goodInliers&&goodResidual;if(!enough)reasons.push("insufficient-correspondences");if(!goodInliers)reasons.push("low-inlier-ratio");if(!goodResidual)reasons.push("high-registration-residual");confidence=Math.min(1,(e.inlierRatio??0)*Math.min(1,8/(e.registrationResidualPx??Infinity)));}
 return {applyPerspective,confidence,reasons,forward:applyPerspective?h:I,inverse:applyPerspective?invert3(h):I};
}
export function projectPoint(m:Matrix3,p:Point):Point{const z=m[6]*p.x+m[7]*p.y+m[8];if(Math.abs(z)<1e-10)throw new Error("Point projects to infinity");return {x:(m[0]*p.x+m[1]*p.y+m[2])/z,y:(m[3]*p.x+m[4]*p.y+m[5])/z}}
export function roundTripError(d:NormalizationDecision,p:Point){const q=projectPoint(d.forward,p),r=projectPoint(d.inverse,q);return Math.hypot(r.x-p.x,r.y-p.y)}
