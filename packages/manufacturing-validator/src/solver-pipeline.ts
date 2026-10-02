import {solve,type SolveInput,type SolvedState} from "../../tesseract-engine/src/solver";
import {validate,type Candidate,type Envelope,type Validation} from "./index";

export type ProductionCandidate={state:SolvedState;manufacturing:Validation;candidate:Candidate};
export function solveManufacturable(input:SolveInput,envelope:Envelope,measure:(s:SolvedState)=>Candidate):ProductionCandidate[]{
 return solve(input).map(state=>{const candidate=measure(state);const manufacturing=validate(candidate,envelope);return {state:{...state,productionStatus:manufacturing.valid?"manufacturable-estimate":"digitally-valid"},manufacturing,candidate};})
 .sort((a,b)=>Number(b.manufacturing.valid)-Number(a.manufacturing.valid)||b.state.score-a.state.score);
}
