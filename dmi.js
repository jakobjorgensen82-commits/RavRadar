async function getWaterLevel(lat, lon) {

    try {

        /*
        Midlertidig struktur.
        Her kobler vi DMI API på næste trin.
        */

        return {

            status: "ok",

            location: {
                lat: lat,
                lon: lon
            },

            forecast: [
                {
                    time: "Nu",
                    level: "Afventer DMI"
                },
                {
                    time: "+6 timer",
                    level: "Afventer DMI"
                },
                {
                    time: "+12 timer",
                    level: "Afventer DMI"
                },
                {
                    time: "+24 timer",
                    level: "Afventer DMI"
                }
            ]

        };


    } catch(error) {


        return {

            status: "error",

            message: error.message

        };


    }

}