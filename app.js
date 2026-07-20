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

<p>
📍 Region:
${sector.region}
</p>

<p id="water">
🌊 Vandstand:
<br>
Henter data...
</p>

<p>
💨 Vindgrænse:
<br>
${config.maxWindMps} m/s
</p>

<p>
🌙 Nat-ravtilstand:
<br>
Tilgængelig
</p>

<p>
⭐ Ravindeks:
<br>
Ikke beregnet endnu
</p>

`;



getWaterLevel(
sector.lat,
sector.lon
)

.then(data=>{


document.getElementById("water").innerHTML = `

🌊 Vandstand:
<br>
Forbindelse klar

<br><br>

Position:
<br>
${data.location.lat},
${data.location.lon}

`;

});


});


});


})


.catch(error=>{

console.log(error);

info.innerHTML =
"<h2>Fejl ved indlæsning af data</h2>";

});