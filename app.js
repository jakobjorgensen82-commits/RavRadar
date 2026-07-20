const APP_VERSION = "RavRadar v1.3 - samlet model";


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


<div id="conditions">
Henter forhold...
</div>


`;



Promise.all([


getWaterLevel(
sector.lat,
sector.lon
),


getWindData(
sector.lat,
sector.lon
),


getCurrentData(
sector.lat,
sector.lon
),


getWaveData(
sector.lat,
sector.lon
)


])


.then(([water, wind, current, waves])=>{


currentForecast = water.forecast;

showWaterDay(0);



calculateRavScore({


windHistory:{
score:0
},


current:{
score:0
},


waterLevel:{
score:0
},


windForecast:{
score:0
},


visibility:{
score:0
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



document.getElementById("conditions").innerHTML = `

🌬️ Vind:
Klar

<br>

🧭 Strøm:
Klar

<br>

🌊 Vand:
Klar

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