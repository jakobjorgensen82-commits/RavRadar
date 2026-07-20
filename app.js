const map = L.map('map')
.setView([56.2, 10.5], 7);


L.tileLayer(
'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
{
 attribution:'© OpenStreetMap'
}
).addTo(map);


const info = document.getElementById("info");


fetch("data/kystdata.json")

.then(response => response.json())

.then(data => {


data.sectors.forEach(sector => {


let marker = L.marker(
[
sector.lat,
sector.lon
]
)
.addTo(map);


marker.on("click", function(){


info.innerHTML = `

<h2>${sector.name}</h2>

<p>📍 Region:
${sector.region}
</p>

<p>🌊 Vandstand:
Afventer DMI
</p>

<p>💨 Vindmodel:
${sector.windModel}
</p>

<p>⭐ Ravindeks:
Ikke beregnet endnu
</p>

`;

});


});


})

.catch(error => {

console.log(error);

info.innerHTML = `
<h2>Fejl</h2>
<p>Kystdata kunne ikke indlæses.</p>
`;

});