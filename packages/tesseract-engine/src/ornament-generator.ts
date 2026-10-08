import {composeOrnament,type OrnamentPlan} from "./ornament-composer";
import {renderMotifGrammar} from "./motif-renderer";
import {validateMotifGrammar,type MotifGrammar} from "./motif-grammar";

export type OrnamentGeneration={svg:string;grammar:MotifGrammar;violations:string[];approved:boolean};

/** A single callable path from motif vocabulary to a rendered ornamental composition. */
export function generateMotifOrnament(source:MotifGrammar,plan:OrnamentPlan,width=960,height=260):OrnamentGeneration{
 const result=composeOrnament(source,plan);
 const violations=[...result.violations,...validateMotifGrammar(result.grammar)];
 if(result.placed===0)violations.push("no-placed-motifs");
 const approved=violations.length===0;
 return {svg:approved?renderMotifGrammar(result.grammar,width,height):"",grammar:result.grammar,violations,approved};
}
