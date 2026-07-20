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

<div id="water">
🌊 Henter vandstand...
</div>

<p>
💨 Vindgrænse:
${config.maxWindMps} m/s
</p>

<p>
🌙 Nat-ravtilstand:
Tilgængelig
</p>

<p>
⭐ Ravindeks:
Ikke beregnet endnu
</p>

`;



getWaterLevel(
sector.lat,
sector.lon
)

.then(data=>{


let html = `

<h3>🌊 Vandstand time for time</h3>

<table>

<tr>
<th>Tid</th>
<th>Niveau</th>
</tr>

`;


data.forecast.forEach(item=>{


html += `

<tr>

<td>${item.time}</td>

<td>${item.level}</td>

</tr>

`;

});


html += "</table>";


document.getElementById("water").innerHTML = html;


});


});


});


})


.catch(error=>{

console.log(error);

info.innerHTML =
"<h2>Fejl ved indlæsning af data</h2>";

});