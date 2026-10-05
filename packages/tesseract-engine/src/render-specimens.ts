import{renderAscendSentence,type AscendSentence}from"./ascend-universal-language";
const samples:AscendSentence[]=[
{seed:"ascend-love-01",meaning:"love",operations:["approach","mirror","bind","continue"],topology:"bilateral",closure:"closed",rhythm:"steady"},
{seed:"ascend-growth-01",meaning:"growth",operations:["branch","expand","continue"],topology:"branching",closure:"open",rhythm:"rising"},
{seed:"ascend-return-01",meaning:"return",operations:["expand","converge","resume"],topology:"radial",closure:"returning",rhythm:"pulse"}];
for(const s of samples){const svg=renderAscendSentence(s,1200,600);const name=s.meaning.replace(/[^a-z0-9]+/gi,"-").toLowerCase();require("node:fs").writeFileSync(`dist/${name}.svg`,svg);console.log(`dist/${name}.svg`)}
