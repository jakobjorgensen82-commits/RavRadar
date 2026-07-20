const map = L.map('map')
.setView([56.2, 10.5], 7);


L.tileLayer(
'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
{
 attribution:'© OpenStreetMap'
}
).addTo(map);


const info = document.getElementById("info");


// Hent kystdata

fetch("data/kystdata.json")

.then(response => response.json())

.then(data => {


if(data.sectors.length === 0){

info.innerHTML = `

<h2>RavRadar</h2>

<p>
Kystdatabase klar.
</p>

<p>
Afventer indlæsning af danske kystsektorer.
</p>

`;

return;

}


// Når vi senere har alle sektorer

data.sectors.forEach(sector=>{


let marker = L.marker(
[
sector.lat,
sector.lon
]
)
.addTo(map);


marker.on(
"click",
()=>{


info.innerHTML=`

<h2>${sector.name}</h2>

<p>
📍 Region:
${sector.region}
</p>

<p>
🌊 Vandstand:
Afventer DMI
</p>

<p>
💨 Vind:
Afventer data
</p>

<p>
⭐ Ravindeks:
Beregnes senere
</p>

`;

});


});


})

.catch(error=>{

console.log(error);

info.innerHTML=`

<h2>Fejl</h2>

<p>
Kunne ikke hente kystdata.
</p>

`;

});