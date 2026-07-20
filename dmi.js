async function getWaterLevel(lat, lon) {

    try {

        const now = new Date();

        const forecast = [];


        // 5 døgn = 120 timer

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
                    hour:"2-digit",
                    minute:"2-digit"
                }),


                level:
                "Afventer DMI"


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