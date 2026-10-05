export const garmentViews=["front","left","back","right"] as const;export type GarmentView=typeof garmentViews[number];
export const placements=["collar","placket","left-chest","right-chest","left-sleeve","right-sleeve","left-cuff","right-cuff","yoke","hem"] as const;export type Placement=typeof placements[number];
export {patternDefinitions as patternFamilies} from "./pattern-catalog";
export type ConfiguratorState={view:GarmentView;patternId:string;placement:Placement;fabric:string;thread:string;size:string;fit:string};
export const initialConfigurator:ConfiguratorState={view:"front",patternId:"flowering",placement:"left-sleeve",fabric:"ivory",thread:"charcoal",size:"M",fit:"regular"};
