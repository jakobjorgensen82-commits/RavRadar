const num=(text,re)=>{const m=text.match(re);return m?Number(String(m[1]).replace(',','.')):null};
const has=(text,re)=>re.test(text);
const dirMap={nord:'N',nordøst:'NE',øst:'E',sydøst:'SE',syd:'S',sydvest:'SW',vest:'W',nordvest:'NW'};
export function interpretFreeTextRule(input=''){
 const raw=String(input).trim(); const t=raw.toLowerCase(); const warnings=[]; const conditions={};
 if(!raw) return {ok:false,warnings:['Skriv først ekspertens regel i almindeligt dansk.']};
 const minWind=num(t,/(?:mindst|over|mere end)\s*(\d+(?:[.,]\d+)?)\s*m\/?s/); const maxWind=num(t,/(?:højst|under|mindre end)\s*(\d+(?:[.,]\d+)?)\s*m\/?s/);
 const minWave=num(t,/(?:bølger?|bølgehøjde)[^\d]{0,20}(?:mindst|over|mere end)\s*(\d+(?:[.,]\d+)?)\s*m/); const maxWave=num(t,/(?:bølger?|bølgehøjde)[^\d]{0,20}(?:højst|under|mindre end)\s*(\d+(?:[.,]\d+)?)\s*m/);
 const hours=num(t,/(?:inden for|højst|maks(?:imalt)?)\s*(\d+(?:[.,]\d+)?)\s*timer/);
 if(minWind!=null)conditions.minWindSpeedMps=minWind;if(maxWind!=null)conditions.maxWindSpeedMps=maxWind;if(minWave!=null)conditions.minWaveHeightM=minWave;if(maxWave!=null)conditions.maxWaveHeightM=maxWave;if(hours!=null)conditions.maxHoursSinceHighEnergy=hours;
 if(has(t,/waders|vaders/))conditions.huntModes=['waders']; else if(has(t,/strandjagt|på stranden/))conditions.huntModes=['beach'];
 for(const [word,label] of Object.entries(dirMap))if(has(t,new RegExp(`\\b${word}(?:lig)?\\b`))){conditions.windDirectionText=label;break}
 let kind='bonus',scoreAdjustment=5,block=false;
 if(has(t,/farlig|umulig|må ikke|bloker/)){kind='gate';scoreAdjustment=0;block=true}else if(has(t,/dårlig|reducer|fradrag|sænker|negativ/)){kind='penalty';scoreAdjustment=-5}else if(has(t,/efter|timer siden|dagen efter|fasthold/)){kind='persistence';scoreAdjustment=5}
 const explicit=num(t,/(?:plus|bonus|øger(?: scoren)? med)\s*(\d+)\s*(?:point|%)/); const negative=num(t,/(?:minus|fradrag|sænker(?: scoren)? med)\s*(\d+)\s*(?:point|%)/);
 if(explicit!=null)scoreAdjustment=explicit;if(negative!=null)scoreAdjustment=-negative;
 if(!Object.keys(conditions).length)warnings.push('Ingen præcis målbar betingelse blev fundet. Tilføj tal, varighed, jagtform eller retning manuelt.');
 warnings.push('Forslaget er kun en kladde. En fagperson skal kontrollere betingelser, geografi og scorevirkning før aktivering.');
 return {ok:true,draft:{name:raw.slice(0,90),status:'draft',kind,knowledgeClass:'expert',confidence:'mellem',priority:500,geography:{scope:'national'},source:{type:'expert',title:'Ekspertinput i fri tekst'},conditions,effect:{scoreAdjustment,explanation:raw,...(block?{block:true}:{})},notes:'Automatisk fortolket fra fri tekst. Skal gennemgås og testes.'},warnings};
}
