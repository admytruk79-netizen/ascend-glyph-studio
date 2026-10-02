export const heroShirt = {
 id:"ascend-linen-shirt-01", revision:1, material:{fiber:"100% flax linen",targetGsm:180,status:"development"},
 collar:"band", zones:[
  {id:"collar",kind:"border",status:"development"},
  {id:"left-cuff",kind:"border",status:"development"},
  {id:"right-cuff",kind:"border",status:"development"},
  {id:"placket",kind:"path",status:"development"},
  {id:"chest",kind:"emblem",status:"development"},
  {id:"upper-sleeve",kind:"composition",status:"development"},
  {id:"back-yoke",kind:"composition",status:"development"}
 ] as const
} as const;
