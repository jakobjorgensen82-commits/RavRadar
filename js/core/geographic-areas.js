const fold=value=>String(value??'').toLocaleLowerCase('da-DK').normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
const rule=(label,terms)=>({label,terms:terms.map(fold)});

export const GEOGRAPHIC_AREAS=Object.freeze({
  'Vadehavet':rule('Vadehavet',['Skallingen','Blåvandshuk','Ho Bugt','Esbjerg nordkyst','Fanø','Mandø','Rømø','Sydvestjylland','Vidåslusen','Vadehavets fastlandskyst']),
  'Vesterhavet':rule('Vesterhavet',['Thy','Hanstholm','Jammerbugt','Vendsyssel vest','Vendsyssel nordvest','Tannis Bugt','Skagen Odde vest','Skagen vest','Lemvig vestkyst','Bovbjerg','Holstebro vestkyst','Ulfborg vestkyst','Holmsland Klit','Ringkøbing Fjord sydvest','Varde vestkyst','Skallingen','Blåvandshuk','Ho Bugt','Esbjerg nordkyst','Fanø','Mandø','Rømø','Sydvestjylland','Vidåslusen','Vadehavets fastlandskyst']),
  'Nordjyske vestkyst':rule('Nordjyske vestkyst',['Thy','Hanstholm','Jammerbugt','Vendsyssel vest','Vendsyssel nordvest','Tannis Bugt','Skagen Odde vest','Skagen vest']),
  'Nordjyske østkyst':rule('Nordjyske østkyst',['Skagen Odde nordøst','Ålbæk Bugt','Frederikshavn kyst','Sæby Bugt','Asaa kyst','Hou Bugt','Kattegat ved Hals','Lille Vildmose kyst','Kattegat ved Øster Hurup','Mariager Fjord munding','Randers Fjord munding','Læsø']),
  'Kattegat':rule('Kattegat',['Skagen Odde nordøst','Ålbæk Bugt','Frederikshavn kyst','Sæby Bugt','Asaa kyst','Hou Bugt','Kattegat ved Hals','Lille Vildmose kyst','Kattegat ved Øster Hurup','Mariager Fjord munding','Randers Fjord munding','Læsø','Norddjursland','Djursland','Grenaa','Ebeltoft','Mols','Helgenæs','Kalø Vig','Aarhus Bugt','Odderkysten','Juelsminde Bugt','Horsens Fjord','Endelave','Samsø']),
  'Limfjorden':rule('Limfjorden',['Limfjord','Nissum Bredning','Thisted Bredning','Fur','Mors','Sallingsund','Salling','Løgstør Bredning','Livø Bredning','Nibe Bredning','Aalborg vest','Aalborg øst','Thyholm','Venø Bugt','Lem Vig']),
  'Djursland':rule('Djursland',['Norddjursland','Djursland','Grenaa','Ebeltoft','Mols','Helgenæs','Kalø Vig']),
  'Sydøstjylland og Lillebælt':rule('Sydøstjylland og Lillebælt',['Juelsminde Bugt','Horsens Fjord','Endelave','Fredericia','Sydøstjylland','Lillebælt','Kolding Fjord','Haderslev','Aabenraa','Sønderborg','Als']),
  'Fyn og øerne':rule('Fyn og øerne',['Nordfyn','Nordvestfyn','Vestfyn','Østfyn','Sydøstfyn','Sydvestfyn','Sydfyn','Svendborg','Tåsinge','Ærø','Langeland','Middelfart']),
  'Sydfynske Øhav':rule('Sydfynske Øhav',['Sydfyn','Svendborg','Tåsinge','Ærø','Langeland','Sydøstfyn','Sydvestfyn']),
  'Storebælt':rule('Storebælt',['Storebælt','Samsø','Sejerø Bugt','Vestsjælland','Odsherred','Langeland','Østfyn']),
  'Vest- og Nordsjælland':rule('Vest- og Nordsjælland',['Vestsjælland','Odsherred','Sejerø Bugt','Nordsjælland']),
  'Øresund og Køge Bugt':rule('Øresund og Køge Bugt',['Øresund','Amager','Køge Bugt','Stevns','Nordsjælland']),
  'Sydsjælland, Møn, Lolland og Falster':rule('Sydsjælland, Møn, Lolland og Falster',['Sydsjælland','Møn','Lolland','Falster','Smålandsfarvandet']),
  'Bornholm':rule('Bornholm',['Bornholm'])
});

export function zoneSearchText(zone){const p=zone?.properties||{};return fold(`${p.id||''} ${p.name||''} ${p.region||''} ${p.area||''} ${p.coastType||''}`);}
export function zoneMatchesArea(zone,area){const spec=GEOGRAPHIC_AREAS[area];if(!spec)return false;const hay=zoneSearchText(zone);return spec.terms.some(term=>hay.includes(term));}
export function matchingZoneIds(zones,area){return zones.filter(zone=>zoneMatchesArea(zone,area)).map(zone=>zone.properties?.id).filter(Boolean);}
export function auditGeographicAreas(zones){const areas={};for(const area of Object.keys(GEOGRAPHIC_AREAS)){const ids=matchingZoneIds(zones,area);areas[area]={count:ids.length,zoneIds:ids};}const uncovered=zones.filter(zone=>!Object.keys(GEOGRAPHIC_AREAS).some(area=>zoneMatchesArea(zone,area))).map(zone=>({id:zone.properties?.id,name:zone.properties?.name,region:zone.properties?.region}));return {ok:uncovered.length===0&&Object.values(areas).every(x=>x.count>0),areas,uncovered};}
