const APP_VERSION = "RavRadar v1.5 - stabil dataindlæsning";


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
    <th>Vandstand</th>
    <th>Trend</th>
    </tr>

    `;


    currentForecast
    .slice(start,end)
    .forEach(item=>{


        let sign = item.levelCm > 0 ? "+" : "";


        html += `

        <tr>
        <td>${item.time}</td>
        <td>${sign}${item.levelCm} cm</td>
        <td>${item.trend}</td>
        </tr>

        `;

    });


    html += "</table>";


    document.getElementById("water").innerHTML = html;

}





fetch("data/kystdata.json")

.then(r=>r.json())

.then(kystdata=>{


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
⭐ Beregner...
</div>

<div id="water">
🌊 Henter vandstand...
</div>

<div id="conditions">
Henter forhold...
</div>

`;



/*
Vandstand
*/

getWaterLevel(
sector.lat,
sector.lon
)

.then(water=>{


currentForecast = water.forecast;

showWaterDay(0);


})

.catch(error=>{

document.getElementById("water").innerHTML =
"🌊 Vandstand kunne ikke hentes";

});





/*
Vind
*/

let windOK = false;


if(typeof getWindData === "function") {


getWindData(
sector.lat,
sector.lon
)

.then(()=>{

windOK = true;

});


}





/*
Strøm
*/

let currentOK = false;


if(typeof getCurrentData === "function") {


getCurrentData(
sector.lat,
sector.lon
)

.then(()=>{

currentOK = true;

});


}





/*
Bølger
*/

let waveOK = false;


if(typeof getWaveData === "function") {


getWaveData(
sector.lat,
sector.lon
)

.then(()=>{

waveOK = true;

});


}





setTimeout(()=>{


calculateRavScore({

windHistory:{
score:0
},

current:{
score:0
},

waterLevel:{
score:10
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
${windOK ? "klar" : "afventer"}

<br>

🧭 Strøm:
${currentOK ? "klar" : "afventer"}

<br>

🌊 Bølger:
${waveOK ? "klar" : "afventer"}

`;



},1000);



});


});


});


})
.catch(error=>{


console.log(error);


info.innerHTML =
"Fejl ved indlæsning af kystdata";


});