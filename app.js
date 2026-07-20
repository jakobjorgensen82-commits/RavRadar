const map = L.map('map')
.setView([56.2, 10.5], 7);


L.tileLayer(
'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
{
 attribution:'© OpenStreetMap'
}
).addTo(map);


// Teststruktur indtil rigtig kystdatabase er koblet på

const info = document.getElementById("info");


function showSector(name, region, station){

info.innerHTML = `

<h2>${name}</h2>

<p>📍 Region: ${region}</p>

<p>🌊 Vandstand:
Afventer DMI</p>

<p>🏖️ Station:
${station}</p>

<p>💨 Vind:
Afventer vejrdata</p>

<p>⭐ Ravindeks:
Ikke beregnet endnu</p>

`;

}


// Midlertidige testområder

const testAreas = [

{
name:"Øster Hurup",
lat:56.80,
lon:10.27,
region:"Nordjyllands østkyst",
station:"Hadsund"
},

{
name:"Voerså",
lat:57.19,
lon:10.33,
region:"Nordjyllands østkyst",
station:"Frederikshavn"
},

{
name:"Asaa",
lat:57.14,
lon:10.43,
region:"Nordjyllands østkyst",
station:"Frederikshavn"
}

];


testAreas.forEach(area=>{


let marker=L.marker(
[area.lat,area.lon]
)
.addTo(map);


marker.on(
"click",
()=>showSector(
area.name,
area.region,
area.station
)
);


});