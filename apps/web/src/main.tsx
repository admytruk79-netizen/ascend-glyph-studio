import React,{Suspense,useState} from "react";
import {createRoot} from "react-dom/client";
import BotanicalStudio from "./BotanicalStudio";
import UkrainianStudio from "./UkrainianStudio";
import "./studio.css";
const ResearchStudio=React.lazy(()=>import("./GlyphStudio"));
function App(){const [mode,setMode]=useState<"botanical"|"bands"|"research">("botanical");return mode==="research"?<><button className="quietButton researchReturn" onClick={()=>setMode("botanical")}>Return to ornament composition</button><Suspense fallback={<p>Loading research Studio…</p>}><ResearchStudio/></Suspense></>:mode==="bands"?<><button className="quietButton" onClick={()=>setMode("botanical")}>Botanical compositions</button><UkrainianStudio onResearch={()=>setMode("research")}/></>:<BotanicalStudio onBands={()=>setMode("bands")} onResearch={()=>setMode("research")}/>;}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
