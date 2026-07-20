let windData = null;


async function getWindData(lat, lon) {


    try {


        const now = new Date();


        const forecast = [];


        for (let i = 0; i < 120; i++) {


            let time = new Date(
                now.getTime() + i * 60 * 60 * 1000
            );


            forecast.push({

                time: time.toISOString(),

                speed: null,

                direction: null

            });


        }



        return {


            status:"ok",


            location:{
                lat:lat,
                lon:lon
            },


            forecast:forecast,


            history:[]


        };



    }


    catch(error) {


        return {

            status:"error",

            message:error.message

        };


    }


}





function calculateWindScore(wind) {


    let score = 0;



    /*
    Denne logik erstattes senere
    med rigtig vindhistorik.
    */


    if (!wind) {

        return 0;

    }



    return score;


}