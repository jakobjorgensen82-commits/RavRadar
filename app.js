const map = L.map('map')
.setView([56.2,10.5],7);


L.tileLayer(
'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
{
attribution:'© OpenStreetMap'
}
).addTo(map);



fetch("kystsektorer.geojson")

.then(response => response.json())

.then(data => {


L.geoJSON(data, {

style:function(){

return {
color:"#006994",
weight:2,
fillColor:"#00aaff",
fillOpacity:0.4
};

},


onEachFeature:function(feature,layer){


layer.on("click",function(){


document.getElementById("info").innerHTML=`

<h2>${feature.properties.name}</h2>

<p>ID: ${feature.properties.id}</p>

<p>Kysttype:
${feature.properties.region}</p>

<p>🌊 Vandstand:
Afventer DMI</p>

<p>💨 Vindmodel:
${feature.properties.windModel}</p>

<p>⭐ Ravindeks:
Ikke beregnet endnu</p>

`;


});


}

}).addTo(map);


});