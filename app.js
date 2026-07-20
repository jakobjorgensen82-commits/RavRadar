const map = L.map('map')
.setView([56.2, 10.5], 7);


L.tileLayer(
'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
{
 attribution:'© OpenStreetMap'
}
).addTo(map);


const info = document.getElementById("info");


Promise.all([

fetch("data/kystdata.json")
.then(r => r.json()),

fetch("data/config.json")
.then(r => r.json())

])


.then(([kystdata, config]) => {


kystdata.sectors.forEach(sector => {


let marker = L.marker(
[
sector.lat,
sector.lon
]
)
.addTo(map);



marker.on("click",()=>{


info.innerHTML = `

<h2>${sector.name}</h2>

<p>📍 ${sector.region}</p>

<hr>

<p>🌊 Vandstand:
<br>
Time for time: klar til DMI
</p>

<p>💨 Vind:
<br>
Maks ønsket:
${config.maxWindMps} m/s
</p>

<p>🌙 Nat-ravtilstand:
<br>
Tilgængelig
</p>

<p>⭐ Ravindeks:
<br>
Beregnes senere
</p>

`;

});


});


})

.catch(error=>{

console.log(error);

info.innerHTML =
"Fejl ved indlæsning";

});