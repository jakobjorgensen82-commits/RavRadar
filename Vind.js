async function getWindData(lat, lon) {


    try {


        /*
        Vindmodul klar til rigtig vejrdata.
        Senere kobles vindprognose på.
        */


        const forecast = [];


        const now = new Date();



        for (let i = 0; i < 120; i++) {


            let time = new Date(
                now.getTime() + i * 60 * 60 * 1000
            );


            forecast.push({

                time:
                time.toLocaleString("da-DK",
                {
                    weekday:"short",
                    day:"numeric",
                    month:"short",
                    hour:"2-digit"
                }),


                speed:
                "Afventer vinddata",


                direction:
                "Afventer retning"


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
