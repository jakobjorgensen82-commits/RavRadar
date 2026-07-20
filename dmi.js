async function getWaterLevel(lat, lon) {

    try {

        // Struktur til fremtidig DMI-forbindelse

        const now = new Date();


        const forecast = [];


        for (let i = 0; i < 24; i++) {

            let time = new Date(
                now.getTime() + i * 60 * 60 * 1000
            );


            forecast.push({

                time:
                time.toLocaleString("da-DK",
                {
                    weekday:"short",
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