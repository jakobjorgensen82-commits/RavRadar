async function getWaterLevel(lat, lon) {


    try {


        const now = new Date();


        const forecast = [];



        for (let i = 0; i < 120; i++) {


            let time = new Date(
                now.getTime() + i * 60 * 60 * 1000
            );


            /*
            Midlertidig testværdi.
            Erstattes senere med DMI vandstand i cm.
            */


            let level = Math.round(
                Math.sin(i / 8) * 25
            );



            forecast.push({


                time:
                time.toLocaleString("da-DK",
                {

                    weekday:"short",

                    day:"numeric",

                    month:"short",

                    hour:"2-digit",

                    minute:"2-digit"

                }),



                levelCm: level,


                trend:
                i < 1
                ?
                "nu"
                :
                level > 0
                ?
                "stigende"
                :
                "faldende"



            });


        }



        return {


            status:"ok",


            location:{

                lat:lat,

                lon:lon

            },


            forecast:forecast



        };



    }


    catch(error) {


        return {


            status:"error",


            message:error.message


        };


    }


}





function calculateWaterLevelScore(water) {


    if (!water || !water.forecast) {


        return 0;


    }



    let current =
    water.forecast[0].levelCm;



    let score = 10;



    /*
    Senere justeres denne model
    efter erfaring med ravfund.

    */



    if (current > 20) {

        score += 5;

    }


    if (current < -20) {

        score -= 5;

    }



    return Math.max(
        0,
        Math.min(
            20,
            score
        )
    );


}