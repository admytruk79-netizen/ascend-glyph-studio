import React,{Suspense,useState} from "react";
import {createRoot} from "react-dom/client";
import OrnamentStudio from "./OrnamentStudio";
import "./studio.css";
const ResearchStudio=React.lazy(()=>import("./GlyphStudio"));
function App(){const [research,setResearch]=useState(false);return research?<><button className="quietButton researchReturn" onClick={()=>setResearch(false)}>Return to ornament composition</button><Suspense fallback={<p>Loading research Studio…</p>}><ResearchStudio/></Suspense></>:<OrnamentStudio onResearch={()=>setResearch(true)}/>;}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
