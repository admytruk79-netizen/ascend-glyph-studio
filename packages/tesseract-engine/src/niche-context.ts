import type {GarmentConfiguration,GarmentZoneKind} from "./garment";
import type {DesignNicheId} from "./niches";

const ZONE_NICHE:Partial<Record<GarmentZoneKind,DesignNicheId>>={
 collar:"collar",placket:"placket",chest:"chest",shoulder:"shoulder",sleeve:"sleeve",
 cuff:"cuff-wrap",yoke:"yoke",hem:"hem-band",back:"back-field"
};

export function nichesForGarment(g?:GarmentConfiguration):DesignNicheId[]{
 if(!g)return [];
 const out:DesignNicheId[]=[];
 for(const z of g.zones)if(z.editable){
  const n=ZONE_NICHE[z.kind];if(n&&!out.includes(n))out.push(n);
 }
 return out;
}

export function primaryNicheForZone(kind:GarmentZoneKind):DesignNicheId|undefined{
 return ZONE_NICHE[kind];
}
