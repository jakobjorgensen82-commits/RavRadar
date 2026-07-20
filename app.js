const APP_VERSION = "RavRadar v1.2 - Ravscore";


const map = L.map('map')
.setView([56.2, 10.5], 7);


L.tileLayer(
'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
{
 attribution:'© OpenStreetMap'
}
).addTo(map);



const info = document.getElementById("info");


let currentForecast = [];



function showWaterDay(day) {


    let start = day * 24;
    let end = start + 24;


    let html = `

    <h3>🌊 Vandstand</h3>

    <button onclick="showWaterDay(0)">Dag 1</button>
    <button onclick="showWaterDay(1)">Dag 2</button>
    <button onclick="showWaterDay(2)">Dag 3</button>
    <button onclick="showWaterDay(3)">Dag 4</button>
    <button onclick="showWaterDay(4)">Dag 5</button>


    <table>

    <tr>
    <th>Tid</th>
    <th>Niveau</th>
    </tr>

    `;


    currentForecast
    .slice(start,end)
    .forEach(item=>{


        html += `

        <tr>
        <td>${item.time}</td>
        <td>${item.level}</td>
        </tr>

        `;

    });


    html += "</table>";


    document.getElementById("water").innerHTML = html;

}





Promise.all([

fetch("data/kystdata.json")
.then(r=>r.json()),


fetch("data/config.json")
.then(r=>r.json())


])


.then(([kystdata, config])=>{


kystdata.sectors.forEach(sector=>{


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


<div id="score">

⭐ Beregner ravindeks...

</div>


<div id="water">

🌊 Henter vandstand...

</div>


<p>
💨 Vindgrænse:
${config.maxWindMps} m/s
</p>


`;



getWaterLevel(
sector.lat,
sector.lon
)

.then(data=>{


currentForecast = data.forecast;


showWaterDay(0);


});



/*
Midlertidige testværdier.
De erstattes senere med rigtige data.
*/


calculateRavScore({

windHistory:{
score:25
},


current:{
score:25
},


waterLevel:{
score:15
},


windForecast:{
score:8
},


visibility:{
score:8
}


})


.then(result=>{


document.getElementById("score").innerHTML = `

⭐ Ravindeks:
<br>
<b>${result.score}/100</b>

<br>

${result.rating}

`;



});



});


});


})


.catch(error=>{


console.log(error);


info.innerHTML =
"<h2>Fejl ved indlæsning</h2>";


});