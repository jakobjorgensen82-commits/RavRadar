const map = L.map('map').setView([56.2,10.5],7);


L.tileLayer(
'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
{
 attribution:'© OpenStreetMap'
}
).addTo(map);


const steder = [
{
navn:"Øster Hurup",
lat:56.804,
lon:10.270
},
{
navn:"Voerså",
lat:57.190,
lon:10.330
},
{
navn:"Asaa",
lat:57.140,
lon:10.430
}
];


steder.forEach(sted => {

let marker = L.marker(
[sted.lat,sted.lon]
).addTo(map);


marker.on(
"click",
function(){

document.getElementById("info").innerHTML =

`
<h2>${sted.navn}</h2>

<p>🌊 Vandstand: kommer senere</p>
<p>💨 Vind: kommer senere</p>
<p>⭐ Ravindeks: kommer senere</p>

`;

});

});